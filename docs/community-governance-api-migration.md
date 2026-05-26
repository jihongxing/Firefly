# Firefly 社区共识治理接口变更清单

版本：v1.0  
更新时间：2026-05-26

## 1. 目标

本清单用于指导 Firefly 从“人工审核模型”迁移到“社区共识治理模型”。

迁移原则：

1. 尽量保留现有读接口路径，减少前端切换成本
2. 先增量兼容，再逐步废弃旧字段
3. 新接口围绕“社区反馈、信誉、状态流转”设计
4. 后台人工审核接口不再作为主路径

## 2. 总体变化

## 2.1 核心模型变化

旧模型：

- `review_status`
- `approve / reject / hide / restore`

新模型：

- `consensus_status`
- `support_score`
- `dispute_score`
- `confidence_score`
- `freshness_score`
- `expires_at`
- 社区反馈 `marker_feedback`

## 2.2 兼容策略

第一阶段建议：

- 保留旧字段 `review_status`
- 新增字段 `consensus_status`
- 前端优先消费 `consensus_status`
- 旧后台接口保留一段时间，但标记为 deprecated

## 3. 字段层变更

## 3.1 `GET /api/markers`

### 保留字段

- `id`
- `category`
- `title`
- `latitude`
- `longitude`
- `address`
- `description`
- `media_url`
- `media_thumb_url`
- `visibility`
- `source_locale`
- `locale`
- `is_translated`
- `created_at`

### 新增字段

- `consensus_status`
- `confidence_score`
- `support_score`
- `dispute_score`
- `freshness_score`
- `last_confirmed_at`
- `expires_at`
- `feedback_summary`

### 新增响应示例

```json
{
  "id": 12,
  "category": "poison",
  "title": "收到关于该区域的投毒风险情报",
  "latitude": 22.5438,
  "longitude": 114.0582,
  "address": "深圳市福田区某公园北门附近",
  "description": "近 24 小时收到多条附近喂养人线索。",
  "consensus_status": "limited",
  "confidence_score": 4.6,
  "support_score": 3.8,
  "dispute_score": 0.2,
  "freshness_score": 0.9,
  "last_confirmed_at": "2026-05-26T09:10:00Z",
  "expires_at": "2026-06-02T09:10:00Z",
  "feedback_summary": {
    "confirm_valid": 2,
    "mark_doubtful": 0,
    "mark_outdated": 0,
    "seen_similar": 1
  }
}
```

### 前端改造点

- 不再依据 `review_status` 判断公开状态
- 按 `consensus_status` 决定点位视觉权重

## 3.2 `GET /api/markers/{id}`

### 新增字段

- `consensus_status`
- `confidence_score`
- `support_score`
- `dispute_score`
- `freshness_score`
- `last_confirmed_at`
- `expires_at`
- `feedback_summary`
- `available_feedback_actions`

### 新增说明

`available_feedback_actions` 用于前端直接渲染结构化反馈按钮，避免前端硬编码。

示例：

```json
{
  "available_feedback_actions": [
    "confirm_valid",
    "mark_doubtful",
    "mark_outdated",
    "seen_similar"
  ]
}
```

## 3.3 `POST /api/markers/submit`

### 保留字段

- `category`
- `title`
- `latitude`
- `longitude`
- `address`
- `description`
- `source_locale`
- `contact_info`
- `visibility`
- `media`

### 新增字段

风险类建议新增：

- `event_time`
- `is_first_hand`
- `evidence_type`

爱心类建议新增：

- `service_type`
- `availability_note`

### 响应变更

旧响应：

```json
{
  "data": {
    "id": 123,
    "review_status": "pending",
    "status": 1
  }
}
```

新响应：

```json
{
  "data": {
    "id": 123,
    "consensus_status": "pending",
    "visibility_scope": "local_validation",
    "message": "已进入社区验证"
  }
}
```

## 4. 新增接口

## 4.1 `POST /api/markers/{id}/feedback`

### 作用

提交结构化社区反馈，替代人工审核流。

### 请求体

```json
{
  "action": "confirm_valid",
  "note": "昨晚现场也看到了类似情况",
  "actor_latitude": 22.5432,
  "actor_longitude": 114.0584
}
```

### 响应体

```json
{
  "data": {
    "marker_id": 123,
    "action": "confirm_valid",
    "weight_score": 0.8,
    "consensus_status": "limited",
    "confidence_score": 3.4
  }
}
```

### 规则

- 同一指纹对同一点位同一动作只保留一次有效反馈
- 前端提交后立即刷新点位状态

## 4.2 `GET /api/markers/{id}/feedback-summary`

### 作用

获取某点位的社区反馈摘要，便于详情页局部刷新。

### 响应体

```json
{
  "data": {
    "consensus_status": "verified",
    "confidence_score": 8.2,
    "support_score": 9.1,
    "dispute_score": 1.3,
    "feedback_summary": {
      "confirm_valid": 6,
      "seen_similar": 3,
      "mark_doubtful": 1
    }
  }
}
```

## 4.3 `GET /api/me/reputation`

### 作用

读取当前设备或当前用户的信誉画像。

### 响应体

```json
{
  "data": {
    "trust_score": 14.5,
    "trust_level": "L1",
    "successful_submissions": 2,
    "failed_submissions": 0,
    "successful_flags": 3,
    "failed_flags": 1
  }
}
```

## 4.4 `GET /api/me/activity`

### 作用

读取当前用户或设备的提交与反馈历史。

### 响应体

```json
{
  "data": {
    "submissions": [],
    "feedback": []
  }
}
```

## 4.5 `POST /api/markers/{id}/escalate`

### 作用

将点位升级到异常治理流程。

### 请求体

```json
{
  "escalation_type": "privacy_risk",
  "trigger_reason": "疑似公开了可识别个人隐私"
}
```

## 5. 旧接口处置策略

## 5.1 保留但降级为兼容接口

### `POST /api/markers/{id}/report`

处理建议：

- 短期保留
- 内部统一转换为一条 `marker_feedback`
- 默认映射到 `mark_doubtful` 或 `mark_outdated`

### `POST /api/admin/markers/{id}/translations`

处理建议：

- 保留
- 与社区治理不冲突

## 5.2 标记为废弃

以下接口在社区治理模型中不再作为主路径：

- `GET /api/admin/markers`
- `POST /api/admin/markers/{id}/review`
- `POST /api/admin/markers/{id}/hide`
- `POST /api/admin/markers/{id}/restore`

建议：

- 第一阶段继续存在
- 返回头中加入废弃提示
- 前端不再依赖这些接口做日常公开状态流转

## 6. 枚举调整

## 6.1 旧枚举

`review_status`

- `pending`
- `approved`
- `rejected`
- `hidden`

## 6.2 新枚举

`consensus_status`

- `pending`
- `limited`
- `verified`
- `disputed`
- `expired`

## 6.3 动作枚举

- `confirm_valid`
- `mark_doubtful`
- `mark_outdated`
- `seen_similar`
- `not_found_on_site`
- `contact_success`
- `service_completed`
- `contact_failed`

## 7. 前端改造清单

## 7.1 地图页

- 增加 `consensus_status` 标签
- 风险和爱心点位根据状态调整层级
- `pending` / `limited` 默认比 `verified` 弱曝光

## 7.2 详情页

- 新增社区状态区
- 新增结构化反馈按钮组
- 新增“我的反馈已记录”即时提示

## 7.3 提交成功页

- 文案从“等待审核”改为“进入社区验证”

## 7.4 个人页

- 新增信誉与贡献模块

## 8. 建议实施顺序

### 第一步

- 数据表迁移
- 只新增字段和新表，不删旧接口

### 第二步

- 查询接口返回 `consensus_status`
- 前端开始消费新状态

### 第三步

- 上线 `POST /api/markers/{id}/feedback`
- 用社区反馈驱动状态流转

### 第四步

- 将 `report` 逻辑并入反馈体系
- 降低人工审核入口优先级

## 9. SQL 迁移基线说明

- 配套脚本见 [sqlite-migrate-community-governance.sql](D:/codeSpace/Firefly/docs/sqlite-migrate-community-governance.sql)
- 该脚本以运行时 schema [internal/firefly/schema.sql](D:/codeSpace/Firefly/internal/firefly/schema.sql) 为基线
- 该脚本是一次性 migration，不可重复执行
- 如果数据库仍停留在旧版 [sqlite-init.sql](D:/codeSpace/Firefly/docs/sqlite-init.sql) 结构，需先补齐运行时已经存在的字段后再执行
- 迁移脚本已考虑 `trg_markers_updated_at` 触发器对历史时间回填的影响，会先快照原始时间再回填共识字段

## 10. 结论

这次接口迁移不是简单“多几个字段”，而是把 Firefly 的治理核心从：

- 平台审核内容

迁移为：

- 平台计算社区共识

所以接口设计必须围绕“反馈、信誉、状态、衰减”四个中心展开。
