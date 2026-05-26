# Firefly 赞助补给位接口变更清单

版本：v1.0  
更新时间：2026-05-27

## 1. 目标

本清单用于指导 Firefly 在不破坏现有社区地图主流程的前提下，引入赞助补给位能力。

迁移原则：

1. 赞助位与 UGC marker 解耦
2. 第一阶段优先新增接口，不强改现有 `GET /api/markers`
3. 地图端先做并行请求，待稳定后再考虑聚合
4. 曝光与交互统计必须从第一期开始留痕

## 2. 总体变化

## 2.1 现有主接口保持不动

第一阶段建议：

- `GET /api/markers` 保持现状
- `GET /api/markers/{id}` 保持现状
- 由前端额外请求赞助接口并合并渲染

这样做的优点：

1. 回滚简单
2. 不会影响社区治理查询逻辑
3. 便于独立压测与灰度

## 2.2 新增赞助域接口

新增独立域：

- `GET /api/sponsors/nearby`
- `POST /api/sponsors/events`

运营侧新增：

- `GET /api/admin/sponsors`
- `POST /api/admin/sponsors`
- `PATCH /api/admin/sponsors/{id}`
- `GET /api/admin/sponsor-campaigns`
- `POST /api/admin/sponsor-campaigns`
- `PATCH /api/admin/sponsor-campaigns/{id}`
- `GET /api/admin/sponsor-reports`

## 3. 推荐实施路径

## 3.1 第一阶段

采用独立接口方案：

`GET /api/sponsors/nearby`

不直接改造：

`GET /api/markers`

原因：

1. 现有前端只需新增一次请求
2. 不会把商业字段混进 marker 响应模型
3. 后端可单独做频控、调度和日志

## 3.2 第二阶段

如果后续希望减少请求数，可以在 `GET /api/markers` 增加可选聚合参数：

`include_sponsors=1`

返回结构变为：

```json
{
  "data": {
    "markers": [],
    "sponsors": []
  }
}
```

但这一步不建议作为 MVP 首发方案。

## 4. 用户侧接口

## 4.1 `GET /api/sponsors/nearby`

### 作用

返回当前地图会话下应展示的赞助补给位结果。

### Query 参数

- `lat`：纬度，必填
- `lng`：经度，必填
- `radius`：半径，单位米，默认 `5000`
- `scene`：当前地图场景，可选 `risk`、`care`、`mixed`
- `limit`：最多返回条数，默认 `3`，最大 `5`
- `session_id`：地图会话 ID，必填
- `lang`：响应语言，可选

### 响应体

```json
{
  "data": [
    {
      "id": 901,
      "type": "sponsor",
      "sponsor_role": "primary",
      "campaign_id": 1001,
      "business_type": "food",
      "title": "附近补给合作点",
      "name": "喵喵猫粮支持站",
      "description": "可提供流浪猫粮补给与临时折扣支持。",
      "latitude": 22.5438,
      "longitude": 114.0582,
      "address": "深圳市南山区某街区",
      "distance_m": 420,
      "service_hours": "10:00-22:00",
      "service_tags": ["cat_food", "care_support"],
      "landing_url": "https://example.org/sponsor/901",
      "sponsor_badge": "sponsored",
      "campaign_tier": "guard_30",
      "target_scene": "care"
    }
  ]
}
```

### 返回规则

1. 同一会话最多返回 5 条，MVP 默认返回 1 到 3 条
2. 若当前片区有有效 campaign，则至少返回 1 条主赞助位
3. 若没有有效 campaign，则返回空数组
4. 同品牌同会话不得重复返回多个点位

## 4.2 `POST /api/sponsors/events`

### 作用

记录用户对赞助位的关键交互事件。

### 请求体

```json
{
  "sponsor_id": 901,
  "campaign_id": 1001,
  "session_id": "map_4bc6c2d9",
  "event_type": "open",
  "metadata": {
    "scene": "care",
    "entry": "map_pin"
  }
}
```

### `event_type`

- `open`
- `view_details`
- `navigate`
- `contact`
- `dismiss`

### 响应体

```json
{
  "data": {
    "ok": true
  }
}
```

### 规则

1. 事件必须附带 `session_id`
2. 后端应校验 `campaign_id` 与 `sponsor_id` 的归属关系
3. `dismiss` 可作为当日降权依据

## 4.3 可选接口：`GET /api/sponsors/{id}`

### 建议

若前端详情弹层信息已在 `nearby` 返回中足够完整，可以暂不实现。

当需要更丰富的赞助详情页时，再新增：

`GET /api/sponsors/{id}`

## 5. 运营侧接口

## 5.1 `GET /api/admin/sponsors`

### 作用

按城市、状态、类型筛选赞助商主数据。

### Query 参数

- `city_code`
- `status`
- `business_type`
- `keyword`

## 5.2 `POST /api/admin/sponsors`

### 作用

创建赞助商主档。

### 请求体

```json
{
  "brand_key": "miaomiao-food",
  "name": "喵喵猫粮支持站",
  "business_type": "food",
  "title": "附近补给合作点",
  "description": "支持流浪动物补给协作。",
  "city_code": "CN-SZ",
  "area_label": "南山中心片区",
  "latitude": 22.5438,
  "longitude": 114.0582,
  "address": "深圳市南山区某街区"
}
```

## 5.3 `PATCH /api/admin/sponsors/{id}`

### 作用

更新赞助商信息、暂停、下线或封禁。

## 5.4 `GET /api/admin/sponsor-campaigns`

### 作用

读取投放计划与履约状态。

### 返回关注字段

- `package_tier`
- `target_scene`
- `share_ratio`
- `start_at`
- `end_at`
- `status`
- `monthly_price_cents`

## 5.5 `POST /api/admin/sponsor-campaigns`

### 作用

创建赞助投放计划。

### 请求体

```json
{
  "sponsor_id": 901,
  "package_tier": "resident_70",
  "target_scene": "care",
  "city_code": "CN-SZ",
  "area_label": "南山中心片区",
  "area_center_lat": 22.543,
  "area_center_lng": 114.058,
  "area_radius_meters": 5000,
  "share_ratio": 0.7,
  "priority_weight": 7,
  "city_multiplier": 1.2,
  "scene_multiplier": 1.0,
  "monthly_price_cents": 79900,
  "start_at": "2026-06-01T00:00:00Z",
  "end_at": "2026-06-30T23:59:59Z"
}
```

## 5.6 `PATCH /api/admin/sponsor-campaigns/{id}`

### 作用

暂停、续期或结束某一投放计划。

## 5.7 `GET /api/admin/sponsor-reports`

### 作用

查看履约与转化数据。

### Query 参数

- `campaign_id`
- `sponsor_id`
- `date_from`
- `date_to`

### 返回关注字段

- `primary_impressions`
- `secondary_impressions`
- `open_count`
- `detail_count`
- `navigate_count`
- `contact_count`
- `dismiss_count`

## 6. 与现有接口的兼容说明

## 6.1 `GET /api/markers`

第一阶段不做结构变更。

前端调用顺序建议：

1. 请求 `GET /api/markers`
2. 根据当前视野计算 `scene`
3. 请求 `GET /api/sponsors/nearby`
4. 前端按独立 sponsor layer 渲染

## 6.2 `GET /api/markers/{id}`

不直接返回 sponsor 信息。

若需要在点位详情页做“附近补给推荐”，建议前端按当前 marker 坐标再请求一次：

`GET /api/sponsors/nearby`

并限制 `limit=1`

## 7. 返回字段建议

赞助位对象建议固定包含：

- `id`
- `type`
- `sponsor_role`
- `campaign_id`
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
- `landing_url`
- `sponsor_badge`
- `campaign_tier`
- `target_scene`

不建议默认下发：

- 内部结算价
- 运营备注
- 合同信息

## 8. 错误码建议

新增：

- `SPONSOR_CAMPAIGN_NOT_FOUND`
- `SPONSOR_CAMPAIGN_INACTIVE`
- `INVALID_SESSION_ID`
- `SPONSOR_EVENT_REJECTED`

## 9. 实施顺序

### 第一步

- 落 sponsor SQL
- 创建主数据与 campaign CRUD

### 第二步

- 上线 `GET /api/sponsors/nearby`
- 打通地图独立图层

### 第三步

- 上线 `POST /api/sponsors/events`
- 开始留存曝光与交互数据

### 第四步

- 增加 `GET /api/admin/sponsor-reports`
- 校验履约与续费逻辑

## 10. 配套脚本

- 初始化脚本见 [sponsor-sql-init.sql](D:/codeSpace/Firefly/docs/sponsor-sql-init.sql)
- 技术设计见 [sponsor-technical-design.md](D:/codeSpace/Firefly/docs/sponsor-technical-design.md)

## 11. 结论

赞助位接口接入最稳妥的做法是：

- 先独立建模
- 先独立请求
- 先独立统计

等投放模型稳定后，再考虑是否与地图主查询做聚合。
