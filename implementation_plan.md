# 后台 UI 组件库统一改造计划

## 改造范围

- `src/app/dashboard/**` 主播后台页面。
- `src/components/dashboard/**` 主播后台组件。
- `src/app/admin/**` 管理后台页面。
- `src/components/admin/**` 管理后台组件。
- 目标 UI 库：`@heroui/react`。

## 非目标项

- 不改数据库、接口、采集器、鉴权逻辑。
- 不改 OBS overlay 页面。
- 不删除全局 shadcn 组件目录，避免影响登录页、toast 或其它未纳入后台范围的页面。
- 不提交、不推送。

## 模块拆分

1. Dashboard 共用组件：侧边栏、统计卡片、实时列表、图表卡片。
2. Dashboard 页面：监控首页、盲盒、开播记录、开播详情、切片制作板。
3. Admin 页面：登录、错误页、主播管理、密码弹窗。
4. 清理后台 Ant Design provider 和后台范围内 shadcn/antd 引用。

## 实施顺序

1. 替换 dashboard 组件中的 shadcn `Button/Card/Avatar/Badge/ScrollArea/Input/Label/Table`。
2. 替换 dashboard 页面中的日期选择器、按钮、表格和头像。
3. 替换 admin 的 Ant Design 组件为 HeroUI + 原生确认交互。
4. 删除 admin Ant Design provider 包裹。
5. 跑 lint 和 build；如果本地 `.next` 被占用，记录阻塞原因。

## 风险点

- HeroUI 组件 API 与 shadcn/antd 不完全一致，表格、弹窗和密码框需要手动适配。
- 管理后台操作按钮涉及异步状态，不能破坏原有 action 调用。
- 当前本机 `.next` 可能被 Node/Next 进程占用，build 可能受环境阻塞。

## 回滚点

- 每个模块独立 diff，可按文件回退。
- 业务 action 和数据查询不改，出现 UI 问题时只需要回退组件层。

## 验证方式

- `rg "@/components/ui|antd/es|@ant-design" src/app/admin src/app/dashboard src/components/admin src/components/dashboard`
- `npx eslint ...`
- `npm run build`
