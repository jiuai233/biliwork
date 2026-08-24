# Bili Monitor Web

B站直播数据监控面板 - 前端项目

## 功能特性

- **实时监控看板** - 弹幕、礼物、舰长、SC 实时展示
- **数据统计分析** - 收入趋势、用户排行、互动数据
- **礼物流水回填** - 扫码即可（不必先填身份码），Cookie 用对称密钥异或保存；网页只入队，采集端按顺序拉取今年 1 月 1 日到昨天的收礼记录
- **盲盒盈亏分析** - 心动盲盒开出记录与盈亏计算
- **切片看板** - 可拖拽的数据展示面板

## 技术栈

- **框架**: Next.js 16 (App Router, React 19)
- **UI**: Tailwind CSS 4 + HeroUI + 共享组件（`src/components/shared`）
- **数据库**: PostgreSQL + Prisma ORM
- **动画**: Framer Motion

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 数据库

### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写数据库连接等配置

# 3. 同步数据库
npx prisma db push
# 已有库也可执行 prisma/add_gift_stream.sql 补扫码登录和礼物流水表

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 部署

### Node 采集器（Docker）

Node 采集器源码在 `collector-node/`，用于替换旧 Go collector。

```bash
cd /www/wwwroot/bili-next/collector-node
docker build -t biweb-collector-node .

docker stop biweb-collector
docker rm biweb-collector

docker run -d \
  --name biweb-collector \
  --restart unless-stopped \
  --network <postgres所在网络> \
  -e DATABASE_URL='postgres://postgres:<密码>@biweb-postgres:5432/biweb?sslmode=disable' \
  -e BILI_ACCESS_KEY_ID='<你的key>' \
  -e BILI_ACCESS_KEY_SECRET='<你的secret>' \
  -e BILI_APP_ID='<你的app_id>' \
  -v /www/wwwroot/exports:/app/exports \
  biweb-collector-node
```

查看 Postgres 所在 Docker 网络：

```bash
docker inspect biweb-postgres --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}'
```

### 宝塔面板部署

1. **上传源码** 到服务器目录 (如 `/www/wwwroot/bili-web`)

2. **服务器构建**:
   ```bash
   npm install
   npm run build
   ```

3. **宝塔 Node 项目配置**:
   - 项目目录: `/www/wwwroot/bili-web`
   - 启动命令: `npm run start`
   - 端口: `3000`

### 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@localhost:5432/db` |
| `SESSION_SECRET` | 面板会话加密密钥 | 至少 32 字符 |
| `BILI_COOKIE_SECRET` | 还原 Cookie 的对称密钥（可选，缺省用 SESSION_SECRET） | 任意字符串 |

## 项目结构

```
src/
├── app/                    # 页面路由
│   ├── dashboard/          # 监控面板
│   │   ├── blindbox/       # 盲盒分析
│   │   ├── analytics/      # 数据分析
│   │   └── board/          # 切片看板
│   ├── admin/              # 管理后台
│   └── login/              # 登录页
├── components/             # 组件
│   ├── admin/              # 管理后台组件
│   ├── bilibili/           # B站礼物/SC/舰长卡片（看板与 OBS overlay 共用）
│   ├── dashboard/          # 面板组件
│   ├── shared/             # 页面级共享组件（PageHeader/StatCard/SectionCard 等）
│   └── ui/                 # UI 基础组件
└── lib/                    # 工具库
    ├── services/           # 数据服务
    ├── bilibili-cards.ts   # 卡片配色/尺寸常量
    ├── format.ts           # 通用格式化
    └── types.ts            # 类型定义
```

## 常见问题

**Q: 登录失败？**
- 检查数据库连接是否正常
- 确认采集器已运行并写入用户数据

**Q: 页面显示空白？**
- 检查 `.env` 配置是否正确
- 查看浏览器控制台报错信息

## License

MIT
