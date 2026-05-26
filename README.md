# Firefly

Firefly（萤火网络）是一个基于地理位置的流浪动物风险预警与救助协作看板。

当前仓库已包含一个可运行的 MVP：

- 移动端优先的 PWA 前端
- Go 单二进制后端
- SQLite 本地数据库
- 地图首页、筛选、详情、匿名提交
- 社区共识治理：结构化反馈、信誉分、状态流转、升级复核
- 赞助运营台：赞助商主档、投放计划、履约计数、归档与删除
- 中文 / English / Hindi 三语界面资源

## Stack

- Frontend: HTML, CSS, Vanilla JavaScript, Leaflet
- Backend: Go 1.25
- Database: SQLite

## Run

```bash
go run .
```

默认启动地址：

- 前台：`http://127.0.0.1:8080/`
- 赞助运营台：`http://127.0.0.1:8080/admin.html?token=firefly-dev-admin`

## Sponsor Admin Regression

仓库内置了一条可重复执行的赞助运营台端到端回归脚本：

```bash
node scripts/sponsor-admin-e2e.mjs
```

默认会连接：

- `FIREFLY_BASE_URL=http://127.0.0.1:8080`
- `FIREFLY_ADMIN_TOKEN=firefly-dev-admin`
- `PLAYWRIGHT_EDGE_PATH=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`
- `PLAYWRIGHT_CORE_ENTRY=./.tmp-playwright/node_modules/playwright-core/index.mjs`（默认自动使用仓库内这份）

该脚本会执行一整条真实后台流：

- 新建赞助商
- 更新赞助商
- 新建投放计划
- 更新投放计划
- 归档投放
- 删除投放
- 归档赞助商
- 删除赞助商

## Sponsor Admin

当前后台页已经切换为赞助运营台，覆盖这些运营动作：

- 赞助商筛选、创建、编辑
- 投放计划筛选、创建、编辑
- 履约计数查看
- 赞助商归档 / 永久删除
- 投放计划归档 / 永久删除

设计上默认优先使用“归档”进行软下线：

- 归档赞助商会同步结束关联投放
- 永久删除仅用于已归档记录
- 永久删除会级联清理关联投放与履约数据

## Default Admin Token

本地开发默认管理 token 仍然保留，用于兼容旧的后台接口与译文入口：

```text
firefly-dev-admin
```

可在审核台页面直接输入，也可以通过环境变量覆盖。

## Environment Variables

- `FIREFLY_PORT`，默认 `8080`
- `FIREFLY_DB_PATH`，默认 `data/firefly.db`
- `FIREFLY_UPLOAD_DIR`，默认 `uploads`
- `FIREFLY_ADMIN_TOKEN`，默认 `firefly-dev-admin`

## Implemented API

- `GET /api/health`
- `GET /api/config`
- `GET /api/markers`
- `GET /api/markers/{id}`
- `POST /api/markers/submit`
- `POST /api/markers/{id}/feedback`
- `GET /api/markers/{id}/feedback-summary`
- `GET /api/me/reputation`
- `GET /api/me/activity`
- `POST /api/markers/{id}/escalate`
- `POST /api/markers/{id}/report`
- `GET /api/admin/markers`
- `POST /api/admin/markers/{id}/review`
- `POST /api/admin/markers/{id}/hide`
- `POST /api/admin/markers/{id}/restore`
- `POST /api/admin/markers/{id}/translations`
- `GET /api/sponsors/nearby`
- `POST /api/sponsors/events`
- `GET /api/admin/sponsors`
- `POST /api/admin/sponsors`
- `PATCH /api/admin/sponsors/{id}`
- `DELETE /api/admin/sponsors/{id}?mode=archive`
- `DELETE /api/admin/sponsors/{id}?mode=delete`
- `GET /api/admin/sponsor-campaigns`
- `POST /api/admin/sponsor-campaigns`
- `PATCH /api/admin/sponsor-campaigns/{id}`
- `DELETE /api/admin/sponsor-campaigns/{id}?mode=archive`
- `DELETE /api/admin/sponsor-campaigns/{id}?mode=delete`
- `GET /api/admin/sponsor-reports`

## Project Layout

```text
/internal/firefly   backend service, schema, store, handlers
/public             frontend PWA files
/locales            locale dictionaries
/docs               product, architecture, API and i18n docs
/DESIGN.md          design system source of truth
```

## Notes

- 首次启动会自动初始化数据库并写入一组示例点位。
- 旧数据库会在启动时自动迁移到社区共识治理 schema。
- 爱心类点位默认支持模糊坐标展示。
- 图片上传目录默认为 `uploads/`。
- `public/` 与 `locales/` 静态资源会嵌入 Go 二进制；修改它们后需要重新执行 `go build -o firefly.exe .`。
