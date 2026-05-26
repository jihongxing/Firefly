# Changelog

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
