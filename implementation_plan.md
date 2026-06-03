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
