# 代码检查

完成任务后应当运行cargo clippy

# 代码架构

新功能按业务领域组织在 `crates/features/<feature>/` 下，以 workspace crate 承载核心能力。存量代码按任务范围逐步迁移。

- 根据职责选择 `core`、`repo`、`service` 或 `worker` 等子 crate；简单功能从一个 crate 开始，不预先创建空层。
- 核心 crate 显式接收数据库、Redis 等所需依赖，返回自身或基础设施错误；不依赖后端的 `AppState`、`AppError` 或 HTTP 响应模型。跨功能调用复用所属 feature 的公共 API。
- `src/features/<feature>/` 或 `src/features/<feature>.rs` 保留 HTTP、会话处理和响应组装，并在边界转换错误。路由通过 `src/features/mod.rs` 注册，使用 `AppRouter` 区分公私有接口。
- 后端负责应用状态和任务装配；需要独立承载的任务逻辑放在对应 feature 的 `worker` crate。只提供任务注册的代码可以留在后端。
- 新增 crate 时同步配置 workspace members、依赖和检查入口；测试随行为归属迁移，复用 `infra_testing`，不反向依赖后端。

# 常用命令

以下命令需要在 `server/` 目录执行（见 `server/.justfile`）：

- `just fmt`：格式化。
- `just fix`：自动修复。
- `just check`：fmt check + clippy + test
- `just generate`：生成 SeaORM entities（需 `sea-orm-cli` 且可连数据库）
- `cargo run -- --openapi ./openapi.json`：输出 OpenAPI schema
- `just integration-test`: 运行集成测试，会自动创建并清理环境

# 编码规范

- lint 抑制：使用 `#[expect(...)]`（必要时补 `reason = "..."`），禁止 `#[allow(...)]`；仓库已启用 `clippy::allow_attributes` ，违反会出现警告。
- 使用`From`/`Into` trait 而不是单独的转换函数
- 构造查询时优先使用 Sea Query，而不是直接拼写原始 SQL 字符串；仅在 Sea Query 无法合理表达且有明确理由时，才使用原始 SQL。
- 在同一模块内，类型定义应与其直接相关的 `impl` 相邻放置；优先按“类型 -> 对应实现”的顺序组织代码，避免将多组类型定义与实现拆成分离的集中区块。
- 使用anyhow而不是在测试中unwrap
- 善用derive_more
