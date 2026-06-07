# Firefly API 契约

版本：v1.0  
更新时间：2026-05-26

## 1. 约定

### 1.1 基础格式

- Base URL：`/api`
- 数据格式：`application/json`
- 时间格式：ISO 8601，UTC
- 坐标格式：WGS84 浮点数

### 1.2 通用字段

- `id`：记录 ID
- `category`：分类编码
- `title`：标题
- `status`：启用状态
- `review_status`：审核状态
- `visibility`：公开策略

### 1.3 分类枚举

风险类：

- `abuse`
- `poison`
- `trap`
- `theft`
- `missing_pet`
- `suspicious_vehicle`

爱心类：

- `station`
- `food_bank`
- `friendly_clinic`
- `helper`
- `trap_support`
- `nearby_adoption`

### 1.4 状态枚举

- `pending`
- `approved`
- `rejected`
- `hidden`

### 1.5 可见性枚举

- `public`
- `masked`
- `private`

### 1.6 通用错误格式

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "radius is required"
  }
}
```

### 1.7 支持语言

第一阶段支持：

- `zh-CN`
- `en`
- `hi`

请求语言优先级：

1. `lang` 查询参数
2. `Accept-Language` 请求头
3. 默认 `zh-CN`

## 2. 公开接口

## 2.1 获取周边标记

`GET /api/markers`

### Query 参数

- `lat`：纬度，必填
- `lng`：经度，必填
- `radius`：半径，单位米，默认 3000
- `types`：分类列表，逗号分隔，可选
- `lang`：响应语言，可选，支持 `zh-CN`、`en`、`hi`
- `limit`：返回条数，默认 50，最大 200
- `cursor`：分页游标，可选

### 响应

```json
{
  "data": [
    {
      "id": 1,
      "category": "station",
      "title": "阿明的小动物救助站",
      "source_locale": "zh-CN",
      "locale": "en",
      "is_translated": true,
      "latitude": 22.548,
      "longitude": 114.055,
      "address": "深圳市南山区XX路附近",
      "description": "可接收流浪猫临时中转",
      "media_url": "https://cdn.example.com/a.webp",
      "visibility": "masked",
      "review_status": "approved",
      "distance_m": 420,
      "created_at": "2026-05-26T08:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### 返回规则

- 仅返回 `approved` 且未 `hidden` 的内容
- 爱心类点位返回模糊坐标
- `contact_info` 默认不返回

## 2.2 获取单个标记详情

`GET /api/markers/{id}`

### 响应

```json
{
  "data": {
    "id": 1,
    "category": "station",
    "title": "阿明的小动物救助站",
    "source_locale": "zh-CN",
    "locale": "hi",
    "is_translated": false,
    "latitude": 22.548,
    "longitude": 114.055,
    "address": "深圳市南山区XX路附近",
    "description": "可接收流浪猫临时中转",
    "media_url": "https://cdn.example.com/a.webp",
    "visibility": "masked",
    "review_status": "approved",
    "contact_info": null,
    "created_at": "2026-05-26T08:00:00Z"
  }
}
```

## 3. 提交接口

## 3.1 提交标记

`POST /api/markers/submit`

### 请求方式

`multipart/form-data`

### 字段

- `category`：必填
- `title`：必填
- `latitude`：必填
- `longitude`：必填
- `address`：必填
- `description`：必填
- `source_locale`：必填，支持 `zh-CN`、`en`、`hi`
- `contact_info`：选填，仅爱心类建议填写
- `visibility`：选填，默认 `public`
- `media`：选填，图片或视频

### 响应

```json
{
  "data": {
    "id": 123,
    "review_status": "pending",
    "status": 1
  }
}
```

### 规则

- 风险类默认匿名提交
- 爱心类可选择联系方式可见范围
- 提交后进入审核队列

## 3.2 提交举报

`POST /api/markers/{id}/report`

### 请求体

```json
{
  "reason": "位置不准确",
  "note": "与现场情况不符"
}
```

### 响应

```json
{
  "data": {
    "report_id": 88
  }
}
```

## 4. 后台接口

## 4.0 新增译文

`POST /api/admin/markers/{id}/translations`

### 请求体

```json
{
  "locale": "en",
  "title": "Amin Animal Rescue Station",
  "address": "Near XX Road, Nanshan District, Shenzhen",
  "description": "Can temporarily shelter stray cats"
}
```

## 4.1 审核通过

`POST /api/admin/markers/{id}/review`

### 请求体

```json
{
  "action": "approve",
  "note": "信息有效"
}
```

### `action`

- `approve`
- `reject`

## 4.2 隐藏标记

`POST /api/admin/markers/{id}/hide`

### 请求体

```json
{
  "note": "收到有效举报"
}
```

## 4.3 恢复标记

`POST /api/admin/markers/{id}/restore`

### 请求体

```json
{
  "note": "复核通过"
}
```

## 5. 健康检查

`GET /api/health`

### 响应

```json
{
  "ok": true
}
```

## 6. 错误码

- `INVALID_PARAMS`
- `NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `TOO_MANY_REQUESTS`
- `UPLOAD_FAILED`
- `REVIEW_REQUIRED`
- `INTERNAL_ERROR`

## 7. 建议实现细节

- 查询接口按距离排序
- 提交接口做频率限制
- 管理接口必须鉴权
- 敏感字段默认不下发到前台
- 图片 URL 只返回可访问的公开资源
