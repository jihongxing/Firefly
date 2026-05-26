# Design System - Firefly

## Product Context

- **What this is:** Firefly（萤火网络）是一个基于地理位置的流浪动物互助看板，核心工作是把风险预警和救助协作放在同一张地图上。
- **Who it's for:** 流浪动物救助志愿者、社区喂养人、本地宠物主人、民间救助站运营者、友好医院与普通线索提供者。
- **Space/industry:** 公益救助、社区协作、地图工具、轻量 civic utility。
- **Project type:** 移动端优先的 PWA 工具，不是营销站，不做大段品牌叙事，第一屏就是可用地图。

## Product Principles

- **Map first:** 第一屏必须直接进入地图，不做落地页。
- **Two-track information:** 风险与救助必须并存，但视觉和权限策略严格分离。
- **Privacy before spectacle:** 爱心点位与联系人保护优先于“展示丰富”。
- **Action over decoration:** 每个视觉元素都服务于检索、判断、上报、联系。
- **Mobile urgency:** 设计以单手操作、快速浏览、低网速为前提。

## Aesthetic Direction

- **Direction:** Industrial utilitarian with humane warmth
- **Decoration level:** Intentional
- **Mood:** 像一个夜间可用的现场工具。冷静、克制、可信，不阴森，也不做过度温情化包装。风险信息有紧张感，救助信息有温度，但整体始终像一个办事工具。
- **Reference posture:** 更接近地图工具、调度工具、社区协作工具的气质，不接近公益宣传页，也不接近社交产品。

## Typography

- **Display/Hero:** `Plus Jakarta Sans` for Latin brand moments, paired with `Noto Sans SC` and `Noto Sans Devanagari` as locale-aware companions.
  - 理由：品牌标题需要一点张力，但不能浮夸。`Plus Jakarta Sans`干净、紧凑，和暗色工具界面兼容。中文与 Hindi 不强行共用拉丁字形，避免多语言时气质断裂。
- **Body:** `Source Sans 3`, fallback to `Noto Sans SC`, `Noto Sans Devanagari`, `sans-serif`.
  - 理由：正文、表单、卡片密度高，`Source Sans 3`在中小字号下可读性稳定，和地图工具风格贴得很紧。
- **UI/Labels:** 与 Body 同栈。
- **Data/Tables:** `IBM Plex Sans` with tabular numerals, fallback to locale Noto families.
  - 理由：后台审核、时间、距离、数量标签需要数字稳定，不跳。
- **Code:** `IBM Plex Mono`
- **Loading strategy:** 首选自托管字体文件。MVP 阶段可先用受信 CDN 加载 `Source Sans 3`、`Noto Sans SC`、`Noto Sans Devanagari`，再在后续版本切到本地静态资源。

### Locale Font Stacks

```css
:root {
  --font-ui: "Source Sans 3", "Noto Sans SC", "Noto Sans Devanagari", sans-serif;
  --font-display: "Plus Jakarta Sans", "Noto Sans SC", "Noto Sans Devanagari", sans-serif;
  --font-data: "IBM Plex Sans", "Noto Sans SC", "Noto Sans Devanagari", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
}

:lang(zh-CN) {
  --font-ui: "Noto Sans SC", "Source Sans 3", sans-serif;
  --font-display: "Noto Sans SC", "Plus Jakarta Sans", sans-serif;
  --font-data: "Noto Sans SC", "IBM Plex Sans", sans-serif;
}

:lang(hi) {
  --font-ui: "Noto Sans Devanagari", "Source Sans 3", sans-serif;
  --font-display: "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif;
  --font-data: "Noto Sans Devanagari", "IBM Plex Sans", sans-serif;
}
```

### Type Scale

- `display-lg`: 28px / 36px / 600
- `display-md`: 24px / 32px / 600
- `title-lg`: 20px / 28px / 600
- `title-md`: 18px / 24px / 600
- `body-lg`: 16px / 24px / 400
- `body-md`: 15px / 22px / 400
- `body-sm`: 13px / 18px / 400
- `label-md`: 13px / 16px / 600
- `label-sm`: 12px / 14px / 600
- `meta-xs`: 11px / 14px / 500

### Typographic Rules

- 地图页标题不用 hero 级大字，控制在 `title-lg` 或以下。
- 中文字重优先 400 / 500 / 600，不滥用粗黑体。
- 不使用负字距。
- 按钮内文默认单行，放不下就扩容，不压缩到难读。

## Color

- **Approach:** Balanced
- **Primary:** `#FF6B57`
  - 代表爱心协作、主动行动、站内联系、主要 CTA。
- **Secondary:** `#D58B2A`
  - 代表风险预警、警惕、现场提示、风险筛选。
- **Accent Support:** `#FF9AA8`
  - 只用于爱心类辅助高亮，如心形点位、轻提示，不可取代主色。

### Neutrals

- `#0D1117` app background
- `#151B23` map UI chrome
- `#1D2632` elevated panel
- `#273241` input and control surface
- `#435064` borders and dividers
- `#8C98A8` muted text
- `#D8DEE7` main text on dark
- `#F4F7FA` high-contrast text and light-mode surface

### Semantic Colors

- `success`: `#4CB782`
- `warning`: `#D58B2A`
- `error`: `#E45757`
- `info`: `#4C8BF5`

### Category Mapping

- 风险类 marker、badge、筛选高亮使用 amber family。
- 爱心类 marker、badge、主行动按钮使用 coral/red family。
- 举报、隐藏、危险确认使用 `error`，不要偷用爱心主色。
- 地图底图不做彩色渲染，必须让点位颜色成为第一信息层。

### Dark Mode

- 默认就是 dark-first 设计，不是 light mode 的翻转版。
- 地图页背景保持深色，控件与底部卡片使用 1 到 2 级更亮的深灰面。
- 彩色只在需要用户判断和行动时出现，不能整屏泛红泛橙。

### Light Mode

- 只作为后续版本可选能力，不是 MVP 必做项。
- 若实现 light mode，保留相同风险/爱心语义，不改色义。

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable-compact
- **Scale:** 2(2px), 4(4px), 8(8px), 12(12px), 16(16px), 20(20px), 24(24px), 32(32px), 40(40px), 48(48px), 64(64px)

### Spacing Rules

- 地图页横向内边距优先 12px 或 16px。
- 表单字段间距 12px，分组间距 20px 到 24px。
- 底部卡片内容块上下间距不低于 16px。
- 不允许出现“到处都是 24px 大留白”的假高级感，这个产品需要信息密度。

## Layout

- **Approach:** Grid-disciplined
- **Grid:** mobile 4 columns, tablet 8 columns, desktop 12 columns
- **Max content width:** 1200px for desktop shells, 480px ideal readable width for mobile-centered forms
- **Border radius:** 4px / 8px / 12px / 999px

### Layout Rules

- 首页地图全屏铺满，顶部控件和底部 sheet 浮于地图之上。
- 不做浮夸的悬浮大卡片堆叠。一个层级解决一个问题。
- 页面 section 不套大圆角外框。
- 桌面端如果存在侧栏，侧栏应服务筛选、详情或审核，不做空洞导航。

## Motion

- **Approach:** Minimal-functional
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`
- **Duration:** micro 80ms, short 160ms, medium 240ms, long 360ms

### Motion Rules

- 地图拖拽、定位、图层切换保持顺滑，但不做花哨进场。
- Bottom sheet 只做必要的上滑、收起、层级切换动画。
- Marker pulse 仅用于新事件或定位状态，不能常驻闪烁。

## Iconography

- 使用线性 icon 为主，配合少量实心状态 icon。
- 图标风格统一，优先 Lucide 一类清晰、克制的图标库。
- 风险类使用 triangle-alert、shield-alert 一类图标。
- 爱心类使用 heart-handshake、map-pinned、hospital 一类图标。
- 按钮优先 icon + text，纯文字按钮只用于次级操作。

## Core Surfaces

### 1. Map Home

- 地图必须是第一视觉层。
- 顶部包含品牌、搜索、语言切换、定位按钮。
- 筛选器用 segmented control 或 chip toggle，不用大按钮。
- 底部 sheet 默认半展开，露出最近两类信息摘要。

### 2. Submission Type Selector

- 两个主入口必须一眼区分风险与爱心。
- 风险入口更克制、更硬朗。
- 爱心入口更暖，但仍是工具面，不做粉色社交卡。

### 3. Submission Form

- 单列表单。
- 先选类别，再填地点，再填描述，再传媒体，再处理联系方式与可见性。
- 风险类匿名说明与爱心类隐私说明都要前置，不藏在角落。

### 4. Marker Detail

- 标题、类别、距离、可信度放在首屏。
- 爱心类详情使用模糊区域图而不是精确 pin。
- 主按钮是“站内联系”或“继续上报”，不是分享。

### 5. Admin Review

- 审核台可以更密、更冷静。
- 用表格、筛选栏、证据预览、状态标签，不用 marketing 式大卡片。

## Components

### Buttons

- Primary button: filled coral, white text, min height 44px
- Secondary button: dark surface with border
- Danger button: red family, only for destructive review actions
- Ghost button: text + icon, no filled background

### Chips and Filters

- 高度 32px 到 36px
- 选中态通过边框、底色、图标一起表达
- 风险 chip 和爱心 chip 各自保留语义色

### Cards

- 单卡只承载一个任务块
- 圆角不超过 8px，特殊底部 sheet 可到 12px
- 深色卡片必须有明确边界，避免糊成一片

### Inputs

- 高度 44px
- 深色输入面 `#273241`
- 焦点边框用 `info` 蓝或主色细边，不用重发光
- 多语言字段标签要预留更长文案宽度

### Bottom Sheet

- 三态：collapsed / half / full
- 顶部必须有拖拽指示
- full 态内滚动，地图不跟着乱动

### Badges

- 风险 badge: dark amber background + amber text
- 爱心 badge: muted coral background + coral text
- 审核状态 badge: 使用 semantic colors，不与业务色混淆

## Map Design Rules

- 使用低饱和深色底图，街道细线与水域层次轻，不抢 marker。
- 风险点图标略小、更尖锐。
- 爱心点图标可略大，并允许心形辅助识别。
- 当前定位点用冷蓝，不抢业务主色。
- 聚合点 cluster 需要按风险/爱心分别配色，不做默认蓝点。

## Content Design

- UI 文案短、直接、可执行。
- 风险类内容避免煽动性语言，保持事实陈述。
- 爱心类内容避免“募捐页”语气，强调可提供什么帮助。
- 隐私提示要明确，例如“仅显示大致范围”“联系方式仅站内可见”。

## Internationalization

- 首期必须支持 `zh-CN`、`en`、`hi`。
- 顶部语言切换器放在首页可见位置，但不抢主任务。
- 不允许把中文排版宽度直接硬套到英文或 Hindi。
- 所有关键按钮、分类标签、错误提示都必须以 locale key 渲染。
- 长文本布局以英文为基线验证，以 Hindi 为高度验证，以中文为密度验证。

## Accessibility

- 正文与背景对比度至少满足 WCAG AA。
- 交互控件最小点击区 44x44px。
- 颜色不是唯一信号，风险与爱心必须同时有图标和文案区分。
- 地图外的关键信息必须可以列表方式重复呈现，不能只藏在点位上。

## States

- Empty: 告诉用户“附近暂无公开点位”，并给出提交入口。
- Loading: 使用骨架屏或简洁 spinner，不遮住整张地图太久。
- Error: 顶部 toast + 页内重试按钮。
- Pending review: 用低对比标签提示“审核中”，不要误导为已公开。
- Hidden/reporting: 前台不暴露后台原因细节，只给结果状态。

## Anti-Patterns

- 不做 landing page hero
- 不做紫色渐变
- 不做大面积玻璃拟态
- 不做圆滚滚社交 App 风格
- 不做 icon in colored circle 的三栏功能介绍
- 不做地图上堆满说明文字的海报式界面
- 不用高饱和红填满整屏，风险感会变廉价

## Implementation Notes

- 首页先做移动端 390px 宽基准稿，再扩到平板和桌面。
- 视觉 token 建议后续抽到 `:root` CSS variables。
- 分类色、状态色、字体栈、圆角和间距都必须 token 化，不能写死在页面局部。
- 任何新页面上线前，先问一句：这是工具在帮用户更快完成动作，还是只是在“看起来像个产品”。

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-26 | 采用 dark-first、map-first 的工具型设计方向 | 产品第一任务是快速发现风险与协作资源，地图不能退居二线 |
| 2026-05-26 | 风险使用 amber family，爱心使用 coral/red family | 需要清晰区分两类业务语义，同时避免做成廉价警报站 |
| 2026-05-26 | 采用 locale-aware 字体栈 | 项目首期就支持中文、英文、Hindi，不能靠单一拉丁字体硬撑 |
| 2026-05-26 | 使用小圆角、高信息密度、弱装饰的 PWA 样式 | 这个产品更像现场工具，不像宣传页或社区社交 App |
