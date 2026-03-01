# Server/Backend Project Guidelines

## 代码检查

完成任务后应当运行cargo clippy

## 代码架构（迁移中）

当前处于从整洁架构（adapter/application/domain/infra）迁移到垂直切片（feature-first）的中间态：存量代码沿用原分层，新功能优先按垂直切片落地

- 新功能优先放在 `src/features/<feature>/`（或简单场景用 `src/features/<feature>.rs`），对外暴露 `router()`；在 `src/features/mod.rs` 添加 `pub mod <feature>;` 并在 `router()` 里 `.merge(<feature>::router())`。
- feature 内建议按职责拆分 `http.rs`（axum handler + utoipa 注解）、`service.rs`（用例/事务编排）、`repo.rs`（DB 读写封装）、`model.rs`/`error.rs`；尽量保持 slice 自包含，跨 feature 复用优先下沉到 `domain/` 或 `shared/`。
- HTTP 入口在 `src/adapter/inbound/rest.rs`：OpenAPI + middleware + 路由组装（通过 `features::router()`）；需要区分公私有接口时使用 `AppRouter`。

## 常用命令

以下命令需要在 `server/` 目录执行（见 `server/.justfile`）：

- `just fmt`：格式化。
- `just fix`：自动修复。
- `just check`：fmt check + clippy + test。
- `just generate`：生成 SeaORM entities（需 `sea-orm-cli` 且可连数据库）。
- `cargo run -- --openapi ./openapi.json`：输出 OpenAPI schema。

## 编码规范

- lint 抑制：优先使用 `#[expect(...)]`（必要时补 `reason = "..."`），避免随意新增 `#[allow(...)]`；仓库已开启 `clippy::allow_attributes` 提醒，新增 `allow` 需要有明确理由。
- 错误处理：沿用现有 `snafu` 的 `ResultExt/whatever_context` 风格，为失败添加上下文。

## 生成的文件/目录

以下内容通常由命令生成，禁止手动编辑：

- `crates/entity/src/entities/`：SeaORM entities（`just generate` 生成）
- `openapi.json`（或任意 OpenAPI 输出文件）：由 `cargo run -- --openapi <path>` 生成
