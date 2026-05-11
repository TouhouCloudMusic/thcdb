# Error handling refactor task

## 背景

当前错误处理处于迁移中：

- 已新增 `shared::http::api_response::AppError`，作为 HTTP 边界的通用应用错误。
- `authz::ensure_permission` 已改为返回语义化的 authz 错误，再转换为 `AppError`。
- `user_collection`、`correction/comment`、`image_queue/manage` 等部分手写 `IntoResponse` slice 已开始迁移。
- 已移除应用代码对 `macros::ApiError` / `macros::IntoErrorSchema` derive macro 的依赖。
- 仍有部分 handler 直接返回 `axum::response::Response`，或者在 HTTP 层手写 `into_response()` / `map_err()`。

这次重构的目标不是消灭所有具体错误类型，而是让错误类型按用途分层：

- HTTP 边界使用足够通用的 `AppError`，保持响应格式稳定。
- 需要表达业务语义、恢复策略或调用方动作的错误，保留独立 enum / struct。
- 独立错误类型只在边界转换为 `AppError`。
- 不再为“错误来源”堆叠一层层大 enum，也不为了 OpenAPI 或状态码继续依赖难维护的 derive macro。

## 总目标

移除应用代码对 `ApiError` derive macro 的依赖，并把 HTTP 错误出口收敛到 `AppError`。

最终状态：

- handler 优先返回 `Result<T, AppError>` 或 `Result<T, SliceError>`，其中 `SliceError: Into<AppError>`。
- feature / domain 内只保留有语义价值的错误类型，例如 validation、authz、queue state、sign in state。
- 基础设施错误不直接暴露给用户，统一转换为 internal `AppError` 并记录 source。
- OpenAPI 错误响应不再要求每个错误 enum derive `IntoErrorSchema`。
- `server/crates/proc_macros` 中的 `ApiError` derive 可以删除，或至少不再被 server 应用代码使用。

## 当前进度

- [x] 新增 `AppError` 作为 HTTP 边界通用错误。
- [x] `AppError` internal 响应统一返回 `Internal server error`，内部 source 不进入 response body。
- [x] 移除 `AppError::context(...)`，诊断上下文下沉到 `DatabaseError::with_operation(...)` 或具体 slice 错误。
- [x] 新增 ZST `shared::error::PermissionDenied`，统一权限拒绝文案。
- [x] `infra::Error` 的 HTTP 出口已收口到 `AppError`，避免旧 `IntoApiResponse` 通过 `Display` 暴露内部错误。
- [x] 新增 `DatabaseError`，作为 `sea_orm::DbErr` 到应用错误之间的数据库诊断类型。
- [x] correction 提交/审核、authz、image queue manage、user collection、correction comment 的迁移路径已开始使用 `DatabaseError`。
- [x] `artist`、`song`、`label`、`tag`、`release`、`event`、`song_lyrics`、`credit_role` 的重复 `CreateError` / `UpsertCorrectionError` 已迁移为 `correction::SubmissionError`。
- [x] correction 审核路径已迁移为 `correction::ModerationError`。
- [x] `DatabaseError` 改为 `derive_more::Error`，数据库上下文 API 统一为 `with_operation(...)`。
- [x] 新增 `shared::types::BoxedError`，替代新错误路径中的本地 boxed error 别名。
- [x] 删除 `ApiError` / `IntoErrorSchema` derive macro 实现和导出，保留 `proc_macros` crate 中其他宏。
- [x] server 应用代码已移除 `ApiError` / `IntoErrorSchema` / `#[api_error(...)]` 使用点。
- [x] OpenAPI 错误响应改为复用默认 `api_response::Error` schema，不再由错误类型 derive。
- [ ] 删除 legacy `DbErr -> infra::Error` bridge；当前仅为未迁移 slice 保持可编译。
- [x] 继续清理剩余 `ApiError` / `IntoErrorSchema` derive 使用点。

## 约束

- 保持现有错误响应 JSON 形状：`{"status":"Err","message":"..."}`。
- 不为了迁移改动业务文案，除非原文案本身已经暴露内部错误或明显不准确。
- 不新增宽泛的 `impl From<E> for AppError`，例如 `From<DbErr>`、`From<anyhow::Error>`。转换应发生在语义边界。
- 不把 validation、permission、auth state 这类可恢复或可行动错误压平为裸字符串。
- 不让数据库约束全局直接决定 HTTP 语义；`DatabaseError` 只承载数据库 source 和诊断上下文，具体 slice 再决定是否升格为业务错误。
- 不新增过早抽象。只有重复模式稳定出现后，才提取小 helper。
- 不把领域层错误绑定到 axum、HTTP status 或 OpenAPI。
- 每个迁移步骤都应保持可编译，并优先按 slice 小步提交。

## Phase 1: 固定 `AppError` 的最小 API

- [ ] 审核 `server/src/shared/http/api_response.rs` 中 `AppError` 的公开方法。
- [ ] 仅保留当前迁移真实需要的方法：
  - [ ] `AppError::new`
  - [ ] `AppError::bad_request`
  - [ ] `AppError::forbidden`
  - [ ] `AppError::not_found`
  - [ ] `AppError::conflict`
  - [ ] `AppError::internal_boxed`
  - [ ] `AppError::status_code`
- [x] 移除 `AppError::context(...)`，避免 HTTP 边界对象继续承载业务语义。
- [ ] 如果新增 `unauthorized`、`too_many_requests`、`service_unavailable`，必须先找到真实调用点。
- [ ] 为 `AppError` 增加聚焦测试：
  - [ ] public error 使用传入 message。
  - [x] internal error 响应 message 固定为 `Internal server error`。
  - [x] internal error 不向 response body 暴露 source 或 context。
  - [x] `infra::Error` 直接作为 HTTP response 时也统一 500 脱敏。
  - [ ] `AppErrorKind` 到 `StatusCode` 的映射正确。
  - [x] `Error::from_err_and_code` 接受引用，避免为了生成响应消耗错误值。
- [ ] 明确 `AppError` 不负责 OpenAPI schema 生成，只负责运行时响应。

验收：

- [ ] `AppError` 没有未使用 public 方法。
- [ ] `AppError` 测试覆盖响应状态码和 body。
- [ ] `cargo clippy` 不出现新增 warning。

## Phase 2: 收敛手写 `IntoResponse` slice

目标是先处理已经手写 HTTP 响应的错误类型，降低迁移风险。

- [ ] 用以下命令列出剩余候选：
  - [ ] `rg -n "impl IntoResponse for Error|Result<.*Response>|into_response\\(\\)" server/src/features server/src/adapter server/src/domain`
- [ ] 对每个候选判断错误类型是否有业务语义：
  - [ ] 有语义：保留本地 `Error`，实现 `From<Error> for AppError`。
  - [ ] 无语义且只在 HTTP 出口使用：直接返回 `AppError`。
  - [ ] 领域层错误：移除 HTTP 依赖，在 adapter / feature 边界转换。
- [ ] 迁移优先级：
  - [ ] `features/tag_vote`
  - [ ] `features/user_profile`
  - [ ] `features/admin`
  - [ ] `features/search`
  - [ ] `features/notification`
  - [ ] `features/correction/*/http.rs` 中仍返回 `axum::response::Response` 的 handler
  - [ ] `adapter/inbound/rest/extract/auth.rs`
- [ ] 每迁移一个 slice，同步更新测试中直接调用 `into_response()` 的断言。
- [ ] 避免在 handler 中出现连续的 `map_err(crate::infra::error::Error::from).map_err(AppError::from)`；这种位置应作为下一步 service/repo 分层候选。

验收：

- [ ] 目标 slice 的 handler 不再直接返回 `axum::response::Response`。
- [ ] HTTP handler 中没有为了状态码临时拼 `api_response::Error::from_err_and_code(...).into_response()`。
- [ ] slice 内错误到 `AppError` 的转换集中在 `error.rs` 或 `mod.rs`。

## Phase 2.5: 收敛数据库错误路径

- [x] 新增 `infra::database::error::DatabaseError`。
- [x] 新增 `DatabaseResultExt::with_operation(...)`，用于 `Result<T, sea_orm::DbErr>` 在边界补数据库操作上下文。
- [x] 实现 `DatabaseError -> AppError::internal(...)`，数据库错误统一 500 脱敏。
- [x] 移除 slice 错误转换中的 `AppError::context(...)`，保留 `DatabaseError::with_operation(...)` 作为数据库诊断上下文来源。
- [x] 迁移 `adapter/inbound/rest/authz.rs`，避免权限检查 DB 错误经过 `infra::Error`。
- [x] 迁移 correction submission / moderation 错误，增加 `Database(DatabaseError)` 分支。
- [x] 迁移 `image_queue/manage` 的主要 DB 路径，新增 `Database(DatabaseError)` 分支。
- [x] 迁移 `user_collection`、`correction/comment` 的 slice error，新增 `Database(DatabaseError)` 分支。
- [ ] 继续迁移旧 slice 中的 `map_err(InfraError::from)` 和 `bimap_into()`：
  - [ ] `features/admin.rs`
  - [ ] `features/search/http.rs`
  - [ ] `features/*/find/http.rs`
  - [ ] `features/user_profile/service.rs`
  - [ ] `features/user_image`
  - [ ] `features/release_image`
  - [ ] auth 相关 repo/service
- [ ] 移除 `impl From<DbErr> for infra::Error` 的 legacy bridge。

验收：

- [ ] `rg -n "map_err\\(InfraError::from\\)|bimap_into\\(\\)" server/src/features server/src/adapter` 不再命中数据库错误转换路径。
- [ ] `rg -n "impl From<DbErr> for Error" server/src/infra/error.rs` 无结果。
- [ ] 未知数据库错误只通过 `AppError::internal(DatabaseError)` 返回统一 500。

## Phase 3: 拆分 `image_queue/manage`

当前 `image_queue/manage` 已有 slice 级 TODO。这里应优先完成，因为它暴露了 handler 同时承担 DB 查询、状态判断、业务编排和错误转换的问题。

- [ ] 梳理 `server/src/features/image_queue/manage/http.rs` 中每个 handler 的职责。
- [ ] 在 `server/src/features/image_queue/manage/repo.rs` 中收拢数据库读写：
  - [ ] 查询 queue entry。
  - [ ] 查询 target image。
  - [ ] 执行 approve / reject 需要的 DB 操作。
- [ ] 新增或扩展 `service.rs`：
  - [ ] 处理 approve / reject 编排。
  - [ ] 检查 queue state。
  - [ ] 处理通知触发的 best-effort 边界。
- [ ] 把 `manage::Error` 调整为面向调用方动作的语义：
  - [ ] `NotFound`
  - [ ] `InvalidOperation`
  - [ ] `InvalidEntry`
  - [ ] `UnknownTarget`
  - [ ] `AmbiguousTarget`
  - [ ] `PublishedNotFound`
  - [ ] `Infra(InfraError)`
- [ ] 避免在 HTTP handler 里直接处理 `entity::image_queue::Entity`。
- [ ] 保留 `From<Error> for AppError` 作为唯一 HTTP 转换点。
- [ ] 完成后删除 slice 级 TODO。

验收：

- [ ] `http.rs` 只负责 extractor、调用 service、返回 response。
- [ ] `repo.rs` 不构造 `AppError`。
- [ ] `service.rs` 不构造 axum response。
- [ ] `manage::Error` 的每个 variant 都有明确状态码映射。

## Phase 4: 迁移 auth 相关错误

auth 相关错误通常有清晰恢复语义，不能简单压平。

- [ ] 保留以下语义错误类型，但移除手写 HTTP response 重复逻辑：
  - [ ] `features/auth/error.rs`
  - [ ] `features/auth/session/error.rs`
  - [ ] `features/auth/password_reset/error.rs`
  - [ ] `domain/auth.rs`
- [ ] 为每个错误类型实现 `From<Error> for AppError`。
- [ ] handler 返回类型改为 `Result<T, AppError>` 或现有语义错误类型。
- [ ] 明确区分：
  - [ ] 未登录 / token 无效：`Unauthorized`
  - [ ] 已登录但动作不允许：`BadRequest` 或更具体业务错误
  - [ ] backend/session 存储失败：`Internal`
  - [ ] reset key 无效或过期：对用户公开的业务错误
- [ ] 避免把 session backend source message 直接暴露给用户。

验收：

- [ ] auth handler 中没有直接手写 `api_response::Error::from_err_and_code(...).into_response()`。
- [ ] auth 错误文案仍与现有 API 行为一致。
- [ ] 内部 source 只进入 log，不进入 response body。

## Phase 5: 迁移 feature error derive macro

这一步按 feature 小批量迁移，避免一次性改完整个 server。

- [ ] 用以下命令列出 `ApiError` / `IntoErrorSchema` 使用点：
  - [ ] `rg -n "derive\\(.*ApiError|ApiError|IntoErrorSchema|#\\[api_error" server/src -g "*.rs"`
- [ ] 第一批迁移低复杂度查询类 feature：
  - [ ] `features/artist/error.rs`
  - [ ] `features/release/error.rs`
  - [ ] `features/song/error.rs`
  - [ ] `features/event/error.rs`
  - [ ] `features/label/error.rs`
  - [ ] `features/tag/error.rs`
  - [ ] `features/credit_role/error.rs`
  - [ ] `features/song_lyrics/error.rs`
- [ ] 第二批迁移图片和上传类 feature：
  - [ ] `features/artist_image/error.rs`
  - [x] `features/release_image/error.rs`
  - [x] `features/user_image/error.rs`
  - [x] `domain/image/service.rs`
  - [x] `domain/image_queue/model.rs`
- [ ] 第三批迁移 correction / application 层：
  - [x] `application/error.rs`
  - [ ] `application/correction/mod.rs`
  - [x] `adapter/inbound/rest/error.rs`
- [ ] 每个错误类型迁移时做三件事：
  - [ ] 手写 `Display` 或继续使用 `snafu::Snafu` 的 display。
  - [ ] 手写 `From<Error> for AppError`。
  - [ ] 移除 `ApiError` / `IntoErrorSchema` derive 和 `#[api_error(...)]` attribute。
- [ ] 如果错误类型本质只是 validation，优先改为清晰的语义 variant，例如 `InvalidRequest(String)`。

验收：

- [ ] 每批迁移后 `cargo clippy` 通过。
- [ ] 不再为了状态码保留 `ApiError` trait impl。
- [ ] feature 错误不依赖 axum response，只在转换为 `AppError` 时知道 HTTP status。

## Phase 6: 处理 OpenAPI 错误响应

当前 `IntoErrorSchema` 把错误 enum 和 OpenAPI 响应绑得过紧。迁移后应改成共享错误响应定义。

- [x] 盘点 utoipa path 中的 `responses(...)` 是否依赖具体错误 schema。
- [ ] 优先使用共享错误 schema：
  - [x] 公开 body 使用 `api_response::Error::response_def()`。
  - [ ] 401 仍可保留空 body，符合当前行为。
- [ ] 如果确实需要每个 endpoint 声明可能状态码，使用显式 status code，而不是从错误 enum derive。
- [ ] 删除 `ErrResponseDef` / `ImpledApiError` 的前提：
  - [x] 所有 utoipa path 不再调用 `T::build_err_responses()`。
  - [x] 所有错误响应 schema 都能由共享类型表达。

验收：

- [ ] OpenAPI 仍能生成。
- [ ] 错误响应 schema 与运行时 JSON 形状一致。
- [ ] 不再需要 `IntoErrorSchema` derive。

## Phase 7: 删除 `ApiError` derive macro

必须在所有 server 应用代码迁移完成后执行。

- [x] 确认没有剩余使用点：
  - [x] `rg -n "ApiError|IntoErrorSchema|#\\[api_error" server/src server/crates/proc_macros`
- [x] 删除 `server/crates/proc_macros/src/error/api_error.rs`。
- [x] 从 `server/crates/proc_macros/src/error/mod.rs` 和 `server/crates/proc_macros/src/lib.rs` 移除导出。
- [x] 如果 `IntoErrorSchema` 无使用点，也同步删除相关 macro。
- [x] 保留 proc_macros crate 中仍被使用的其他宏，例如 `AutoMapper`、`cmp_chain`。
- [x] 清理 `Cargo.toml` 中不再需要的 macro 依赖。

验收：

- [x] `rg -n "ApiError|IntoErrorSchema|#\\[api_error" server/src` 无结果。
- [x] `cargo clippy` 不再报告 `crates/proc_macros/src/error/api_error.rs` 的 warning。
- [x] server 编译通过。

## Phase 8: 验证和回归

每个小阶段至少运行：

- [ ] `nix develop -c cargo check`
- [ ] `nix develop -c just fmt`
- [ ] `nix develop -c cargo clippy`

在涉及具体行为的 slice 上补充：

- [ ] 单元测试或现有 handler/service 测试。
- [ ] 关键 HTTP status 和 body 断言。
- [ ] OpenAPI 生成检查：`nix develop -c cargo run -- --openapi ./openapi.json`。

已知执行环境注意点：

- `direnv exec . ...` 当前可能受 `.envrc` 信任状态阻塞，优先使用 `nix develop -c ...`。
- root `just fmt` 可能被 web 侧 Prettier 插件加载问题阻塞；如果本轮只改 server，可先运行 server 目录下的格式化和 clippy，并在结果中说明 root fmt blocker。

## 完成定义

- [ ] HTTP 错误出口统一到 `AppError`。
- [ ] 需要恢复或表达业务语义的错误仍保留独立类型。
- [ ] 不再从错误来源机械分类，而是按调用方动作和用户可见语义分类。
- [ ] `ApiError` derive macro 不再被 server 应用代码依赖。
- [ ] `api_response::Error` 只作为响应 body DTO 保留，不再承担应用错误建模职责。
- [ ] 文档、测试和 OpenAPI 与新的错误模型一致。
