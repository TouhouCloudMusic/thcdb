# Touhou Cloud DB 开发指南

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## 开发

### 初始化环境

```bash
just init
```

这将安装git hooks

### 使用 Docker 运行开发环境（推荐）

在仓库根目录执行：

```bash
# 按需更新env
cp .env.example .env
just dev
```

默认访问地址：

- 前端：`http://127.0.0.1:3000`
- 后端：`http://127.0.0.1:12345`

停止服务：

```bash
just down
```

### 本地单独运行

#### 前端

我们使用 pnpm 管理包。

如果你希望在本地直接运行前端，建议在 `web/.env` 中添加：

```bash
# web/.env
VITE_SERVER_URL=http://127.0.0.1:12345
```

你也可以直接复制 `web/.env.example` 作为起点。

#### 后端

##### 前提条件

- rust
- [Just](https://github.com/casey/just) Task runner
- [Taplo](https://taplo.tamasfe.dev/) Toml formatter
- sea-orm-cli
- PostgreSQL
- Redis

##### 配置

如果你希望在本地直接运行后端, 你需要设置以下环境变量：

- `DATABASE_URL`（必填）：数据库连接字符串，例如 `postgres://username:password@localhost:5432/database_name`
- `REDIS_URL`（必填）：Redis 连接地址，例如 `redis://username:password@localhost:6379`
- `ADMIN_PASSWORD`（必填）：开发用管理员账户密码（后端启动时会用它初始化/更新管理员账号）

##### 配置文件与环境变量覆盖规则

后端配置由 `server/config.toml` 加载，并可通过环境变量覆盖。

- 顶层字段直接使用同名变量（例如 `DATABASE_URL`、`REDIS_URL`）。
- 嵌套字段使用 `::` 分隔层级（例如 `middleware::limit::req_per_sec`、`app::port`）。

当前代码中的优先级为：

1. `config.toml`
2. 环境变量
3. `config.dev.toml`（仅 `debug` 构建，且文件存在时）

## Commit 规范

使用大写开头，命令式的模式
