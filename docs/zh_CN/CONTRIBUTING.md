# Touhou Cloud DB 开发指南

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## 前提条件

在开始开发 Touhou Cloud DB 之前，请确保你已经安装了以下工具：

### Rust 工具链

本项目后端使用 Rust 编写。你可以从 [rust-lang.org](https://www.rust-lang.org/) 安装它。我们通过 [`server/rust-toolchain.toml`](../../server/rust-toolchain.toml) 文件使用了特定的工具链配置，具体包括：

- **Nightly 渠道**：我们使用 Rust 的 nightly 渠道以获得最新的特性。
- **必要组件**：

  - `rustfmt`: 用于统一代码格式
  - `clippy`: 用于高级代码静态分析
  - `rustc-codegen-cranelift-preview`: 用于更快的开发编译

首次构建项目时，工具链会自动安装。你也可以手动检查或更新：

建议使用 [rustup](https://rustup.rs/) 来管理你的 Rust 安装。安装后，运行以下命令确认环境：

```bash
# 检查当前工具链
rustup show

# 更新工具链组件
rustup update
```

### 其他工具

我们使用一些额外工具以提升开发效率：

- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) 用于格式化与检查 TOML 文件。

```bash
cargo install taplo-cli
```

- **Just**: 我们使用 [Just](https://github.com/casey/just) 来管理项目脚本，便于执行常用任务。

```bash
cargo install just
```

运行 `just --list` 可查看可用命令。

- **Sea Orm CLI**: 数据库实体生成工具，使用以下命令安装：

```bash
cargo install sea-orm-cli
```

### 数据库与缓存

- **PostgreSQL**：我们使用 [PostgreSQL](https://www.postgresql.org/) 作为数据库。请参考官方文档进行安装。
- **Redis**：我们使用 [Redis](https://redis.io/) 作为缓存系统。请参考官方文档进行安装。

### 可选工具

- **Mold**（仅支持类 Unix 系统）：若想加快编译速度，可通过包管理器安装 [Mold](https://github.com/rui314/mold)，并在 [`server/.cargo/config.toml`](../../server/.cargo/config.toml) 中取消 clang 参数的注释。

注意：Windows 用户请跳过此项，Mold 不兼容 Windows。

## 配置

### 环境变量

开始开发前，请设置以下环境变量：

- `DATABASE_URL`：数据库连接字符串，例如 `postgres://username:password@localhost:5432/database_name`
- `REDIS_URL`：Redis 连接地址，例如 `redis://username:password@localhost:6379`
- `ADMIN_PASSWORD`：开发用管理员账户密码，可自定义设置

如果你希望在本地直接运行后端（而非通过 Docker），建议创建 `server/.env` 文件来保存这些变量。该文件已加入 `.gitignore`，不会影响版本控制。

示例 `.env` 文件：

```bash
# 数据库连接（支持多种格式）
# 格式1：完整的连接字符串（包含用户名与密码）
DATABASE_URL=postgres://youmu:password@localhost:5432/touhou_cloud_db

# 格式2：使用操作系统用户认证
# DATABASE_URL=postgres://youmu@localhost:5432/touhou_cloud_db

# 格式3：使用当前系统用户
# DATABASE_URL=postgres://localhost:5432/touhou_cloud_db

# Redis 本地连接
REDIS_URL=redis://localhost:6379

# 管理员密码（开发环境专用）
ADMIN_PASSWORD=your_secure_password
```

### Pre-Push 钩子

你必须先运行一次 `cargo test` 来启用 pre-push 钩子。

该钩子会在执行 `git push` 时自动触发，执行以下检查：

- 使用 `taplo fmt --check` 与 `cargo fmt --check` 进行格式检查
- 使用 `cargo clippy` 进行代码 lint 检查
- 使用 `cargo test` 运行测试

这些检查定义在 [`server/.justfile`](../../server/.justfile) 的 `pre-push` 与 `check` 任务中。

如果有任何检查失败，推送将被中断，直到问题被修复，以确保代码质量。
