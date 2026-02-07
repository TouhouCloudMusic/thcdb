# Server Repository Guidelines

## 概览
本文件仅描述 `server/` 后端。后端采用 Rust + Axum，数据库使用 PostgreSQL（SeaORM），缓存使用 Redis。API 文档通过 Utoipa 生成。

## 项目结构
```
server/
├── src/               # 应用源码（分层与功能切片）
│   ├── adapter/       # I/O 边界（HTTP、请求提取、错误映射、路由装配）
│   ├── domain/        # 领域模型与核心规则
│   ├── infra/         # 基础设施实现（配置、DB、Redis、邮件、任务等）
│   └── features/      # 垂直切片（mod.rs/http.rs/repo.rs/model.rs）
├── crates/            # Workspace 子 crate
│   ├── entity/        # SeaORM Entities（由SeaORM生成）
│   ├── migration/     # 数据库迁移
│   ├── macros/        # 宏与辅助
│   ├── proc_macros/   # 过程宏
│   └── fast_lrc/      # LRC 解析
├── README.md          # 后端介绍
├── Cargo.toml         # Workspace 与依赖
├── rust-toolchain.toml
├── config.toml        # 运行配置（示例）
├── Dockerfile
└── .justfile          # 开发命令
```

## 常用命令
- `just fmt`：格式化（`taplo fmt`、`dprint fmt`、`cargo fmt`）。
- `just fix`：自动修复（`cargo fix --workspace ...`、`cargo clippy --fix --workspace ...`）。
- `just check`：格式化 check + `cargo clippy` + `cargo test`。
- `just generate`：重建 SeaORM entities，需要安装 `sea-orm-cli`，并且环境变量/配置能连接到数据库。
- `just migrate <args>`：运行迁移（如 `just migrate up`）。
- `just converge`：运行 `cargo tarpaulin --workspace ...`（排除生成的 entities），用于生成覆盖率报告。
- 生成 OpenAPI：`cargo run -- --openapi ./openapi.json`。

### Workspace crates（与主程序的关系）
- 主程序包：`thcdb_rs`（本目录 `Cargo.toml` 的 `[package]`）
- `crates/entity/`：SeaORM Entities（通常由 `just generate` 生成）
- `crates/migration/`：数据库迁移（通常由 `just migrate ...` 运行）
- 其他 crate：`flow/`、`macros/`、`proc_macros/`、`libfp/` 等，按需被主程序/其它 crate 依赖

## Coding style
- 一些警告是可接受的，例如在未来可能被使用时的unused
- 应当使用expect而不是allow来抑制警告
