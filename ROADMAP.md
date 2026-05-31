# Firefly 项目重构 Roadmap

## 执行摘要

本文档描述从当前 **Go + SQLite + 原生前端** 架构迁移到 **Node.js + PostgreSQL + React** 架构的完整重构计划。

**当前状态**: Go 后端已实现核心功能（地图标记、赞助商、社区治理、声誉系统）  
**目标状态**: Node.js + TypeScript + Express 后端 + React + TypeScript + Vite 前端  
**预计周期**: 8-12 周  
**风险等级**: 高（完全重写）

---

## 1. 当前架构评估

### 1.1 已实现功能（Go 后端）

**核心模块**:
- ✅ 地图标记系统（Markers）- 风险/帮助标记的 CRUD
- ✅ 社区反馈系统（Feedback）- 8 种反馈动作，共识算法
- ✅ 声誉系统（Reputation）- 信任分数、等级、活动追踪
- ✅ 赞助商系统（Sponsors）- 商家展示、活动管理、曝光追踪
- ✅ 管理后台（Admin）- 审核、隐藏、翻译管理
- ✅ 国际化（i18n）- 支持中文、英文、印地语
- ✅ 文件上传 - 图片/视频处理、缩略图生成
- ✅ 限流机制 - 基于指纹的提交限制

**技术栈**:
```
后端: Go 1.x + net/http + SQLite
前端: 原生 HTML/CSS/JS + Leaflet.js
数据库: SQLite (12 张表，完整索引和触发器)
部署: 单体应用
```

**数据模型**（12 张核心表）:
- `markers` - 地图标记主表
- `marker_feedback` - 社区反馈
- `marker_reports` - 举报记录
- `marker_translations` - 多语言翻译
- `reputation_profiles` - 用户声誉档案
- `reputation_events` - 声誉变更日志
- `sponsors` - 赞助商信息
- `sponsor_campaigns` - 广告活动
- `sponsor_impressions` - 曝光记录
- `sponsor_events` - 交互事件
- `governance_escalations` - 治理升级
- `submission_limits` - 限流记录

### 1.2 技术债务与限制

**当前架构的问题**:
1. **可扩展性**: SQLite 不适合高并发写入
2. **部署复杂度**: Go 二进制 + 静态文件混合部署
3. **前端体验**: 原生 JS 缺乏组件化、状态管理
4. **开发效率**: Go 后端与 MVP 计划的 Node.js 生态不匹配
5. **团队技能**: MVP 计划假设 Node.js + React 技术栈

---

## 2. 目标架构

### 2.1 技术栈选型

```
后端:
  - Runtime: Node.js 20+ LTS
  - Framework: Express.js 4.x
  - Language: TypeScript 5.x
  - ORM: Prisma 5.x
  - Database: PostgreSQL 15+
  - Validation: Zod
  - Auth: JWT (future)

前端:
  - Framework: React 18+
  - Language: TypeScript 5.x
  - Build: Vite 5.x
  - State: Zustand / React Query
  - UI: Tailwind CSS + shadcn/ui
  - Maps: Leaflet.js / Mapbox GL
  - i18n: react-i18next

基础设施:
  - 容器化: Docker + Docker Compose
  - 反向代理: Nginx
  - 监控: (待定)
  - 日志: Winston / Pino
```

### 2.2 架构原则

1. **前后端分离**: API 优先设计，前端独立部署
2. **类型安全**: 全栈 TypeScript，Prisma 生成类型
3. **渐进迁移**: 支持并行运行旧系统（如需要）
4. **数据完整性**: 保留所有现有数据和业务逻辑
5. **API 兼容性**: 尽量保持 API 契约不变（降低前端改动）

---

## 3. 迁移策略

### 3.1 迁移方式选择

**方案 A: 大爆炸式重写（推荐）**
- 新建独立代码库，完整重写
- 一次性切换，停机迁移数据
- 优点: 干净、无历史包袱
- 缺点: 风险高、停机时间长

**方案 B: 渐进式迁移**
- 新旧系统并行运行
- 逐模块迁移，双写数据
- 优点: 风险低、可回滚
- 缺点: 复杂度高、周期长

**选择**: 方案 A（项目处于早期，用户量小，可承受短暂停机）

### 3.2 数据迁移计划

**迁移工具**: 自定义 Node.js 脚本

**步骤**:
1. 导出 SQLite 数据为 JSON
2. 转换数据格式（字段映射、类型转换）
3. 导入 PostgreSQL
4. 验证数据完整性（行数、关键字段）
5. 生成迁移报告

**关键映射**:
```typescript
// SQLite → PostgreSQL 类型映射
INTEGER → SERIAL / BIGSERIAL
REAL → DOUBLE PRECISION
TEXT → VARCHAR / TEXT
DATETIME → TIMESTAMP WITH TIME ZONE
```

---

## 4. 详细实施阶段

### Phase 0: 准备阶段（Week 1）

**目标**: 环境搭建、技术验证

**任务清单**:
- [ ] 创建新代码仓库（或分支 `rewrite-nodejs`）
- [ ] 初始化 Node.js + TypeScript 项目
- [ ] 配置 ESLint + Prettier + Husky
- [ ] 搭建 PostgreSQL 开发环境（Docker）
- [ ] 设计 Prisma Schema（基于现有 SQLite schema）
- [ ] 编写数据迁移脚本（SQLite → PostgreSQL）
- [ ] 技术选型最终确认（UI 库、状态管理）

**交付物**:
- `package.json` 配置完成
- `prisma/schema.prisma` 初版
- `scripts/migrate-data.ts` 迁移脚本
- `docker-compose.yml` 本地开发环境

---

### Phase 1: 后端核心（Week 2-4）

**目标**: 实现 API 层和数据访问层

#### 1.1 数据库层（Week 2）
- [ ] 完成 Prisma Schema 定义（12 张表）
- [ ] 生成 Prisma Client
- [ ] 编写 Seed 脚本（测试数据）
- [ ] 实现数据库连接池配置
- [ ] 添加数据库迁移版本控制

#### 1.2 API 基础设施（Week 2）
- [ ] Express 服务器初始化
- [ ] 中间件配置（CORS、body-parser、helmet）
- [ ] 错误处理中间件
- [ ] 请求日志（Winston/Pino）
- [ ] 健康检查端点 `/api/health`
- [ ] 配置管理（环境变量、dotenv）

#### 1.3 核心 API 实现（Week 3-4）

**优先级 P0（必须）**:
- [ ] `GET /api/markers` - 列表查询（地理范围、分类过滤）
- [ ] `POST /api/markers/submit` - 提交标记
- [ ] `GET /api/markers/:id` - 标记详情
- [ ] `POST /api/markers/:id/feedback` - 提交反馈
- [ ] `GET /api/markers/:id/feedback-summary` - 反馈汇总
- [ ] `GET /api/me/reputation` - 用户声誉
- [ ] `GET /api/me/activity` - 用户活动
- [ ] `GET /api/config` - 前端配置

**优先级 P1（重要）**:
- [ ] `POST /api/markers/:id/report` - 举报标记
- [ ] `POST /api/markers/:id/escalate` - 升级治理
- [ ] `GET /api/sponsors/nearby` - 附近赞助商
- [ ] `POST /api/sponsors/events` - 赞助商事件追踪

**优先级 P2（次要）**:
- [ ] 管理后台 API（`/api/admin/*`）
- [ ] 翻译管理 API

#### 1.4 业务逻辑迁移（Week 4）
- [ ] 共识算法（consensus status 计算）
- [ ] 声誉系统（trust score 计算）
- [ ] 限流机制（rate limiting）
- [ ] 地理位置隐私（坐标脱敏）
- [ ] 文件上传处理（图片压缩、缩略图）

**交付物**:
- 完整的 REST API（Postman/OpenAPI 文档）
- 单元测试覆盖率 >60%
- API 性能基准测试报告

---

### Phase 2: 前端基础（Week 5-6）

**目标**: 搭建 React 应用骨架

#### 2.1 项目初始化（Week 5）
- [ ] Vite + React + TypeScript 脚手架
- [ ] 配置 Tailwind CSS + shadcn/ui
- [ ] 路由配置（React Router）
- [ ] 状态管理选型与配置（Zustand/React Query）
- [ ] API 客户端封装（Axios + 类型定义）
- [ ] 国际化配置（react-i18next）

#### 2.2 核心组件库（Week 5-6）
- [ ] 地图组件（Leaflet 集成）
- [ ] 标记卡片组件（MarkerCard）
- [ ] 表单组件（MarkerForm）
- [ ] 反馈按钮组（FeedbackActions）
- [ ] 加载状态组件（Skeleton）
- [ ] 错误边界（ErrorBoundary）

#### 2.3 布局与导航（Week 6）
- [ ] 主布局（Header + Map + Sidebar）
- [ ] 移动端适配（响应式设计）
- [ ] 底部导航栏（移动端）
- [ ] 侧边栏抽屉（标记列表）

**交付物**:
- 可运行的前端开发环境
- Storybook 组件文档（可选）
- 设计系统基础（颜色、字体、间距）

---

### Phase 3: 核心功能实现（Week 7-9）

**目标**: 实现用户核心流程

#### 3.1 地图浏览（Week 7）
- [ ] 地图初始化（默认位置、缩放）
- [ ] 标记渲染（聚类、图标）
- [ ] 标记点击（显示详情）
- [ ] 地图移动（动态加载标记）
- [ ] 分类筛选（风险/帮助）
- [ ] 搜索功能（地址搜索）

#### 3.2 标记提交（Week 7）
- [ ] 提交表单（分类、标题、描述、位置）
- [ ] 地图选点（拖拽定位）
- [ ] 图片上传（预览、压缩）
- [ ] 表单验证（Zod schema）
- [ ] 提交成功反馈
- [ ] 限流提示

#### 3.3 社区反馈（Week 8）
- [ ] 反馈按钮组（8 种动作）
- [ ] 反馈提交（带备注）
- [ ] 实时更新共识状态
- [ ] 反馈历史展示
- [ ] 地理位置验证（proximity score）

#### 3.4 用户中心（Week 8）
- [ ] 声誉展示（分数、等级、徽章）
- [ ] 提交历史（我的标记）
- [ ] 活动时间线（反馈、事件）
- [ ] 统计图表（24h/7d 活动）

#### 3.5 赞助商展示（Week 9）
- [ ] 赞助商卡片（地图上）
- [ ] 赞助商详情页
- [ ] 事件追踪（曝光、点击）
- [ ] 联系方式展示

**交付物**:
- 完整的用户流程（浏览 → 提交 → 反馈 → 查看声誉）
- E2E 测试（Playwright/Cypress）
- 用户验收测试（UAT）清单

---

### Phase 4: 管理后台（Week 10）

**目标**: 实现内容审核功能

#### 4.1 管理界面（Week 10）
- [ ] 管理员登录（Token 认证）
- [ ] 待审核列表（分页、筛选）
- [ ] 标记详情（完整信息）
- [ ] 审核操作（批准、拒绝、隐藏）
- [ ] 翻译管理（添加/编辑翻译）
- [ ] 赞助商管理（CRUD）
- [ ] 活动管理（CRUD）

**交付物**:
- 管理后台完整功能
- 操作日志记录

---

### Phase 5: 数据迁移与测试（Week 11）

**目标**: 迁移生产数据，全面测试

#### 5.1 数据迁移（Week 11）
- [ ] 执行数据迁移脚本
- [ ] 验证数据完整性（自动化脚本）
- [ ] 生成迁移报告（成功/失败记录）
- [ ] 备份原始 SQLite 数据库

#### 5.2 集成测试（Week 11）
- [ ] API 集成测试（所有端点）
- [ ] 前端 E2E 测试（关键流程）
- [ ] 性能测试（负载测试）
- [ ] 安全测试（SQL 注入、XSS）
- [ ] 浏览器兼容性测试

#### 5.3 用户验收测试（Week 11）
- [ ] 内部测试（团队成员）
- [ ] Beta 测试（小范围用户）
- [ ] 收集反馈并修复 Bug

**交付物**:
- 测试报告（通过率、Bug 列表）
- 性能基准报告
- 数据迁移报告

---

### Phase 6: 部署与上线（Week 12）

**目标**: 生产环境部署

#### 6.1 部署准备（Week 12）
- [ ] 生产环境配置（环境变量）
- [ ] Docker 镜像构建（前端 + 后端）
- [ ] Nginx 配置（反向代理、静态文件）
- [ ] PostgreSQL 生产配置（连接池、备份）
- [ ] SSL 证书配置
- [ ] 监控告警配置（可选）

#### 6.2 上线流程（Week 12）
- [ ] 停机公告（提前通知用户）
- [ ] 备份旧系统数据
- [ ] 部署新系统
- [ ] 执行数据迁移
- [ ] 冒烟测试（生产环境）
- [ ] 开放访问
- [ ] 监控系统稳定性（24h）

#### 6.3 回滚计划（Week 12）
- [ ] 准备回滚脚本
- [ ] 保留旧系统部署（7 天）
- [ ] 数据回滚方案（如需要）

**交付物**:
- 生产环境运行的新系统
- 部署文档
- 运维手册

---

## 5. 风险管理

### 5.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 数据迁移失败 | 高 | 中 | 多次预演、完整备份、回滚计划 |
| 性能下降 | 中 | 中 | 性能测试、数据库索引优化 |
| API 不兼容 | 中 | 低 | 保持 API 契约、版本控制 |
| 业务逻辑遗漏 | 高 | 中 | 详细代码审查、对比测试 |
| 第三方库问题 | 低 | 低 | 选择成熟库、锁定版本 |

### 5.2 项目风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 时间超期 | 中 | 高 | 分阶段交付、砍掉非核心功能 |
| 需求变更 | 中 | 中 | 冻结需求、变更控制流程 |
| 人员变动 | 高 | 低 | 文档完善、知识分享 |
| 用户流失 | 高 | 低 | 停机时间最小化、提前沟通 |

### 5.3 回滚策略

**触发条件**:
- 关键功能不可用 >2 小时
- 数据丢失或损坏
- 性能下降 >50%
- 安全漏洞

**回滚步骤**:
1. 停止新系统
2. 恢复旧系统部署
3. 回滚数据库（如有双写）
4. 验证旧系统正常
5. 分析失败原因

---

## 6. 成功标准

### 6.1 功能完整性
- [ ] 所有现有功能在新系统中可用
- [ ] API 响应格式与旧系统一致（或向后兼容）
- [ ] 数据迁移 100% 成功（0 数据丢失）

### 6.2 性能指标
- [ ] API 响应时间 P95 < 500ms
- [ ] 首屏加载时间 < 3s
- [ ] 地图标记渲染 < 1s（1000 个点）
- [ ] 并发支持 100+ 用户

### 6.3 质量指标
- [ ] 后端单元测试覆盖率 >60%
- [ ] 前端组件测试覆盖率 >50%
- [ ] E2E 测试覆盖核心流程
- [ ] 0 个 P0/P1 级别 Bug

### 6.4 用户体验
- [ ] 移动端适配完成
- [ ] 支持 3 种语言（中文、英文、印地语）
- [ ] 无障碍访问（WCAG 2.1 AA 级）
- [ ] 用户满意度 >80%（如有调研）

---

## 7. 资源需求

### 7.1 人力资源

**最小团队配置**:
- 全栈工程师 x 1（后端 + 前端）
- 前端工程师 x 1（可选，加速开发）
- 测试工程师 x 0.5（兼职，UAT 阶段）

**时间投入**:
- 全职开发: 8-12 周
- 兼职开发: 16-24 周

### 7.2 基础设施

**开发环境**:
- 本地开发机（Docker 支持）
- PostgreSQL 开发实例

**生产环境**:
- 云服务器（2 核 4GB 起步）
- PostgreSQL 数据库（独立实例）
- 对象存储（图片/视频）
- CDN（可选）

**预算估算**:
- 云服务器: $20-50/月
- 数据库: $15-30/月
- 对象存储: $5-10/月
- 域名 + SSL: $10-20/年

---

## 8. 里程碑与检查点

### 里程碑时间线

```
Week 1  ████ Phase 0: 准备阶段
Week 2  ████ Phase 1.1-1.2: 数据库 + API 基础
Week 3  ████ Phase 1.3: 核心 API (P0)
Week 4  ████ Phase 1.3-1.4: API (P1) + 业务逻辑
Week 5  ████ Phase 2.1-2.2: 前端初始化 + 组件库
Week 6  ████ Phase 2.3: 布局与导航
Week 7  ████ Phase 3.1-3.2: 地图浏览 + 标记提交
Week 8  ████ Phase 3.3-3.4: 社区反馈 + 用户中心
Week 9  ████ Phase 3.5: 赞助商展示
Week 10 ████ Phase 4: 管理后台
Week 11 ████ Phase 5: 数据迁移 + 测试
Week 12 ████ Phase 6: 部署上线
```

### 关键检查点

**Week 4 检查点**: 后端 API 完成度
- 必须: 所有 P0 API 可用
- 必须: 数据库 Schema 稳定
- 可选: P1 API 部分完成

**Week 6 检查点**: 前端基础完成度
- 必须: 组件库可用
- 必须: 路由和状态管理就绪
- 可选: 设计系统完善

**Week 9 检查点**: 核心功能完成度
- 必须: 用户核心流程可用（浏览 → 提交 → 反馈）
- 必须: 移动端适配完成
- 可选: 管理后台部分完成

**Week 11 检查点**: 上线准备度
- 必须: 所有测试通过
- 必须: 数据迁移成功
- 必须: 部署文档完成

---

## 9. 后续优化（Post-Launch）

### 9.1 技术优化
- [ ] 添加 Redis 缓存（热点数据）
- [ ] 实现 WebSocket（实时更新）
- [ ] 优化数据库查询（慢查询分析）
- [ ] 添加全文搜索（Elasticsearch）
- [ ] 实现 CDN 加速

### 9.2 功能增强
- [ ] 用户认证系统（JWT + OAuth）
- [ ] 消息通知（邮件、推送）
- [ ] 数据分析仪表板
- [ ] 移动端 App（React Native）
- [ ] 社交分享功能

### 9.3 运维完善
- [ ] 监控告警（Prometheus + Grafana）
- [ ] 日志聚合（ELK Stack）
- [ ] 自动化部署（CI/CD）
- [ ] 数据库备份策略
- [ ] 灾难恢复计划

---

## 10. 附录

### 10.1 技术选型对比

**后端框架**:
| 框架 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| Express | 成熟、生态丰富 | 需要手动配置 | ✅ |
| Fastify | 性能高 | 生态较小 | ❌ |
| NestJS | 结构化、TypeScript 原生 | 学习曲线陡 | ❌ |

**ORM**:
| ORM | 优点 | 缺点 | 选择 |
|-----|------|------|------|
| Prisma | 类型安全、迁移工具 | 性能略低 | ✅ |
| TypeORM | 功能全面 | 类型支持弱 | ❌ |
| Sequelize | 成熟 | 非 TypeScript 原生 | ❌ |

**前端状态管理**:
| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| Zustand | 轻量、简单 | 功能有限 | ✅ |
| Redux Toolkit | 功能强大 | 样板代码多 | ❌ |
| React Query | 服务端状态管理 | 需配合其他方案 | ✅ (配合 Zustand) |

### 10.2 数据库 Schema 对比

**关键变更**:
```sql
-- SQLite (旧)
id INTEGER PRIMARY KEY AUTOINCREMENT
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

-- PostgreSQL (新)
id BIGSERIAL PRIMARY KEY
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
```

**新增字段**（可选）:
- `markers.deleted_at` - 软删除支持
- `markers.version` - 乐观锁
- `users.id` - 用户表（未来）

### 10.3 API 契约示例

**GET /api/markers**
```typescript
// Request
GET /api/markers?lat=39.9&lng=116.4&radius=5000&types=abuse,poison&limit=50

// Response
{
  "data": [
    {
      "id": 1,
      "category": "abuse",
      "title": "虐待动物举报",
      "latitude": 39.9042,
      "longitude": 116.4074,
      "address": "北京市朝阳区",
      "description": "...",
      "consensus_status": "verified",
      "confidence_score": 0.85,
      "created_at": "2024-01-15T08:30:00Z"
    }
  ],
  "next_cursor": null
}
```

### 10.4 参考文档

**内部文档**:
- [DESIGN.md](DESIGN.md) - 系统设计文档
- [docs/mvp-implementation-plan.md](docs/mvp-implementation-plan.md) - MVP 实施计划
- [docs/api-contract.md](docs/api-contract.md) - API 契约
- [docs/community-governance-architecture.md](docs/community-governance-architecture.md) - 社区治理架构

**外部资源**:
- [Prisma 文档](https://www.prisma.io/docs)
- [React 文档](https://react.dev)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

## 更新日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2024-01-XX | 1.0 | 初始版本 | - |

---

**文档状态**: 🟡 草稿  
**最后更新**: 2024-01-XX  
**负责人**: [待定]  
**审核人**: [待定]
