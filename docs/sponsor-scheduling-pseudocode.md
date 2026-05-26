# Firefly 赞助补给位调度伪代码

版本：v1.0  
更新时间：2026-05-27

## 1. 目标

本文件定义 Firefly 赞助补给位的服务端调度逻辑，重点解决：

1. 如何定义一次有效地图会话
2. 如何判断当前场景是 `risk`、`care` 还是 `mixed`
3. 如何从有效 campaign 中选出主赞助位和扩展赞助位
4. 如何做品牌去重、频控和曝光留痕

## 2. 关键输入

调度函数输入建议包含：

- `fingerprint`
- `session_id`
- `lat`
- `lng`
- `radius`
- `city_code`
- `scene_hint`
- `visible_marker_summary`
- `now`

其中：

- `scene_hint` 来自前端估算，可选
- `visible_marker_summary` 由后端或前端提供当前视野中风险/救助点的数量摘要

## 3. 有效地图会话定义

建议将 `effective map session` 定义为：

1. 用户进入地图页
2. 地图完成初次加载
3. 定位成功，或落入默认城市片区
4. 满足以下任一条件：
   - 停留超过 5 秒
   - 发生拖拽、缩放、点位点击

会话失效条件建议为：

- 连续 30 分钟无活动
- 用户显著切换到超过 5km 的新片区，可视为新子会话

## 4. 场景判断

### 规则目标

赞助位的投放不是单纯按套餐抽签，还要看当前用户更像是在看风险还是在找救助。

### 伪代码

```text
function determineScene(scene_hint, visible_marker_summary):
    if scene_hint in ['risk', 'care', 'mixed']:
        return scene_hint

    risk_count = visible_marker_summary.risk_count
    care_count = visible_marker_summary.care_count

    if risk_count == 0 and care_count == 0:
        return 'mixed'

    if risk_count >= care_count * 1.5:
        return 'risk'

    if care_count >= risk_count * 1.5:
        return 'care'

    return 'mixed'
```

## 5. 候选 campaign 过滤

### 过滤原则

只有同时满足以下条件的 campaign 才能进入候选池：

1. sponsor 状态为 `active`
2. campaign 状态为 `active`
3. 当前时间在 `start_at` 到 `end_at` 之间
4. `city_code` 匹配
5. 用户位置落在 campaign 的 `5km` 片区半径内
6. `target_scene` 与当前场景兼容

### 场景兼容规则

- `risk` 场景接受：`risk`、`both`
- `care` 场景接受：`care`、`both`
- `mixed` 场景接受：`risk`、`care`、`both`

### 伪代码

```text
function loadCandidates(input, scene):
    campaigns = query active campaigns by city_code and current time

    result = []

    for campaign in campaigns:
        sponsor = load sponsor for campaign.sponsor_id

        if sponsor.status != 'active':
            continue

        if distance(input.lat, input.lng, campaign.area_center_lat, campaign.area_center_lng) > campaign.area_radius_meters:
            continue

        if not sceneMatches(scene, campaign.target_scene):
            continue

        result.push({
            sponsor: sponsor,
            campaign: campaign
        })

    return result
```

## 6. 主赞助位选择

## 6.1 先处理 100% 独占

如果当前片区当前场景存在 `exclusive_100` 的有效 campaign，建议优先处理。

规则：

1. 过滤掉已触达当日频控上限的 sponsor
2. 若仍只剩 1 个，直接选中
3. 若存在多个冲突独占单，则按合同优先级、距离、剩余履约缺口排序

### 伪代码

```text
function pickExclusivePrimary(candidates, input, scene):
    exclusives = filter candidates where campaign.package_tier == 'exclusive_100'
    exclusives = filterByPrimaryCap(exclusives, input.fingerprint, input.now)

    if exclusives.length == 0:
        return null

    sort exclusives by:
        1. closest distance to user
        2. highest contract delivery gap
        3. latest start_at first

    return exclusives[0]
```

## 6.2 常规权重抽样

若没有独占主位，则进入常规加权抽样。

基础权重：

- `guard_30` => `3`
- `resident_70` => `7`
- `exclusive_100` => `10`

可再叠加：

- 场景完全匹配加权
- 距离较近加权
- 正在营业加权
- 被用户多次 dismiss 降权

### 伪代码

```text
function computePrimaryWeight(candidate, input, scene):
    weight = candidate.campaign.priority_weight

    if candidate.campaign.target_scene == scene:
        weight = weight + 2

    dist = distance(input.lat, input.lng, candidate.sponsor.latitude, candidate.sponsor.longitude)
    if dist <= 1000:
        weight = weight + 2
    else if dist <= 3000:
        weight = weight + 1

    if sponsorIsOpenNow(candidate.sponsor, input.now):
        weight = weight + 1

    dismissCount = getDismissCountToday(candidate.sponsor.id, input.fingerprint, input.now)
    weight = max(1, weight - dismissCount)

    return weight
```

```text
function pickPrimary(candidates, input, scene):
    exclusiveChoice = pickExclusivePrimary(candidates, input, scene)
    if exclusiveChoice is not null:
        return exclusiveChoice

    eligible = filterByPrimaryCap(candidates, input.fingerprint, input.now)
    eligible = dedupeByBrandKeepHighestWeight(eligible, input, scene)

    weightedPool = []
    for candidate in eligible:
        candidateWeight = computePrimaryWeight(candidate, input, scene)
        weightedPool.push({ candidate, weight: candidateWeight })

    return weightedRandom(weightedPool)
```

## 7. 扩展赞助位选择

目标：

1. 在主赞助位之外补充 1 到 4 个赞助位
2. 不与主赞助位重复品牌
3. 优先距离近、场景匹配高、频控压力低的点位

### 伪代码

```text
function pickSecondary(candidates, primary, input, scene, limit):
    brandBlockList = set(primary.sponsor.brand_key)

    secondaryPool = []

    for candidate in candidates:
        if candidate.sponsor.id == primary.sponsor.id:
            continue

        if candidate.sponsor.brand_key in brandBlockList:
            continue

        if hitSecondaryCap(candidate.sponsor.id, input.fingerprint, input.now):
            continue

        score = 0

        if candidate.campaign.target_scene == scene:
            score = score + 3
        else if candidate.campaign.target_scene == 'both':
            score = score + 2

        dist = distance(input.lat, input.lng, candidate.sponsor.latitude, candidate.sponsor.longitude)
        if dist <= 1000:
            score = score + 3
        else if dist <= 3000:
            score = score + 2
        else:
            score = score + 1

        if sponsorIsOpenNow(candidate.sponsor, input.now):
            score = score + 1

        secondaryPool.push({ candidate, score })

    sort secondaryPool by score desc

    result = []
    for item in secondaryPool:
        if result.length >= limit:
            break
        result.push(item.candidate)
        brandBlockList.add(item.candidate.sponsor.brand_key)

    return result
```

## 8. 至少返回 1 条的规则

如果当前区域存在任何有效 sponsor candidate：

1. 应尽量返回 1 条主赞助位
2. 除非所有 candidate 都被频控拦截

如果主位因频控被全部挡住，可以降级策略：

1. 忽略次级频控，只保留主位频控
2. 从最近且场景最匹配的 sponsor 中补 1 条

## 9. 曝光记录

调度返回 sponsor 结果时，应同步写入曝光日志。

### 伪代码

```text
function logImpressions(primary, secondaryList, input, scene):
    insert impression(
        sponsor_id = primary.sponsor.id,
        campaign_id = primary.campaign.id,
        fingerprint = input.fingerprint,
        session_id = input.session_id,
        exposure_role = 'primary',
        scene_context = scene,
        viewport_lat = input.lat,
        viewport_lng = input.lng,
        viewport_radius_meters = input.radius,
        rank_position = 1
    )

    position = 2
    for candidate in secondaryList:
        insert impression(
            sponsor_id = candidate.sponsor.id,
            campaign_id = candidate.campaign.id,
            fingerprint = input.fingerprint,
            session_id = input.session_id,
            exposure_role = 'secondary',
            scene_context = scene,
            viewport_lat = input.lat,
            viewport_lng = input.lng,
            viewport_radius_meters = input.radius,
            rank_position = position
        )
        position = position + 1
```

## 10. 完整调度流程

```text
function scheduleSponsors(input):
    if not isEffectiveMapSession(input.session_id, input.fingerprint):
        return []

    scene = determineScene(input.scene_hint, input.visible_marker_summary)
    candidates = loadCandidates(input, scene)

    if candidates.length == 0:
        return []

    primary = pickPrimary(candidates, input, scene)
    if primary is null:
        return []

    maxSecondary = min(4, primary.campaign.max_secondary_slots)
    secondary = pickSecondary(candidates, primary, input, scene, maxSecondary)

    result = [primary] + secondary
    result = result.slice(0, 5)

    logImpressions(primary, secondary, input, scene)

    return buildSponsorResponse(result, input)
```

## 11. 频控建议

建议最少实现以下三个频控维度：

1. 同一 sponsor 对同一用户每日主位曝光上限
2. 同一 sponsor 对同一用户每日次级位曝光上限
3. 同一品牌同会话只出现一次

可选增强：

1. 用户主动 `dismiss` 后当日降权
2. 连续两天高频出现的 sponsor 第三天降权
3. 根据履约缺口动态补量

## 12. 返回对象构建

调度函数返回给 API 层的 sponsor 对象建议至少包含：

- `id`
- `campaign_id`
- `sponsor_role`
- `business_type`
- `title`
- `name`
- `description`
- `latitude`
- `longitude`
- `address`
- `distance_m`
- `service_hours`
- `service_tags`
- `sponsor_badge`
- `campaign_tier`
- `target_scene`

## 13. 结论

赞助位调度的核心不是“谁出价高就永远霸屏”，而是：

- 在约定片区内履约
- 在合适场景里露出
- 在用户不反感的前提下保持可持续

所以算法必须同时考虑套餐、场景、距离、频控和品牌去重。
