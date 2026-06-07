# Dashboard UI 密度与 Playwright 自动化计划

## 本轮修正补充：反馈入口常驻化与 QQ 群唤起

### 改造范围

- 将 dashboard “问题反馈”从头像菜单里移到左侧栏常驻区域，提高可见性。
- 点击左侧栏反馈入口直接打开反馈弹窗，不再自动弹出。
- 在反馈弹窗内增加“打开加群链接”和“复制群号”操作。
- 使用群分享生成的 `https://qm.qq.com/q/XrBYAZ4aMc` 官方加群链接，复制群号作为兜底。

### 非目标项

- 不新增服务端接口。
- 不写入数据库。
- 不改变登录、退出、dashboard 导航逻辑。
- 不保证所有浏览器都会从加群链接直接唤起 QQ，失败时以复制群号兜底。

### 实施顺序

1. 抽出侧边栏反馈入口按钮，桌面和移动侧边栏复用。
2. 简化头像菜单，只保留退出登录，避免反馈入口被隐藏。
3. 扩展反馈弹窗：QQ 群号、官方加群链接、复制群号，移除“不再提示”。
4. 补充 Playwright：即使自动弹窗被 suppress，手动反馈入口也能打开弹窗。
5. 运行 lint 和相关 e2e。

### Plan Eng Review

- 更短路径：复用现有 Sidebar 和 Dialog 状态，不引入全局 store。
- 耦合风险：只改客户端展示和本地弹窗状态，不碰服务端。
- 兼容性风险：QQ 加群链接仍依赖浏览器和客户端处理，必须提供复制群号兜底。
- 漏项检查：桌面入口、移动入口、弹窗打开、按钮可见、无“不再提示”、退出登录不受影响。
- KISS/YAGNI/DRY：一个反馈入口组件复用于桌面和移动，不新增复杂配置系统。

---

## 本轮修正补充：开播记录列宽与内部滚动条一致性

### 改造范围

- 修复 `/dashboard/live` 表格 `w-max + table-fixed` 导致列宽异常放大、只露出开播时间列的问题。
- 将 `/dashboard/live` 接入桌面 flex 高度链路，滚动留在开播记录卡片内部。
- 将 `/dashboard/analytics` 表格内部滚动条统一为项目的 `dark-scrollbar` 样式。
- 补充 Playwright 断言，防止开播记录表格再次出现超大 scrollWidth。

### 非目标项

- 不修改开播记录查询、收入统计、详情跳转逻辑。
- 不修改数据分析筛选、排序、分页逻辑。
- 不修改全局浏览器页面滚动策略。

### 实施顺序

1. live 表格去掉 `w-max`，改为 `w-full min-w-[1100px]`，并给关键列固定合理宽度。
2. live 页面外层、统计区、表格卡片接入 `lg:flex lg:min-h-0` 高度链路。
3. analytics 表格滚动容器添加 `dark-scrollbar`。
4. 更新 e2e：桌面端 live 表格不应比容器宽出异常值。
5. 运行 lint、Playwright，并截图复核。

### Plan Eng Review

- 更短路径：修错用的表格宽度 class，不重写表格组件。
- 耦合风险：只影响 live 页面 presentation 和 analytics 滚动条样式。
- 兼容性风险：移动端保留横向滚动，桌面端可用宽度足够展示全部列。
- 漏项检查：列宽、卡片内部滚动、页面级无滚动、交互测试都覆盖。
- KISS/YAGNI/DRY：复用现有 `dark-scrollbar`，不新增滚动条主题。

---

## 本轮修正补充：桌面页面级滚动收敛

### 改造范围

- 桌面端 dashboard shell 固定在视口高度内，避免浏览器页面自身出现滚动条。
- `/dashboard/blindbox` 改为外层 flex 高度分配，开盒记录区域承担内部滚动。
- `/dashboard/analytics` 改为卡片和表格内部 flex 高度分配，明细 viewport 承担内部滚动。
- 补充 Playwright 断言：目标页面 `document.scrollingElement` 不纵向滚动，记录/表格 viewport 保持可用高度。

### 非目标项

- 不修改数据查询、筛选、排序、分页、盲盒统计逻辑。
- 不把移动端强行锁进一屏，移动端仍允许自然页面滚动。
- 不调整非 dashboard shell 的页面滚动策略。

### 实施顺序

1. 修改 dashboard layout：桌面端 `h-screen overflow-hidden`，主区域只负责承载，不做页面滚动。
2. 修改盲盒页：根容器、记录卡片、记录 viewport 改为 `flex min-h-0 flex-1` 链路。
3. 修改数据分析页：页面、卡片、Card.Content、`AnalyticsTable` 改为 `flex min-h-0` 链路。
4. 更新 e2e：断言 desktop 文档不滚动，卡片 viewport 高度稳定。
5. 运行 lint、Playwright，并截图复核。

### 风险点

- 头部和筛选栏高度会影响剩余表格高度，必须避免写死过大的 `min-h`。
- 有数据时表格内容可能超过可视区，需要只在 viewport 内滚动。
- 移动端不能继承桌面锁高，否则内容可能不可达。

### Plan Eng Review

- 更短路径：修外层高度链路和两个目标页面，不引入新布局组件。
- 耦合风险：dashboard layout 影响全部子页，所以桌面锁高只配合子页 `min-h-0`，移动端不锁。
- 兼容性风险：桌面滚动从 document 转到卡片内部，测试覆盖 blindbox 和 analytics。
- 漏项检查：文档纵向滚动、内部 viewport 高度、原筛选交互均纳入验证。
- KISS/YAGNI/DRY：保留现有组件，只调整布局 class 和测试断言。

---

## 本轮修正补充：筛选条滚动条与盲盒分布布局

### 改造范围

- 修复 `/dashboard/analytics` 筛选条中类型 segmented control 出现原生滚动条的问题。
- 将 `/dashboard/blindbox` 的礼物分布从固定左栏改为横向概览区，让开盒记录获得完整宽度。
- 补充 Playwright 断言，避免筛选条控件出现内部滚动条、盲盒记录区被低价值边栏压缩。

### 非目标项

- 不修改 analytics 过滤、排序、分页逻辑。
- 不修改盲盒统计计算方式。
- 不改数据库和 API。

### 实施顺序

1. analytics 类型筛选从 `overflow-x-auto` 改为无滚动条的响应式四段按钮。
2. 盲盒页移除 `300px + 1fr` 双栏布局，礼物分布改为全宽横向网格卡片。
3. 更新 e2e：检查 analytics 类型筛选无内部滚动条，盲盒记录区桌面宽度足够。
4. 运行 `npm run lint`、`npx playwright test`，并截图复核。

### 风险点

- 移动端 segmented control 仍需在窄屏不溢出。
- 横向礼物分布在 7 个礼物项时需要保持可读，不应挤出页面。
- 盲盒记录区高度需避免空态占满整屏但仍保留工作区稳定性。

### Plan Eng Review

- 更短路径：修具体 CSS 和布局结构，不引入新组件库。
- 耦合风险：只影响两个页面的 presentation，不触碰数据层。
- 兼容性风险：Windows 原生滚动条通过移除 overflow 源头解决，移动端由 grid 自适应兜底。
- 漏项检查：桌面/移动无横向溢出、关键按钮可点击、截图人工复核。
- KISS/YAGNI/DRY：保留原有筛选状态和礼物分布数据结构，只换展示形态。

---

## 本轮修正补充：首页工作区与盲盒 key

### 改造范围

- 修复 `/dashboard/blindbox` 因盲盒记录共用原始 gift id 导致的 React duplicate key。
- 调整 `/dashboard` 首页宽屏布局，取消内容区居中窄版约束，改成主工作区 + tab 切换。
- 补充 Playwright 对 dashboard 首页 tab 交互和盲盒 console error 的覆盖。

### 非目标项

- 不改数据库结构。
- 不重写 Gift/Danmaku/Guard 面板内部业务逻辑。
- 不调整非 dashboard 首页与盲盒页之外的业务语义。

### 实施顺序

1. 在盲盒统计服务中生成稳定唯一 `row_key`，页面表格使用该 key。
2. 移除 dashboard layout 的宽屏 `max-width` 居中限制，让内容吃满侧边栏以外空间。
3. 将首页三列空状态面板改为一个实时动态 tab 工作区，右侧展示排行。
4. 更新 e2e：检查首页 tab 可切换，检查盲盒页无 duplicate key console error。
5. 运行 `npm run lint` 与 `npx playwright test`。

### 风险点

- 盲盒历史数据可能存在空 `msg_id`，`row_key` 必须有兜底组合。
- 首页面板复用现有组件，需避免改坏现有 motion key 和滚动行为。
- 宽屏去掉 max-width 后，表格页仍需保持自身横向滚动边界。

### 验证方式

- 浏览器控制台不再出现 duplicate key。
- 首页宽屏内容贴近侧边栏右侧并扩展至可用宽度。
- Playwright 桌面/移动端均无水平溢出，关键交互仍可点击。

### Plan Eng Review

- 更短路径：修数据源唯一 key + 首页一处布局重组，不引入新路由或复杂状态管理。
- 耦合风险：`row_key` 是新增字段，不破坏现有 `id` 消费方。
- 兼容性风险：布局取消 max-width 会影响 dashboard 全部子页，但已有溢出测试覆盖。
- 漏项检查：运行时错误、宽屏空白、tab 交互、移动端溢出均纳入验证。
- KISS/YAGNI/DRY：复用现有面板组件和 StatsCharts，不新增抽象层。

---

## 改造范围

- 建立仅针对本地 `http://127.0.0.1:3000` 的 Playwright 自动化测试框架。
- 使用管理员账号从 `/admin/login` 登录，并通过后台“看板”按钮进入主播 dashboard。
- 优先改造 dashboard 业务页面的信息密度、视觉层级和交互可信度。
- 第一批页面范围：`/dashboard/blindbox`、`/dashboard`、`/dashboard/live`、`/dashboard/analytics`、`/dashboard/ranking`、`/dashboard/board`。

## 非目标项

- 不修改后端查询、Redis、数据库结构或认证语义。
- 不新增复杂设计系统，不重写全部组件库。
- 不把无真实详情页的表格行伪装成可进入详情。
- 不处理非 dashboard 主路径的营销页或管理后台视觉重做。

## 输入输出

- 输入：本地 Next.js 应用、管理员账号 `admin`、密码 `jiuai233`、现有 PostgreSQL 数据。
- 输出：可运行的 Playwright 测试、页面截图验证、交互可用性检查，以及更紧凑清晰的 dashboard 页面布局。

## 影响范围

- `package.json`、`package-lock.json`
- `playwright.config.ts`
- `tests/e2e/**`
- dashboard 页面和共享组件：`src/app/dashboard/**`、`src/components/dashboard/**`

## 实施顺序

1. 安装 `@playwright/test` 并配置本地测试。
2. 编写 admin 登录与 impersonate helper，稳定进入主播看板。
3. 编写页面 smoke、布局溢出、关键交互、假 affordance 检查。
4. 先改 `/dashboard/blindbox`：压缩 KPI、重排分布与记录、移除无行为箭头、修正伪筛选按钮。
5. 再抽取/统一 dashboard 页面头、工具栏、表格密度、空态与滚动策略。
6. 按页面逐步接入并运行 Playwright 截图与交互验证。
7. 执行 `npm run lint` 和 Playwright 测试。

## 风险点

- 本地数据库数据量和状态会影响截图内容，测试必须避开脆弱的精确数据断言。
- 管理员“看板”按钮会打开新 tab，测试需要等待 popup 或直接调用 impersonate JSON fallback。
- 部分外链行为例如 B 站主播页面不应在测试中真的跳转外站。
- 拖拽类交互在 Playwright 中要用稳定坐标和可见元素，避免过度依赖样式细节。

## 验证方式

- `npm run lint`
- `npx playwright test`
- Playwright 截图覆盖桌面和移动视口。
- 自动断言关键页面无水平溢出、主要按钮可点击、无假箭头交互。

## Plan Eng Review

- 更短路径：先建立测试和修最显眼的 dashboard 页面，不先做 Redis 或大规模视觉系统。
- 耦合风险：优先修改页面布局和共享 presentation 组件，不触碰服务端数据函数。
- 兼容性风险：admin 登录依赖本地数据库存在指定账号，测试失败时应明确提示登录态问题。
- 漏项检查：页面密度、假交互、桌面/移动截图、关键按钮行为均纳入测试。
- KISS/YAGNI/DRY：只抽取实际复用的布局 primitive，不提前设计完整 UI 框架。

---

# Dashboard 问题反馈弹窗计划

## 改造范围

- 在 dashboard 布局常驻客户端区域增加问题反馈弹窗。
- 进入 `/dashboard` 及其子路由时，默认每天自动弹一次。
- 支持用户本地选择“不再提示”。
- 在头像菜单的“退出登录”上方增加“问题反馈”按钮，可手动再次打开弹窗。

## 非目标项

- 不新增服务端接口。
- 不把弹窗状态写入数据库或 Cookie。
- 不修改登录、鉴权、dashboard 数据逻辑。

## 输入输出

- 输入：用户访问 dashboard、点击头像菜单反馈按钮、勾选不再提示。
- 输出：毛玻璃弹窗展示 QQ 群提示；本地保存每日展示或永久关闭状态。

## 影响范围

- `src/components/dashboard/DashboardNoticeDialog.tsx`
- `src/components/dashboard/Sidebar.tsx`

## 实施顺序

1. 新增 `DashboardNoticeDialog`，复用现有 `Dialog`、`Button`、`Checkbox`。
2. 在 `Sidebar` 中读取 `localStorage`，判断是否需要每天自动弹出。
3. 在 `SidebarUserMenu` 中增加“问题反馈”按钮，点击后打开弹窗。
4. 关闭弹窗时若勾选“不再提示”，写入本地永久关闭标记。
5. 执行 diff 自查和构建验证。

## 风险点

- `localStorage` 只能在客户端使用，逻辑必须放在 Client Component。
- 自动弹窗需要避免每次路由切换都重复弹出。
- 头像菜单移动端和桌面端复用同一组件，入口应同时生效。

## 验证方式

- 进入 `/dashboard`，首次当天自动显示弹窗。
- 关闭后当天刷新不再自动显示。
- 勾选“不再提示”后后续不再自动显示。
- 点击头像菜单“问题反馈”可手动打开。
- `npm run build`

## Plan Eng Review

- 更短路径：复用现有 Sidebar 常驻客户端组件，不引入全局状态。
- 耦合风险：只影响 dashboard 侧边栏交互，不触碰服务端认证。
- 兼容性风险：本地存储按浏览器隔离，换设备会重新按每日规则弹。
- 漏项检查：自动弹出、每日限制、永久关闭、手动入口均覆盖。

---

# 登录页动态渲染修复计划

## 改造范围

- 将 `/admin/login` 和 `/login` 的客户端交互拆到独立 Client Component。
- 在两个登录页 `page.tsx` 中声明 `dynamic = 'force-dynamic'` 和 `revalidate = 0`。
- 保持登录表单、Server Action 调用和 UI 不变。

## 非目标项

- 不修改认证逻辑。
- 不修改数据库、PM2、Nginx、Docker 配置。
- 不处理 dashboard 其它 Server Action 页面。

## 实施顺序

1. 新增 `src/app/admin/login/AdminLoginClient.tsx`，承载原后台登录页客户端逻辑。
2. 改造 `src/app/admin/login/page.tsx` 为动态 Server wrapper。
3. 新增 `src/app/login/LoginClient.tsx`，承载原普通登录页客户端逻辑。
4. 改造 `src/app/login/page.tsx` 为动态 Server wrapper。
5. 执行 diff 自查和构建验证。
6. 部署到远端并验证 `/admin/login` 响应头不再长缓存。

## 风险点

- Client Component 中的相对 action import 路径必须保持正确。
- `page.tsx` 不再是 Client Component 后，不能残留客户端 hook。

## 验证方式

- `npm run build`
- 远端 `curl -I https://bili.jiuai233.work/admin/login`
- 远端 `curl -I https://bili.jiuai233.work/login`

## Plan Eng Review

- 更短路径：仅拆分登录页，不扩大到所有 dashboard 页面。
- 耦合风险：只改变组件边界，不改 action 签名。
- 兼容性风险：Next App Router 支持页面级 `dynamic`/`revalidate` 导出。
- 漏项检查：后台登录和普通登录都覆盖。

---

# PM2 standalone 启动配置计划

## 改造范围

- 将 Next Web 服务 `bili_next` 固化到 `ecosystem.config.cjs`。
- 使用 `.next/standalone/server.js` 启动，避免 `next start` 与 `output: 'standalone'` 不兼容。
- 将 PM2 `max_memory_restart` 从 `512M` 提高到 `1G`。
- 保留现有 `biweb-collector` PM2 配置。

## 非目标项

- 不修改数据库、Docker、Nginx、CDN 配置。
- 不重新构建 Next 产物。
- 不改业务代码。

## 实施顺序

1. 更新 `ecosystem.config.cjs`，加入 `bili_next` standalone app。
2. 将配置同步到远端 `/www/wwwroot/bili-next/ecosystem.config.cjs`。
3. 使用 PM2 按配置重启 `bili_next`。
4. 验证 PM2 状态、监听端口和页面响应。

## 风险点

- 重启 `bili_next` 会产生短暂服务中断。
- 若 `.next/standalone/server.js` 不存在，PM2 启动会失败；远端已确认该文件存在。

## 验证方式

- `pm2 list`
- `pm2 describe bili_next`
- `ss -ltnp | grep ':3000'`
- `curl -I http://127.0.0.1:3000/admin/login`

## Plan Eng Review

- 更短路径：只固化 PM2 配置，不做无关重构。
- 耦合风险：采集器配置保留，仅提升内存阈值。
- 兼容性风险：`cwd` 使用 `__dirname` 拼接 standalone 路径，可随项目目录迁移。
- 漏项检查：启动脚本、端口、HOSTNAME、NODE_ENV、TZ、内存阈值和验证步骤均覆盖。

---

# Admin 修改主播身份码计划

## 改造范围

- 在 Admin 主播列表中增加修改身份码入口。
- 服务端新增按主播 `id` 更新 `broadcasters.auth_code` 的能力。
- 修改身份码时只更新主播配置，不修改历史弹幕、礼物、SC、开播记录。
- 支持可选将主播登录密码同步重置为新身份码，避免登录密码和身份码语义混淆。

## 非目标项

- 不修改数据库 schema。
- 不迁移或重写历史采集数据。
- 不改变采集端、dashboard 数据查询、管理员登录逻辑。
- 不自动改房间号、UID、open_id 等主播绑定信息。

## 输入输出

- 输入：主播 id、新身份码、是否同步重置主播登录密码。
- 输出：成功或失败提示；成功后 Admin 表格中的身份码掩码更新。

## 影响范围

- `src/lib/services/broadcaster.ts`
- `src/app/admin/actions.ts`
- `src/components/admin/BroadcasterManager.tsx`

## 实施顺序

1. 新增 `updateBroadcasterAuthCode` 服务函数，处理唯一约束冲突。
2. 新增 `updateBroadcasterAuthCodeAction`，做管理员鉴权、输入校验、可选密码 hash。
3. 在 Admin 表格操作区加修改身份码按钮和弹窗。
4. 成功后更新本地列表、清理已揭示身份码缓存。
5. 执行 diff 自查。
6. 运行 lint/build 验证。

## 风险点

- `auth_code` 是唯一字段，新身份码已存在时必须失败并提示。
- 修改身份码不会覆盖历史数据，但如果同时重置密码，会影响主播下次登录密码。
- 表格操作区按钮更多，需保持不换行失控。

## 回滚点

- 回滚三个改动文件即可移除该功能。

## 验证方式

- `npm run lint`
- `npm run build`

## Plan Eng Review

- 更短路径：直接更新 `Broadcaster.authCode`，不做 schema 和历史数据迁移。
- 耦合风险：Admin action 复用现有 `requireAdmin`，不影响普通主播页面。
- 兼容性风险：默认只改身份码；同步密码是显式勾选。
- 漏项检查：唯一约束、空值校验、本地状态刷新、查看身份码缓存均覆盖。
- KISS/YAGNI/DRY/SOLID：不引入通用表单框架，只加本功能需要的局部弹窗。

---

# HeroUI 控件统一与首页昨日对比计划

## 改造范围

- 将 `src/components/ui/button.tsx`、`src/components/ui/input.tsx` 改为 HeroUI 组件库适配层。
- 保持业务页继续从 `@/components/ui/*` 引入，避免到处散落组件库 props。
- 首页 Dashboard 增加 `previousStats`，用于渲染“较昨日”差值。

## 非目标项

- 不重构 Card/Table/Avatar/Chip。
- 不修改数据库 schema。
- 不改排行、盲盒、开播记录等页面的数据语义。

## 输入输出

- 输入：当前选择的时间范围。
- 输出：当前统计、前一天同时间段统计，以及每个首页统计卡片的差值文案。

## 影响范围

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/app/dashboard/actions.ts`
- `src/app/api/dashboard/stream/route.ts`
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/StatsPanel.tsx`

## 实施顺序

1. 用 HeroUI 实现本地 Button/Input 适配层。
2. Dashboard action/SSE 补充前一天同时间段 `previousStats`。
3. StatsPanel 渲染“较昨日”差值。
4. 执行 diff 自查。
5. 运行 typecheck、lint、build 验证。

## 风险点

- HeroUI 使用 `isDisabled`，现有业务代码多用 `disabled`，适配层必须兼容。
- HeroUI variant 和原本本地 variant 名称不完全一致，需要映射。
- SSE 每次刷新多查询一组昨天数据，首页统计查询量会增加。

## 回滚点

- 回滚上述 6 个文件即可恢复。

## 验证方式

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

## Plan Eng Review

- 更短路径：不批量改所有业务 import，集中改 UI 门面，既统一到底层组件库也降低改动面。
- 耦合风险：适配层只处理 Button/Input props 映射，不影响其他 HeroUI 组件。
- 兼容性风险：保留 `disabled`、本地 variant、size 的旧调用方式。
- 漏项检查：首页普通 action 和 SSE 都补 `previousStats`，避免首次加载和实时刷新表现不一致。

## Live status reconcile script

### 改造范围
- 在 `collector-node` 增加一次性运维脚本，对账 B站当前直播状态与 `live_status` 最新事件。
- 增加 npm 脚本入口，支持先 dry-run 再 `--apply`。

### 模块拆分
- `collector-node/src/scripts/reconcile-live-status.ts`：查询 active 主播、调用 B站房间接口、补差异事件。
- `collector-node/package.json`：提供源码和构建后运行入口。

### 实施顺序
1. 添加对账脚本，默认只输出差异。
2. 添加 npm scripts。
3. 编译和 lint 验证。

### 风险点
- B站公开接口不可用时不能修正对应房间，脚本应跳过并输出错误。
- 正在直播状态取决于接口实时结果，执行前应先 dry-run 复核。

### 回滚点
- 删除新增脚本和 npm scripts 即可回滚代码。
- 已写入数据库的修正事件可按 `msg_id LIKE 'reconcile_live_status_%'` 定位。

### 验证方式
- `npm --prefix web/collector-node run build`
- dry-run 输出不写库；`--apply` 才插入修正事件。
- KISS/YAGNI/DRY/SOLID：不引入新的 UI 抽象，只把已有门面接到组件库。

---

# Admin 新增主播失败提示修复计划

## 改造范围

- 修复管理端新增主播失败时所有错误都被显示为“可能已存在”的问题。
- 服务层创建主播时返回结构化结果，区分唯一约束冲突、数据库连接/表结构错误和未知错误。
- 如果新增失败是 `broadcasters.id` 自增序列落后导致的主键冲突，自动校准序列并重试一次。
- Admin action 对身份码做 trim 校验，并透传服务层失败原因。

## 非目标项

- 不修改数据库 schema。
- 不改采集端启动和同步逻辑。
- 不改管理端列表、修改身份码、修改密码、删除、暂停等无关操作。

## 输入输出

- 输入：管理端新增表单中的 `authCode`。
- 输出：成功时返回 `{ success: true }`；失败时返回明确中文原因。

## 影响范围

- `src/lib/services/broadcaster.ts`
- `src/app/admin/actions.ts`

## 实施顺序

1. 将 `addBroadcaster` 从 boolean 返回值改为 `{ success, message }`。
2. 在 Prisma 已知错误中处理 `P2002`、`P1001`、`P2021`、`P2022`。
3. 对 `P2002` 进一步区分 `auth_code` 和 `id`，`id` 冲突时校准 PostgreSQL sequence 后重试。
4. 在 Admin action 中 trim 身份码，复用服务层消息。
5. 执行 diff 自查。
6. 运行 lint/build 验证。

## 风险点

- 需要保持 `createBroadcasterAction` 的返回结构兼容前端现有 `result.success/result.message` 用法。
- 如果真实根因是线上数据库结构缺列，本次代码不会自动迁移，但会把错误明确暴露出来，便于执行对应 SQL/迁移。
- 自动校准序列只在 Prisma 明确返回 `id` 唯一冲突时触发，避免误改其他约束。

## 回滚点

- 回滚 `src/lib/services/broadcaster.ts` 和 `src/app/admin/actions.ts` 即可恢复旧行为。

## 验证方式

- `npm run lint`
- `npm run build`

## Plan Eng Review

- 更短路径：不改 UI；对最可能导致“任何新增都失败”的主键序列问题做一次性自愈。
- 耦合风险：只影响新增主播 action，其他更新/删除接口不变。
- 兼容性风险：前端已按 `{ success, message }` 消费结果，返回结构保持一致。
- 漏项检查：覆盖空值、身份码唯一冲突、主键序列冲突、连接失败、缺表、缺列和未知错误。
- KISS/YAGNI/DRY/SOLID：不引入新错误框架，仅在当前服务函数内做必要分类。

---

# 制作板一键导入可用记录计划

## 改造范围

- 在制作板左侧“可用记录”列表增加一键导入按钮。
- 一键导入当前左侧筛选后的全部可用记录。
- 批量导入复用单条拖拽导入的合并规则，避免重复展示同一条原始记录。

## 非目标项

- 不修改交易查询上限，继续沿用当前最近/场次最多 500 条记录。
- 不新增服务端接口，不改变 OBS 同步 API。
- 不改变拖拽单条导入、排序、删除、导出图片逻辑。

## 输入输出

- 输入：当前 `filteredSource` 列表。
- 输出：一次性合并到 `boardItems`；成功后显示导入数量提示。

## 影响范围

- `src/components/dashboard/InteractiveBoard.tsx`

## 实施顺序

1. 抽出 `mergeTransactionsIntoBoard` 批量合并函数。
2. 拖拽单条导入改为复用批量函数。
3. 增加 `handleImportAllVisible`。
4. 在“可用记录”标题栏加入一键导入按钮。
5. 执行 diff 自查。
6. 运行 lint/build 验证。

## 风险点

- 500 条记录如果全部是 SC，会渲染 500 个卡片，前端滚动/导出图片会变重。
- OBS 同步 payload 会变大，但现有 500ms 防抖保证批量导入只产生一次同步请求。
- 礼物/舰长按用户和礼物合并后，左侧可用记录数量会快速归零，但右侧项目数可能小于导入原始条数，这是既有合并语义。

## 回滚点

- 回滚 `src/components/dashboard/InteractiveBoard.tsx` 即可移除该功能。

## 验证方式

- `npm run lint`
- `npm run build`

## Plan Eng Review

- 更短路径：客户端已有全部数据和防抖同步，不需要新增服务端批量接口。
- 耦合风险：只复用现有合并规则，不影响数据查询和 OBS 路由。
- 兼容性风险：拖拽单条导入行为保持一致。
- 漏项检查：空列表、已导入记录过滤、礼物合并、SC 不合并均覆盖。
- KISS/YAGNI/DRY/SOLID：新增一个小型纯函数，避免拖拽和批量导入两套逻辑。

---

# OBS 切片滚动开关与 8 条阈值计划

## 改造范围

- OBS overlay 滚动阈值从 5 条调整为 8 条。
- 制作板增加自动滚动手动开关。
- overlay config 增加 `scrollEnabled` 字段，与现有 `scrollSpeed` 一起同步。
- overlay 只在开启滚动且条数超过 8 时渲染双份并启动循环。

## 非目标项

- 不改变切片卡片样式、排序、拖拽、导出图片逻辑。
- 不新增服务端持久化机制，继续沿用 overlay config 文件存储。
- 不改变速度滑块取值范围。

## 输入输出

- 输入：制作板 `scrollEnabled`、`scrollSpeed`、`boardItems.length`。
- 输出：OBS overlay 中 `<= 8` 条显示单份；`> 8` 且开启滚动时循环显示。

## 影响范围

- `src/components/dashboard/InteractiveBoard.tsx`
- `src/app/o/[code]/page.tsx`
- `src/app/api/overlay/[code]/config/route.ts`

## 实施顺序

1. 扩展 config GET/PATCH 消费字段，默认 `scrollEnabled: true`。
2. 制作板读取并同步 `scrollEnabled`。
3. 增加自动滚动滑块开关 UI。
4. overlay 端使用统一 `shouldScroll` 条件控制 rAF 和第二份渲染。
5. 执行 diff 自查。
6. 运行 lint/build 验证。

## 风险点

- 默认开启保持旧行为，但 `<= 8` 条会变成单份静止展示。
- 如果已有 OBS 页面长时间不刷新，需要等待 5 秒轮询拿到新配置。

## 回滚点

- 回滚以上三个文件即可恢复原滚动行为。

## 验证方式

- `npm run lint`
- `npm run build`

## Plan Eng Review

- 更短路径：只调整 overlay 条件可修重复，但无法满足手动开启需求。
- 耦合风险：复用现有 config 同步链路，不新增 API。
- 兼容性风险：旧 config 没有 `scrollEnabled` 时默认开启。
- 漏项检查：覆盖关闭滚动、`<= 8`、`> 8`、速度配置轮询四类场景。
- KISS/YAGNI/DRY/SOLID：只增加一个布尔配置和一个派生条件，不引入新状态管理。

---

# 展示面板一致性与刷新修复计划

## 改造范围

- 修复 OBS overlay 只按 ID 判断变化导致合并卡片不刷新的问题。
- 统一制作板预览和 OBS overlay 的卡片宽高基准。
- 修复导出图片异常时画布临时样式未恢复的问题。
- 给制作板记录列表增加手动刷新能力。

## 非目标项

- 不修改 overlay 写接口鉴权。
- 不改变现有拖拽、排序、合并语义。
- 不引入自动轮询，避免直播中持续请求影响编辑体验。

## 输入输出

- 输入：制作板当前选择的记录范围、boardItems、overlay config。
- 输出：OBS 正确刷新内容变化；导出异常后 UI 恢复；用户可手动刷新可用记录。

## 影响范围

- `src/app/o/[code]/page.tsx`
- `src/components/dashboard/InteractiveBoard.tsx`
- `src/app/dashboard/board/actions.ts`

## 实施顺序

1. overlay 端用完整 JSON payload 签名判断数据变化。
2. OBS 卡片尺寸对齐制作板卡片宽高。
3. 导出截图临时样式改为 `try/finally` 恢复。
4. 增加最近记录刷新 action 和制作板刷新按钮。
5. 执行局部 review。
6. 运行 lint/build 验证。

## 风险点

- JSON payload 对比比 ID 对比成本更高，但 overlay 数据上限小，5 秒轮询可接受。
- OBS 尺寸变化会让现有浏览器源更接近制作板预览，但旧 OBS 源如果宽度过窄会按 `maxWidth` 收缩。
- 手动刷新不会自动把新记录加入右侧，需要用户按筛选后导入。

## 回滚点

- 回滚上述三个文件即可恢复旧行为。

## 验证方式

- `npm --prefix web run lint`
- `npm --prefix web run build`

## Plan Eng Review

- 更短路径：不抽共享组件，先统一关键尺寸常量和行为，避免扩大重构面。
- 耦合风险：刷新 action 复用现有鉴权和交易查询，不影响其他 dashboard 页面。
- 兼容性风险：overlay payload 比较只影响是否更新本地状态，不改变 API 返回格式。
- 漏项检查：覆盖合并内容变更、截图失败恢复、最近/当前/历史场次刷新、OBS 尺寸一致性。
- KISS/YAGNI/DRY/SOLID：只加最小服务端 action 和局部常量，不引入新状态管理。
