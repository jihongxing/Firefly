# Firefly 赞助位技术设计与接口建议

版本：v1.0  
更新时间：2026-05-27

## 1. 目标

本文件描述 Firefly 赞助补给位的后端数据结构、投放逻辑和接口设计建议，供后续开发直接参考。

目标是：

1. 以最小改动接入现有地图产品
2. 不污染社区治理主模型
3. 支持按片区、场景、套餐控制投放
4. 支持后续统计曝光和点击

## 2. 设计原则

1. 赞助位与 UGC marker 分表建模
2. 赞助位不参与 `consensus_status`
3. 地图接口可以聚合返回，但类型必须清晰区分
4. 投放逻辑以“会话级抽样 + 片区匹配”为主

## 3. 数据模型建议

## 3.1 赞助商表 `sponsors`

```sql
CREATE TABLE sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,        -- 'food', 'clinic', 'supplies', 'transport', 'boarding'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    contact_info TEXT,
    media_url TEXT,
    city_code TEXT NOT NULL,
    area_label TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    service_hours TEXT,
    service_tags TEXT NOT NULL,         -- JSON array or CSV
    landing_url TEXT,
    sponsor_badge TEXT DEFAULT 'sponsored',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (business_type IN ('food', 'clinic', 'supplies', 'transport', 'boarding')),
    CHECK (status IN ('active', 'paused', 'expired', 'blocked'))
);
```

## 3.2 投放套餐表 `sponsor_campaigns`

```sql
CREATE TABLE sponsor_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    package_tier TEXT NOT NULL,         -- 'guard_30', 'resident_70', 'exclusive_100'
    target_scene TEXT NOT NULL,         -- 'risk', 'care', 'both'
    city_code TEXT NOT NULL,
    area_center_lat REAL NOT NULL,
    area_center_lng REAL NOT NULL,
    area_radius_meters INTEGER NOT NULL DEFAULT 5000,
    share_ratio REAL NOT NULL,          -- 0.3 / 0.7 / 1.0
    city_multiplier REAL NOT NULL DEFAULT 1.0,
    scene_multiplier REAL NOT NULL DEFAULT 1.0,
    monthly_price_cents INTEGER NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    CHECK (package_tier IN ('guard_30', 'resident_70', 'exclusive_100')),
    CHECK (target_scene IN ('risk', 'care', 'both')),
    CHECK (status IN ('active', 'paused', 'expired'))
);
```

## 3.3 曝光记录表 `sponsor_impressions`

```sql
CREATE TABLE sponsor_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    campaign_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    session_id TEXT NOT NULL,
    exposure_role TEXT NOT NULL,        -- 'primary', 'secondary'
    scene_context TEXT NOT NULL,        -- 'risk', 'care', 'mixed'
    viewport_lat REAL,
    viewport_lng REAL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
    CHECK (exposure_role IN ('primary', 'secondary')),
    CHECK (scene_context IN ('risk', 'care', 'mixed'))
);
```

## 3.4 交互记录表 `sponsor_events`

```sql
CREATE TABLE sponsor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    campaign_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,           -- 'open', 'navigate', 'contact', 'dismiss'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
    CHECK (event_type IN ('open', 'navigate', 'contact', 'dismiss'))
);
```

## 4. 与现有地图模型的关系

当前 Firefly 主模型是 `markers`，用于：

- 风险预警
- 救助协作

赞助位不建议直接写入 `markers`，原因：

1. 会混淆社区治理逻辑
2. 会污染 `consensus_status`
3. 会让地图图层语义变脏

正确做法：

- `markers` 继续承载社区信息
- `sponsors` 独立承载商业补给位
- 前端地图层面聚合渲染

## 5. 投放逻辑建议

## 5.1 输入

当用户请求地图数据时，投放引擎输入：

- 用户定位
- 当前视野中心
- 当前缩放层级
- 当前场景
- 用户指纹
- 会话 ID

## 5.2 当前场景判断

可以简化为：

- 当前视野内风险点更多，判定为 `risk`
- 当前视野内救助点更多，判定为 `care`
- 两类都较多，判定为 `mixed`

## 5.3 主赞助位选择

建议算法：

1. 找出当前片区内有效 campaign
2. 按场景过滤
3. 按套餐权重抽样
4. 加入用户频控
5. 选出 1 个主赞助位

套餐权重建议：

- 30%：3
- 70%：7
- 100%：10

## 5.4 扩展赞助位选择

在主赞助位之外：

1. 去除同品牌重复
2. 按距离和匹配度排序
3. 最多选 2 到 4 个

## 5.5 频控

可加入如下逻辑：

- 同一 sponsor 对同一 fingerprint 24 小时主位曝光不超过 N 次
- 用户主动 dismiss 后当日降权

## 6. 前端返回模型建议

## 6.1 新增赞助位对象

建议新增独立返回结构：

```json
{
  "id": 901,
  "type": "sponsor",
  "sponsor_role": "primary",
  "business_type": "food",
  "title": "附近补给合作点",
  "name": "某某猫粮赞助站",
  "latitude": 22.5438,
  "longitude": 114.0582,
  "address": "深圳市南山区某街区",
  "description": "支持流浪猫粮补给与爱心折扣。",
  "service_tags": ["cat_food", "discount", "care_support"],
  "distance_m": 420,
  "sponsor_badge": "sponsored",
  "campaign_tier": "guard_30",
  "target_scene": "care",
  "contact_info": "站内联系后可见"
}
```

## 6.2 推荐聚合接口

### 方案 A：在 `GET /api/markers` 中聚合返回

```json
{
  "data": {
    "markers": [],
    "sponsors": []
  }
}
```

优点：

- 前端少发一次请求

缺点：

- 返回结构要从数组改成对象

### 方案 B：新增独立接口

`GET /api/sponsors/nearby?lat=...&lng=...&scene=care`

优点：

- 与现有接口解耦
- 回滚容易

缺点：

- 前端多一次请求

建议第一阶段采用：

**方案 B**

因为改动更小。

## 7. 接口建议

## 7.1 用户侧接口

### `GET /api/sponsors/nearby`

参数：

- `lat`
- `lng`
- `radius`
- `scene`
- `limit`

返回：

- 当前视野匹配的赞助位，最多 5 条

### `POST /api/sponsors/{id}/event`

请求体：

```json
{
  "event_type": "open",
  "session_id": "abc123"
}
```

用于统计：

- 打开
- 导航
- 联系
- dismiss

## 7.2 运营侧接口

### `POST /api/admin/sponsors`

创建赞助商信息。

### `POST /api/admin/sponsor-campaigns`

创建赞助投放计划。

### `GET /api/admin/sponsor-campaigns`

查看投放状态、片区、价格和周期。

### `GET /api/admin/sponsor-reports`

查看曝光、点击、打开、联系等数据。

## 8. 地图渲染建议

前端建议单独维护：

- `riskLayer`
- `careLayer`
- `sponsorLayer`

赞助 layer 的规则：

1. 图标和普通点位明显不同
2. 主赞助位比扩展位更强
3. 赞助位默认不抢占风险点点击

## 9. MVP 实施顺序

### 第一步

- 建立 `sponsors`、`sponsor_campaigns`

### 第二步

- 做 `GET /api/sponsors/nearby`

### 第三步

- 地图渲染 sponsor layer

### 第四步

- 记录 `sponsor_impressions` 与 `sponsor_events`

### 第五步

- 增加运营端报表

## 10. 结论

技术上最稳的路径不是把赞助位塞进社区 marker 模型，而是：

- 独立建模
- 前端聚合渲染
- 会话级抽样投放
- 保持强标识和弱侵入

这样既能控制复杂度，也能保护 Firefly 现有的社区治理架构。
