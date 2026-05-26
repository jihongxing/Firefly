# Firefly Documentation

Firefly（萤火网络）是一个基于地理位置（LBS）的流浪动物互助看板，面向风险预警与救助协作两类核心场景。

## 文档目录

- [产品需求文档（PRD）](D:/codeSpace/Firefly/docs/product-prd.md)
- [技术方案](D:/codeSpace/Firefly/docs/technical-architecture.md)
- [API 契约](D:/codeSpace/Firefly/docs/api-contract.md)
- [SQLite 初始化 SQL](D:/codeSpace/Firefly/docs/sqlite-init.sql)
- [国际化方案](D:/codeSpace/Firefly/docs/internationalization.md)
- [社区共识治理 PRD](D:/codeSpace/Firefly/docs/community-governance-prd.md)
- [社区共识治理技术方案](D:/codeSpace/Firefly/docs/community-governance-architecture.md)
- [社区治理接口变更清单](D:/codeSpace/Firefly/docs/community-governance-api-migration.md)
- [SQLite 社区治理迁移脚本](D:/codeSpace/Firefly/docs/sqlite-migrate-community-governance.sql)
- [赞助补给位 PRD](D:/codeSpace/Firefly/docs/SPONSOR_PRD.md)
- [赞助套餐与定价表](D:/codeSpace/Firefly/docs/sponsor-pricing.md)
- [赞助投放规则与地图展示规范](D:/codeSpace/Firefly/docs/sponsor-delivery-spec.md)
- [赞助位技术设计与接口建议](D:/codeSpace/Firefly/docs/sponsor-technical-design.md)
- [赞助位 SQLite 初始化脚本](D:/codeSpace/Firefly/docs/sponsor-sql-init.sql)
- [赞助位接口变更清单](D:/codeSpace/Firefly/docs/sponsor-api-migration.md)
- [赞助位前端交互规范](D:/codeSpace/Firefly/docs/sponsor-frontend-interactions.md)
- [赞助位调度伪代码](D:/codeSpace/Firefly/docs/sponsor-scheduling-pseudocode.md)

## 项目目标

Firefly 试图把两类信息放到同一张地图上：

1. 风险预警：帮助周边用户快速识别疑似投毒、虐待、偷盗、捕兽夹等风险点。
2. 爱心互助：帮助救助站、友好医院、粮仓和志愿者被更快发现与连接。

## 设计原则

- 双轨信息：风险与救助并存，但视觉和权限策略分离。
- 隐私优先：优先保护救助者、线索提供者与被救助对象。
- 谨慎公开：公开信息以“可行动”与“不过度暴露”为边界。
- 轻量可用：优先采用简单、稳定、低维护的技术栈。
- 合规运营：保留审核、举报、隐藏、申诉与证据管理能力。

## 当前文档范围

当前文档覆盖：

- 产品定位与核心用户流程
- 信息架构与页面设计
- 数据模型与接口设计
- 地图渲染、隐私保护与审核机制
- 部署与运维建议

后续可继续补充：

- UI 线框图
- 后台审核台 PRD
- 数据迁移与发布手册
