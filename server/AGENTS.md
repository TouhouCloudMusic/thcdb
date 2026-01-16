# Server 模块（Rust 后端）

本文件面向在 `server/` 目录工作的开发者与自动化 Agent：快速说明本模块的 `just` 命令用法，以及代码的基本分层/结构，便于快速定位入口与职责边界。

## `just` 命令（本目录的 `.justfile`）

在本目录执行 `just --list` 查看可用任务。

### 常用任务

- `just fmt`：格式化（`taplo fmt`、`dprint fmt`、`cargo fmt`）。
- `just fix`：自动修复（`cargo fix --workspace ...`、`cargo clippy --fix --workspace ...`）。
- `just check`：检查（格式化 check + `cargo clippy` + `cargo test`），用于 CI/提交前自检。

### 数据库相关

- `just generate`：重新生成 SeaORM Entities。
  - 会先删除 `crates/entity/src/entities/*`，再调用 `sea-orm-cli generate entity ...` 生成。
  - 需要安装 `sea-orm-cli`，并且环境变量/配置能连接到数据库。
- `just migrate <args...>`：运行迁移命令，等同执行 `cargo run -p migration <args...>`。

### 覆盖率

- `just converge`：运行 `cargo tarpaulin --workspace ...`（排除生成的 entities），用于生成覆盖率报告。

## 基本架构（如何快速找代码）

### 分层/目录结构（从外到内）

- `src/adapter/`：I/O 边界（HTTP REST、请求提取、错误映射、返回结构）。
  - REST 入口在 `src/adapter/inbound/rest.rs`，并拆分到 `src/adapter/inbound/rest/*`（middleware、extract、error 等）。
- `src/application/`：用例/应用服务层（编排 domain 与 infra；处理跨聚合流程与错误语义）。
- `src/domain/`：领域模型与核心规则（尽量保持可测试、少依赖）。
- `src/infra/`：基础设施（配置、日志、数据库、Redis、邮件、存储、后台任务等）。
- `src/shared/`：跨层共享类型（例如统一错误）。
- `src/features`：垂直切片功能层。
- `src/utils/`：通用工具（OpenAPI、校验等）。

### Workspace crates（与主程序的关系）

- 主程序包：`thcdb_rs`（本目录 `Cargo.toml` 的 `[package]`）
- `crates/entity/`：SeaORM Entities（通常由 `just generate` 生成）
- `crates/migration/`：数据库迁移（通常由 `just migrate ...` 运行）
- 其他 crate：`flow/`、`macros/`、`proc_macros/`、`libfp/` 等，按需被主程序/其它 crate 依赖


## Coding style

- 一些警告是可接受的，例如在未来可能被使用时的unused
- 应当使用expect而不是allow来抑制警告
