# Firefly 国际化方案

版本：v1.0  
更新时间：2026-05-26

## 1. 目标

Firefly 第一阶段国际化支持以下三种语言：

- `zh-CN`：简体中文
- `en`：English
- `hi`：Hindi

选择 `hi` 的原因是，按总使用人数口径，英语和中文之后，Hindi 长期处于全球最常用语言前列。本文档采用的参考口径来自 2024 年美国国际贸易委员会语言数据库论文与 2025 年塞万提斯学院语言报告。

## 2. 国际化范围

第一阶段覆盖两类内容：

1. 系统界面文案
2. 用户提交内容的原文语言标记与可选译文

不在第一阶段强制处理的内容：

- 自动机器翻译
- 多语言全文检索
- 后台多语言运营内容

## 3. 语言策略

### 3.1 默认语言

- 浏览器语言命中支持列表时，优先使用浏览器语言
- 未命中时默认使用 `zh-CN`

### 3.2 回退规则

推荐回退链：

- `zh-CN` -> `en`
- `hi` -> `en`
- `en` -> `zh-CN`

### 3.3 URL 与状态保存

前端建议同时支持：

- `?lang=zh-CN`
- `?lang=en`
- `?lang=hi`

并将用户选择持久化到：

- `localStorage.lang`

## 4. 前端实现建议

## 4.1 目录结构

```text
/locales
  zh-CN.json
  en.json
  hi.json
```

## 4.2 Key 设计原则

- 使用稳定语义 key，不直接把中文当 key
- 页面级分组
- 避免一个 key 拼接多段语句

示例：

```json
{
  "app.title": "Firefly",
  "map.filter.riskOnly": "只看风险预警",
  "map.filter.helpOnly": "只看爱心救助"
}
```

## 4.3 渲染接口

前端可实现一个极简翻译函数：

```js
function t(key, fallback = "") {
  return currentLocaleDict[key] ?? fallback || key;
}
```

## 4.4 动态内容显示规则

对于用户生成内容：

- 优先展示与当前语言一致的译文
- 无译文时展示原文
- 必要时显示“原文”标签

## 5. 数据模型建议

## 5.1 `markers` 主表

主表新增：

- `source_locale`：原始提交语言

## 5.2 `marker_translations` 译文表

译文表保存：

- `marker_id`
- `locale`
- `title`
- `description`
- `address`

约束建议：

- 每个点位每种语言最多一条译文
- 不允许与原文语言重复写入一份完全冗余的“译文”

## 6. API 约定

## 6.1 请求语言

接口支持两种语言输入方式：

1. `Accept-Language` 请求头
2. `lang` 查询参数

优先级建议：

`lang` > `Accept-Language` > 默认语言

## 6.2 响应语言

响应可返回：

- `locale`：本次响应使用的语言
- `source_locale`：该内容原文语言
- `is_translated`：当前字段是否为译文

## 7. 运营与审核

### 7.1 提交流程

- 用户提交时选择内容语言
- 后台审核员可补充人工译文
- 前台默认不要求用户自己填写多语言版本

### 7.2 风险内容处理

- 高风险内容不建议直接自动翻译后公开
- 涉及指控、地点和人物的文本应先经过审核

## 8. 第一阶段落地清单

- 增加三套 UI 文案资源：`zh-CN`、`en`、`hi`
- 增加语言切换入口
- `markers` 表新增 `source_locale`
- 新增 `marker_translations` 表
- API 支持 `lang` 和 `Accept-Language`

## 9. 后续迭代

- 机器翻译草稿
- 译文审核工作流
- 多语言搜索
- 城市与分类别名本地化
