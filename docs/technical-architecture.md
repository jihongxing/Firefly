# Firefly 技术方案

版本：v2.0  
更新时间：2026-05-26

## 1. 架构目标

Firefly 的技术方案需要满足四个核心目标：

1. 轻量实现：适合早期快速落地与低成本维护。
2. 地图优先：围绕地理位置检索、展示与提交设计。
3. 隐私优先：保护线索提供者与救助者的真实位置和联系方式。
4. 可运营：支持审核、举报、隐藏、复核等管理动作。

## 2. 总体架构

```text
[PWA Frontend]
  HTML + CSS + Vanilla JS + Leaflet
          |
          v
[API Service]
   Go or Node.js
          |
          v
[Database]
 SQLite (MVP) / PostgreSQL (growth)
          |
          v
[Media Storage]
 Local filesystem / object storage abstraction
```

## 3. 前端架构

### 3.1 技术选型

- 原生 HTML5
- CSS3
- Vanilla JavaScript
- Leaflet.js
- OpenStreetMap

### 3.2 选型理由

- 依赖少，首屏轻
- 易于直接部署为静态站点或 PWA
- 适合地图型单页产品的早期迭代
- 减少框架升级与构建链复杂度

### 3.3 PWA 能力

建议提供以下基础能力：

- `manifest.json`
- `service-worker.js`
- 静态资源缓存
- 离线打开壳层页面
- 添加到主屏幕

### 3.4 国际化资源

前端建议内置三套语言资源：

- `zh-CN`
- `en`
- `hi`

静态界面文案优先通过本地 locale JSON 加载，不依赖运行时远程翻译。

### 3.5 首页地图渲染

首页基于 Leaflet 渲染两大图层：

- 风险图层
- 爱心图层

建议前端维护类别到样式的映射表，而不是在渲染逻辑中写死分支。

示例：

```js
const markerStyleMap = {
  abuse: { group: "risk", icon: riskIcon },
  poison: { group: "risk", icon: riskIcon },
  trap: { group: "risk", icon: riskIcon },
  theft: { group: "risk", icon: riskIcon },
  station: { group: "help", icon: helpIcon },
  food_bank: { group: "help", icon: helpIcon },
  friendly_clinic: { group: "help", icon: helpIcon },
  helper: { group: "help", icon: helpIcon }
};
```

### 3.6 坐标展示策略

前端展示时应区分两种坐标：

- `public_latitude/public_longitude`
- `private_latitude/private_longitude`

建议规则：

- 风险类标记：公开坐标可较精确，但仍建议保留一定文本审核和证据要求。
- 爱心类标记：公开坐标做模糊化展示，例如偏移 50 到 100 米，或展示近似范围。

## 4. 后端架构

### 4.1 语言选择

推荐优先级：

1. Go
2. Node.js

Go 适合 MVP 的原因：

- 单二进制部署简单
- 资源占用低
- 并发模型适合轻量 API 服务

### 4.2 核心职责

后端主要负责：

- 接收地图查询请求
- 接收提交表单
- 做审核状态过滤
- 管理图片上传
- 做频控、防刷与审计
- 对敏感字段做最小化返回

### 4.3 API 建议

接口应支持 `lang` 查询参数与 `Accept-Language` 请求头，以返回匹配用户语言的界面字段与可用译文。

#### 公开查询接口

```http
GET /api/markers?lat={lat}&lng={lng}&radius={radius}&types=abuse,station
```

返回原则：

- 仅返回已审核可公开的点位
- 不返回私密联系方式
- 爱心类返回模糊后的公开坐标

#### 提交接口

```http
POST /api/markers/submit
Content-Type: multipart/form-data
```

字段建议：

- `type`
- `title`
- `latitude`
- `longitude`
- `address`
- `description`
- `contact_info`
- `media`

#### 举报接口

```http
POST /api/markers/{id}/report
```

#### 后台审核接口

```http
POST /api/admin/markers/{id}/review
POST /api/admin/markers/{id}/hide
POST /api/admin/markers/{id}/restore
```

## 5. 数据库设计

## 5.1 MVP 数据表

建议将“显示坐标”和“精确坐标”拆开，以便支持隐私保护。

```sql
CREATE TABLE markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    public_latitude REAL NOT NULL,
    public_longitude REAL NOT NULL,
    private_latitude REAL NOT NULL,
    private_longitude REAL NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    contact_info TEXT,
    media_url TEXT,
    source_locale TEXT NOT NULL DEFAULT 'zh-CN',
    fingerprint TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    review_status TEXT NOT NULL DEFAULT 'pending',
    status INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

字段说明：

- `category`：类别编码
- `public_latitude/public_longitude`：前台展示坐标
- `private_latitude/private_longitude`：后台精确坐标
- `contact_info`：联系方式，建议仅爱心类可写
- `source_locale`：原始内容语言
- `fingerprint`：频控与滥用治理用途
- `visibility`：如 `public`、`masked`、`private`
- `review_status`：如 `pending`、`approved`、`rejected`
- `status`：是否启用或隐藏

### 5.3 多语言内容表

建议新增译文表：

```sql
CREATE TABLE marker_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 5.2 配套表建议

### 举报表

```sql
CREATE TABLE marker_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 审核日志表

```sql
CREATE TABLE review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    operator_id TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6. 防刷与滥用控制

### 6.1 基础频控

可基于以下信息生成临时标识：

- User-Agent
- 浏览器指纹
- 模糊化 IP

建议用途：

- 限制单位时间内提交次数
- 限制重复举报
- 标记异常高频行为

### 6.2 图片治理

- 限制图片大小
- 上传即压缩为 WebP
- 去除可识别元数据
- 拒绝可执行文件伪装上传

### 6.3 内容治理

- 屏蔽明显的人身攻击与泄露隐私信息
- 对高风险内容进入人工审核
- 对重复位置与重复内容做去重提醒

## 7. 地图渲染建议

Leaflet 层面建议拆分为两个 `LayerGroup`：

- `riskLayer`
- `helpLayer`

示例逻辑：

```js
const riskTypes = new Set(["abuse", "poison", "trap", "theft"]);
const helpTypes = new Set(["station", "food_bank", "friendly_clinic", "helper"]);

function pickLayer(item) {
  if (riskTypes.has(item.category)) return riskLayer;
  if (helpTypes.has(item.category)) return helpLayer;
  return null;
}
```

渲染时建议：

- 风险类：深色或暗橙色图标
- 爱心类：暖红或粉色图标
- 联系方式仅在权限允许时展示

## 8. 部署建议

## 8.1 MVP 部署方案

### 方案 A：静态前端 + 轻量 API + SQLite

- 前端：Vercel / Cloudflare Pages
- API：海外 VPS 或轻量容器
- 数据库：SQLite
- 图片：服务器本地磁盘

适合：

- 快速验证
- 成本极低
- 开发部署最简单

### 方案 B：静态前端 + 托管后端

- 前端：Vercel / Cloudflare Pages
- 后端与数据库：Supabase 或其他托管服务

适合：

- 希望减少自建运维工作
- 需要更成熟的数据库与控制台

## 8.2 基础运维要求

- 全站 HTTPS
- CDN 与基础 WAF
- 资源缓存策略
- 错误日志采集
- 数据库定期备份
- 上传目录定期巡检

## 8.3 容灾建议

- 支持数据库定期导出
- 静态资源与媒体分离备份
- 域名、证书与 DNS 配置文档化
- 服务配置可脚本化重建

## 9. 安全与隐私建议

### 9.1 必做项

- 联系方式最小化展示
- 敏感坐标双轨存储
- 管理后台鉴权
- 审核操作留痕
- 上传内容类型校验

### 9.2 推荐项

- 联系方式加密存储
- 后台访问 IP 白名单
- 管理动作审计日志
- 图片内容审核

## 10. 里程碑建议

### Milestone 1：MVP

- 地图首页
- 分类图层
- 提交表单
- 图片上传
- 审核后台最小闭环

### Milestone 2：运营化

- 举报与复核流程
- 可信度标签
- 更细的分类与筛选
- 站内联系能力

### Milestone 3：规模化

- PostgreSQL 迁移
- 更完整的后台
- 多城市配置
- 数据分析面板

## 11. 技术决策建议

当前阶段建议优先采用：

1. 前端：Vanilla JS + Leaflet + PWA
2. 后端：Go
3. 数据库：SQLite
4. 部署：静态前端托管 + 独立 API 服务

这个组合最适合快速做出第一版，同时保留后续迁移到更成熟架构的空间。
