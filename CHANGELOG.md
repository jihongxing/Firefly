# Changelog

## 2026-06-10 - v1.0.0

### Added

- 新增 PWA 发布能力：manifest、service worker、桌面/主屏安装入口和安装状态识别。
- 新增发布级 Prisma 迁移目录，覆盖提交人记录、举报原因归并和社区投票治理数据结构。
- 新增后端 ESLint 配置，把后端 lint 纳入发布门禁。

### Changed

- 前端版本从 `0.0.0` 提升到 `1.0.0`，与后端首个生产版本对齐。
- 地图首页改为用户主动点击后再请求定位，避免首屏自动触发浏览器权限提示。
- 前端路由改为懒加载，并内置项目级 Leaflet 样式，降低首屏 JS 体积并移除构建期资源路径警告。
- 删除空的旧版 `/api/users` 路由挂载，避免遮挡新的用户资料与标记管理接口。

### Fixed

- 修复前端多处 hook 顺序、类型和 lint 问题，发布前 `npm run lint` 可稳定通过。
- 修复举报治理、社区投票、用户积分和个人资料页的类型契约不一致问题。
- 移除登录页调试日志，避免生产环境暴露无用控制台输出。

### Verified

- `frontend npm run lint`
- `frontend npm run build`
- `frontend npm audit --audit-level=high`
- `backend npm run lint`
- `backend npm run build`
- `backend npm test -- --runInBand`
- `backend npm audit --audit-level=high`
- `backend npx prisma validate`
- `backend npx prisma migrate status`
- Production preview smoke test: backend health/config/markers API, frontend preview, map rendering, service worker, PWA install prompt, browser console.

## 2026-05-27

### Added

- 完整的赞助商业化 MVP，包括地图侧 sponsor 展示、曝光事件上报和赞助层筛选。
- 赞助运营台，支持赞助商主档、投放计划、履约计数的查看与编辑。
- 赞助运营台移动端分段视图，在小屏下拆分为“列表 / 编辑”两种工作模式。
- 可重复执行的浏览器端到端回归脚本：`scripts/sponsor-admin-e2e.mjs`。

### Changed

- `admin.html` 从社区治理观测台切换为赞助运营台。
- 赞助商后台初始化逻辑改为兼容动态脚本注入，避免数据面板空载。
- `Sponsor.BrandKey` 接口契约已恢复为正常 JSON 字段，可在后台真实读写。

### Lifecycle

- 新增赞助商归档 / 永久删除动作。
- 新增投放计划归档 / 永久删除动作。
- 归档赞助商时会自动结束关联投放。
- 永久删除要求记录先归档，再执行不可恢复删除。

### Verified

- `go test ./...`
- `go build -o firefly.exe .`
- `node --check public/admin.js`
- `node --check scripts/sponsor-admin-e2e.mjs`
- `node scripts/sponsor-admin-e2e.mjs`
