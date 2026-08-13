# Bili Monitor 设计规范（design.md）

> 本文件是项目 UI 的唯一权威规范。任何 UI 改动（样式、组件、令牌）必须先对照本文件；
> 冲突时以本文件为准，并更新本文件。分级：**MUST**（硬约束，违反即缺陷）/ **SHOULD**（品味建议）。

---

## 1. 风格定位

**霓虹驾驶舱（Neon Cockpit）**：深色低亮底 + 克制的紫色品牌光晕 + 数字绝对主角；
B站内容卡片（SC/上舰/礼物）是唯一的彩虹区。面板长期挂机远观，信息优先于留白；
浅色主题是深色的 remap，不是重设计。

## 2. 设计令牌

### 2.1 色板（MUST，落地为 `globals.css` 的 `@theme` 令牌）

| 令牌 | 深色 | 浅色 | 用途 |
|---|---|---|---|
| `primary` | `#8b5cf6` | `#7c3aed` | 品牌主色、选中态、主按钮（沿用现有） |
| `money` | `#fbbf24` (amber-400) | `#b45309` (amber-700) | **唯一金额色**：营收/礼物金额/SC 金额 |
| `profit` | `#34d399` | `#059669` | 盈利、正向 delta、实时连接（emerald 族） |
| `loss` | `#f87171` | `#dc2626` | 亏损、负向 delta、破坏性 |
| `background` | `#09090b` | `#f4f4f6` | 页面底（沿用现有） |
| `card` | `#101014` | `#ffffff` | 卡片底（沿用现有） |
| `border` | `rgba(255,255,255,.08)` | `rgba(24,24,27,.10)` | 边框（沿用现有） |
| `chart-1..5` | `#8b5cf6 / #22d3ee / #34d399 / #fbbf24 / #f87171` | `#7c3aed / #0891b2 / #059669 / #b45309 / #dc2626` | 图表 5 色（紫主导、青对比） |

规则：
- **全站选中态只有 primary 一族**（`bg-primary/10-15 text-primary`）。`#2563eb` 蓝色只允许出现在
  B站内容卡片（舰长梯度）内，**禁止**作为 UI 选中态/按钮/强调色。
- 金额一律 `money` 令牌，禁止 `amber-300/400/500` 混用。
- 深色下免投影，用 `border` + 背景亮度分层；仅弹层/浮层用 `shadow-xl`。

### 2.2 字体（MUST，修复现有空壳）

现有 `--font-geist-sans: var(--font-geist-sans)` 自引用空壳（`globals.css:9`，从未加载 next/font）。
落地为系统栈（自部署、离线可用，不引网络字体）：

```css
--font-geist-sans: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
--font-geist-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
```

### 2.3 形状与空间（MUST）

- 圆角：`--radius: 0.625rem`；卡片 `rounded-xl`、控件（按钮/输入/选择器）`rounded-lg`、徽章/头像/进度条 `rounded-full`。
- 间距基准：卡片内 `p-4`(16px)、卡片间 `gap-4`、页面边距 `p-4 md:p-6`。
- 密度：列表行高 36-40px；长挂机场景信息优先；仅登录页/空态可用呼吸密度。
- 禁止魔法高度散落（`h-[420px]` 等）：面板高度走布局链（`flex-1 min-h-0`），仅首屏加载用 `h-[50vh]` 兜底。

## 3. 排版系统（MUST）

字号阶梯（仅此 8 档，禁止任意值）：`11` 辅助 / `12` 标签 / `13` 正文（数据面板基准）/
`14` 强调 / `16-18` 卡片标题 / `20-24` StatCard 数字 / `32` 页面大数字。

- 金额、计数、时间、时长：**必须 `tabular-nums`** + 字重 600+。
- 标签 500、正文 400。
- 中文不做特殊字体，随系统栈。

## 4. 组件规范（MUST）

**卡片只有三套，禁止第四套**：

| 组件 | 形态 |
|---|---|
| `SectionCard` | 区块容器：`rounded-xl border bg-card`，标题行 `px-4 py-3` + 可选 accent 竖条 |
| `StatCard` | 指标卡：`rounded-xl border bg-card px-3.5 py-3`，值 `tabular-nums text-xl/2xl` |
| `PageHeader` | 页头：同卡片外观，`title text-lg/xl font-bold` + actions |

- Button：高 36/40px、`rounded-lg`、primary 实心紫、ghost `hover:bg-accent`、disabled `opacity-50`。
- Input：高 40px、`rounded-lg`、`bg-accent/40`、focus `ring-2 ring-primary/20 border-primary/70`。
- Tab / 侧边导航选中态：**统一** `bg-primary/15 text-primary`（Tab 可加 `border-primary/25`）。
- 表格：行高 40px、`border-b border-border`、hover `bg-accent/50`、表头 sticky `bg-popover`、
  数字列右对齐 + `tabular-nums`。
- 徽章：`rounded-md`（或 full），`border-X/20 bg-X/10 text-X` 三件套模式。
- 图标：16px 内联；图标容器 32/36px `rounded-lg`。

## 5. 状态与交互（MUST）

- **选中态**：primary 一族（见 2.1）。
- **hover**：一律 `bg-accent`（语义），禁止 `bg-white/5` 这类裸透明度。
- **empty**：统一 `EmptyState`（图标 + 标题 + 描述），禁止散落纯文本"暂无数据"。
- **loading**：首屏 `LoadingScreen`；局部刷新按钮内旋转图标。
- **error**：`toast.error` + 控制台；破坏性操作（清空看板/删除）必须有确认。
- **焦点**：所有交互元素 `focus-visible:ring-2 ring-primary/40`。

## 6. 深浅主题（MUST）

- 深色为主设计，浅色 = remap（保留 `globals.css:124` 的 accent 色阶映射机制并扩展）。
- **防 invisible**：禁止裸 `bg-white/N`、`bg-black/N`、`text-white/20` 等；一律语义令牌。
- 对比度目标：正文 ≥ 7:1、辅助文字 ≥ 4.5:1、图表色块 ≥ 3:1。
- 新语义令牌必须同时给深/浅两值。

## 7. B站内容卡片（内容色边界）

`bilibili-cards.ts` 的礼物 5 档梯度、SC 6 档、上舰官方素材是**内容色**，只出现在
`TransactionCard` / OBS 叠加层 / 看板画布内：
- 内容饱和色**不溢出**到导航、按钮、选中态、普通列表。
- overlay 半透明（alpha 0.85）保留；卡片动画仅入场一次（`biweb-card-in`），禁循环。

## 8. 实时数据面板规范（MUST）

- 弹幕/礼物流：新条目仅入场动画（opacity + 位移一次）；数据全量刷新时已有行**不动画**。
- 自动吸底必须允许用户中断：用户向上滚动即暂停吸底，恢复需显式操作或回到底部。
- 金额跳动不引起布局位移（`tabular-nums` + 固定宽度列）。
- SSE 断线：显示断开状态，旧数据须有"可能过期"提示；重连用退避。
- 长挂机：禁止页面级自动刷新跳变（路由内数据更新为准）。

## 9. 硬性禁止项（NEVER）

1. 硬编码 hex 色值（`bilibili-cards.ts` 内容色除外）。
2. 非 `money` 令牌的金额颜色（`amber-300/400/500`、`yellow-*`）。
3. `blue-600` 作 UI 选中态/按钮/强调（内容卡片内舰长蓝除外）。
4. 新增第四套卡片/按钮形态；新组件先查本节。
5. 字号任意值（`text-[10px]`、`text-[15px]` 等）。
6. 裸 `bg-white/N` / `bg-black/N` 透明度色。
7. 单文件内自造语义色（各面板自行定义红/橙/蓝含义）。

## 10. 迁移清单（现状差距，逐项消除）

- [ ] `globals.css`：修复字体栈；新增 `money/profit/loss/chart` 令牌；`chart-*` 换青/紫主导
- [ ] `AnalyticsTable.tsx:190,254`、`AnalyticsDateRangePicker.tsx:311,409`：`bg-blue-600` 选中态 → primary
- [ ] `live/page.tsx:163`（`bg-blue-600/80` 按钮）、`blindbox/page.tsx:190`（`bg-orange-600` 按钮）→ 统一 Button 组件 primary/ghost
- [ ] `RankingList.tsx:40`（`bg-white/20`）、`DraggableTransactionCard.tsx:35-39`（`border-white/5`）→ 语义令牌
- [ ] `HighlightsList.tsx` / `GiftPanel.tsx` / `live/*` 金额 → `money` 令牌
- [ ] `ui/card.tsx`、`ui/dialog.tsx`（shadcn 模板 `p-6`）→ 收敛进 shared 体系或对齐圆角/间距
- [ ] `LoginClient.tsx:92` 紫蓝渐变按钮 → `bg-primary`；登录页光晕对齐 globals.css 顶部径向光
- [ ] `Sidebar.tsx:31` 导航图标去重（数据分析/数据排行）
- [ ] 各面板魔法高度（`h-[420px]`、`min-h-[520px]`）→ 布局链
- [ ] `StatsCharts.tsx`：确认命名（无图表）或补趋势图（chart 令牌已就位）
