# SQLite 残留清理计划

## 改造范围

- 删除仓库根目录中仍依赖 `better-sqlite3` 的旧 SQLite 运维脚本。
- 调整 TypeScript 检查范围，避免 ignored 的本地测试目录进入生产类型检查。

## 非目标项

- 不改当前 Prisma/PostgreSQL 数据模型和服务实现。
- 不引入新的数据库迁移脚本。
- 不改采集器运行逻辑。
- 不处理与 SQLite 无关的旧测试 mock 断言。

## 模块拆分

1. 旧脚本清理：`migrate_db.js`、`reset_admin.js`。
2. 类型检查边界：`tsconfig.json` 的 exclude。

## 实施顺序

1. 删除旧 SQLite 脚本。
2. 排除 ignored 的 `tests` 目录，避免本地残留测试影响 `tsc`。
3. 搜索确认仓库可提交内容中没有 `sqlite`/`better-sqlite3` 引用。
4. 跑 `eslint`、`tsc`、`build` 做验收。

## 风险点

- 如果仍有人依赖旧 SQLite 脚本做历史库维护，删除后需要从历史提交恢复。
- 排除 `tests` 会让当前 ignored 测试不再参与项目级类型检查；这些测试本来不在 Git 管理范围内。

## 回滚点

- 需要恢复旧脚本时可从删除脚本的提交回滚。
- 需要恢复测试类型检查时可移除 `tsconfig.json` 中的 `tests` exclude。

## 验证方式

- `rg -uu "sqlite|better-sqlite3|sqlite3" . -g "!node_modules" -g "!.next" -g "!coverage" -g "!tsconfig.tsbuildinfo"`
- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`
