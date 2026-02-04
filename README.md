# Bili Monitor Web

B站直播数据监控面板 - 前端项目

## 功能特性

- **实时监控看板** - 弹幕、礼物、舰长、SC 实时展示
- **数据统计分析** - 收入趋势、用户排行、互动数据
- **盲盒盈亏分析** - 心动盲盒开出记录与盈亏计算
- **切片看板** - 可拖拽的数据展示面板

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
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

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 部署

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
│   ├── dashboard/          # 面板组件
│   └── ui/                 # UI 基础组件
└── lib/                    # 工具库
    ├── services/           # 数据服务
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
