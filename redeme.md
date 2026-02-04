# 全栈部署指南 (Web + 采集器)

本项目包含 Web 前端 (Next.js) 和 数据采集器 (Python)。
由于使用了 **SQLite 原生库 (`better-sqlite3`)**，为了避免 Windows/Linux 兼容性问题 (`invalid ELF header`)，**强烈建议在服务器上进行构建**。

---

## 一、 准备工作

### 1. 数据库路径 (关键)
建议在服务器上创建一个专门的目录存放数据，例如 `/www/wwwroot/bili-data/`。
确保 Web 和 采集器 都能读写同一个 `collector.db` 文件。

---

## 二、 Web 端部署 (Node.js) - **推荐方案**

### 1. 上传源码
请将本地 `d:\biweb\web` 目录下的以下文件/文件夹上传到服务器项目目录 (例如 `/www/wwwroot/bili-web`)：

**✅ 必须上传：**
- 📂 `src` (所有源代码)
- 📂 `public` (静态资源)
- 📄 `package.json`
- 📄 `package-lock.json`
- 📄 `next.config.ts`
- 📄 `tsconfig.json`
- 📄 `.env` (包含 `DB_FILE_PATH` 配置)
- 📄 `postcss.config.mjs`
- 📄 `eslint.config.mjs`
- 📄 `components.json`

**❌ 不需要上传 (会由服务器生成)：**
- 📂 `.next` (不要传 Windows 打包的，容易报错)
- 📂 `node_modules`

### 2. 服务器端构建
在宝塔的文件管理中找到项目目录，点击 **“终端”**，或者在 SSH 中进入目录：

```bash
# 1. 安装依赖 (这一步会编译适合服务器系统的 sqlite3)
npm install

# 2. 开始构建
npm run build
```

*如果构建成功，你会看到 Done in ...ms*

### 3. 宝塔添加项目
1. **网站** -> **Node项目** -> **添加Node项目**。
2. **项目目录**: 选择 `/www/wwwroot/bili-web`。
3. **启动选项**: `npm run start`。
4. **端口**: `3000`。
5. **环境变量**: 确保在项目设置或 `.env` 文件里配置了 `DB_FILE_PATH`。

---

## 三、 采集器部署 (Python)

### 1. 准备文件
上传 `d:\biweb\collect` 目录下的所有文件到服务器，例如 `/www/wwwroot/bili-collect`。

### 2. 安装与运行
1. **Python环境**: 使用宝塔 Python 项目管理器或直接用系统 Python (需 3.8+)。
2. **安装依赖**:
   ```bash
   pip install -r requirements.txt
   ```
3. **配置**: 确保采集器代码里的数据库路径也指向 `/www/wwwroot/bili-data/collector.db` (或者修改 client.py)。
4. **运行**:
   使用 Supervisor 守护进程运行 `client_official.py`。

---

## 四、 常见问题排查

1. **Error: invalid ELF header**
   *   原因：你在 Windows 上构建了 `.next`，然后传到了 Linux 服务器。Windows 的二进制文件在 Linux 上跑不起来。
   *   解决：**删掉服务器上的 `.next` 和 `node_modules`**，在服务器上执行 `npm install` 和 `npm run build`。

2. **登录显示 "Server Error" 或 "success: false"**
   *   原因：Web 端连不上数据库，或者数据库里是空的（采集器还没把你的用户数据写进去）。
   *   解决：检查 Web 端的 `.env` 中的 `DB_FILE_PATH` 是否正确，并确认采集器已成功启动并生成了数据。
