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
- [x] correction 提交/审核、authz、image queue manage、user collection、correction comment 的迁移路径已使用 `DatabaseError`。
- [x] `artist`、`song`、`label`、`tag`、`release`、`event`、`song_lyrics`、`credit_role` 的重复 `CreateError` / `UpsertCorrectionError` 已迁移为 `correction::SubmissionError`。
- [x] correction 审核路径已迁移为 `correction::ModerationError`。
- [x] `DatabaseError` 改为 `derive_more::Error`，数据库上下文 API 统一为 `with_operation(...)`。
- [x] 新增 `shared::types::BoxedError`，替代新错误路径中的本地 boxed error 别名。
- [x] 删除 `ApiError` / `IntoErrorSchema` derive macro 实现和导出，保留 `proc_macros` crate 中其他宏。
- [x] server 应用代码已移除 `ApiError` / `IntoErrorSchema` / `#[api_error(...)]` 使用点。
- [x] OpenAPI 错误响应改为复用默认 `api_response::Error` schema，不再由错误类型 derive。
- [x] 删除 legacy `DbErr -> infra::Error` bridge，剩余数据库调用点通过 `DatabaseError`、slice error 或 `AppError` 显式转换。
- [x] 继续清理剩余 `ApiError` / `IntoErrorSchema` derive 使用点。
- [x] 清理 handler 中提前构造 `axum::response::Response`、手写 database error response helper、以及连续 `map_err(...).into_response()` 的同类模式。
- [x] 移除 `domain::auth::AuthnError` 的 HTTP response 构造，认证错误到 HTTP 的映射收口到 auth feature 边界。
- [x] runtime/domain/feature 错误已移除 `std::backtrace::Backtrace`，需要诊断位置的错误改为 `#[track_caller]` + `Location`。
- [x] 普通应用错误已从 `snafu::Snafu` 迁移到显式 `Display` / `Error` / `From`；当前仅启动/CLI `Whatever` 路径继续保留 snafu。
- [x] 删除 `application::error` 中未使用且只携带 backtrace 的 `InvalidField` / `Unauthorized` 封装。
- [x] 删除 `adapter/inbound/rest/error.rs` 和 `application/error.rs` 这类只转发来源、没有调用方动作语义的 wrapper。
- [x] `domain::auth::AuthnError` 只保留认证失败语义；password hash / join 等技术失败折叠到 internal/infra 路径。
- [x] `domain::artist`、`domain::song`、`domain::song_lyrics` validation 已改为共享 `ValidationError<T>` 提供统一前缀，domain kind 只表达具体规则。
- [x] `domain::image` 已收口到 `ImageInputError` + `AppError` 边界，图片上传输入错误、读取头部内部错误和服务端转换错误按语义分流。
- [x] `features/tag_vote` 的 `DbErr` 不再直接进入 response body，统一经 `DatabaseError -> AppError` 脱敏。
- [x] 清理 feature error 中的宽泛 `default fn from` 转发，避免数据库错误绕过 `DatabaseError`。
- [x] correction 提交/更新路径的 `Correction not found` 已从 `infra::Error::custom(...)` 迁移到 `SubmissionError::NotFound`。
- [x] 清理 correction、auth、image queue manage、user collection 等路径中的宽泛 `BoxedError` 转发；事务提交和 boxed 内部来源显式进入 `InternalError`。
- [x] 清理 feature/service 层直接 `map_err(AppError::internal_boxed)` 的调用点，内部错误统一先收口到 `InternalError`。
- [x] 删除 `infra::Error` 模块和顶层 re-export，OpenAPI 错误响应改为直接使用共享默认 error schema。
- [x] 将 correction 写入类 feature repo trait 与 `domain::user` repo trait 的裸 boxed 返回值迁移为 `DatabaseError`。
- [x] `SeaOrmTxRepo::commit`、storage 删除队列等非 DB 技术失败不再返回裸 boxed，统一进入 `InternalError`。
- [x] `shared::secret` 保持返回 `BoxedError`，避免共享 util 泄露应用层 `InternalError` 语义，调用边界显式转换。
- [x] 删除旧 `infra::whatever::InfraWhatever` 封装，事务 commit 的内部诊断消息改用共享 `MessageError -> InternalError`。
- [x] 删除 `AppError::internal_boxed`，外部只能通过 `AppError::internal(...)` 或 `InternalError -> AppError` 进入。
- [x] `features/tag_vote::Error` 的 source 转发改为 `derive_more::Error`，移除同类手写样板。
- [x] 查询类 feature repo 边界不再返回裸 `DbErr`，由 repo 补 `DatabaseError::with_operation(...)` 后交给 HTTP / service。
- [x] auth `create_user` 的唯一约束错误收口为 `CreateUserError::AlreadyExists`，service 不再匹配底层 SQLx constraint。
- [x] 移除 feature slice error 中残留的 `From<DbErr>`，事务开始和 repo DB 调用点改为显式 `with_operation(...)`。

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
  - [ ] `AppError::status_code`
- [x] 移除 `AppError::context(...)`，避免 HTTP 边界对象继续承载业务语义。
- [x] 新增 `AppError::unauthorized`，用于 auth session / extractor 的真实调用点。
- [ ] 如果新增 `too_many_requests`、`service_unavailable`，必须先找到真实调用点。
- [ ] 为 `AppError` 增加聚焦测试：
  - [ ] public error 使用传入 message。
  - [x] internal error 响应 message 固定为 `Internal server error`。
  - [x] internal error 不向 response body 暴露 source 或 context。
  - [x] 旧 `infra::Error` HTTP 出口已删除，internal 响应由 `InternalError` / `DatabaseError` 进入 `AppError`。
  - [ ] `AppErrorKind` 到 `StatusCode` 的映射正确。
  - [x] `Error::from_err_and_code` 接受引用，避免为了生成响应消耗错误值。
- [ ] 明确 `AppError` 不负责 OpenAPI schema 生成，只负责运行时响应。

验收：

- [ ] `AppError` 没有未使用 public 方法。
- [ ] `AppError` 测试覆盖响应状态码和 body。
- [ ] `cargo clippy` 不出现新增 warning。

## Phase 2: 收敛手写 `IntoResponse` slice

目标是先处理已经手写 HTTP 响应的错误类型，降低迁移风险。

- [x] 用以下命令列出剩余候选：
  - [x] `rg -n "impl IntoResponse for Error|Result<.*Response>|into_response\\(\\)" server/src/features server/src/adapter server/src/domain`
- [ ] 对每个候选判断错误类型是否有业务语义：
  - [ ] 有语义：保留本地 `Error`，实现 `From<Error> for AppError`。
  - [ ] 无语义且只在 HTTP 出口使用：直接返回 `AppError`。
  - [ ] 领域层错误：移除 HTTP 依赖，在 adapter / feature 边界转换。
- [ ] 迁移优先级：
  - [x] `features/tag_vote`
  - [x] `features/user_profile`
  - [x] `features/admin`
  - [x] `features/search`
  - [x] `features/notification`
  - [x] `features/correction/*/http.rs` 中仍返回 `axum::response::Response` 的 handler
  - [x] `adapter/inbound/rest/extract/auth.rs`
- [ ] 每迁移一个 slice，同步更新测试中直接调用 `into_response()` 的断言。
- [x] 避免在 handler 中出现连续的 `map_err(crate::infra::error::Error::from).map_err(AppError::from)`。

验收：

- [x] 目标 slice 的 handler 不再直接返回 `axum::response::Response`。
- [x] HTTP handler 中没有为了状态码临时拼 `api_response::Error::from_err_and_code(...).into_response()`。
- [x] slice 内错误到 `AppError` 的转换集中在 `error.rs` 或 `mod.rs`。

## Phase 2.5: 收敛数据库错误路径

- [x] 新增 `infra::database::error::DatabaseError`。
- [x] 新增 `DatabaseResultExt::with_operation(...)`，用于 `Result<T, sea_orm::DbErr>` 在边界补数据库操作上下文。
- [x] 实现 `DatabaseError -> AppError::internal(...)`，数据库错误统一 500 脱敏。
- [x] 移除 slice 错误转换中的 `AppError::context(...)`，保留 `DatabaseError::with_operation(...)` 作为数据库诊断上下文来源。
- [x] 迁移 `adapter/inbound/rest/authz.rs`，避免权限检查 DB 错误经过 `infra::Error`。
- [x] 迁移 correction submission / moderation 错误，增加 `Database(DatabaseError)` 分支。
- [x] 迁移 `image_queue/manage` 的主要 DB 路径，新增 `Database(DatabaseError)` 分支。
- [x] 迁移 `user_collection`、`correction/comment` 的 slice error，新增 `Database(DatabaseError)` 分支。
- [x] 继续迁移旧 slice 中的 `map_err(InfraError::from)` 和 `bimap_into()` 的数据库错误路径：
  - [x] `features/admin.rs`
  - [x] `features/search/http.rs`
  - [x] `features/*/find/http.rs`
  - [x] `features/user_profile/service.rs`
  - [x] `features/user_image`
  - [x] `features/release_image`
  - [x] `features/artist_image`
  - [x] `features/tag_vote`
  - [x] auth 相关 repo/service
  - [x] correction detail / diff / compare / history / revisions / pending
  - [x] notification、enum table、home metadata、image queue view/manage handler
- [x] 迁移 find/search/artist-release/tag-vote/auth repo 边界，避免 HTTP 或 service 继续接收裸 `DbErr`。
- [x] 迁移 correction submission、correction comment、user collection 的 repo / service DB 边界，避免 slice error 继续宽泛接收 `DbErr`。
- [x] correction diff snapshot repo 返回 `DatabaseError`，snapshot 调用方不再在 HTTP 层补 DB operation。
- [x] 移除 `impl From<DbErr> for infra::Error` 的 legacy bridge。

验收：

- [x] `rg -n "map_err\\(InfraError::from\\)|bimap_into\\(\\)" server/src/features server/src/adapter` 不再命中数据库错误转换路径。
- [x] `rg -n "impl From<DbErr> for Error" server/src/infra/error.rs` 无结果。
- [x] 未知数据库错误只通过 `AppError::internal(DatabaseError)` 返回统一 500。

## Phase 3: 拆分 `image_queue/manage`

`image_queue/manage` 已拆分为 `model.rs`、`repo.rs`、`service.rs` 和 `http.rs`，handler 不再直接承担 DB 查询、状态判断、业务编排和错误转换。

- [x] 梳理 `server/src/features/image_queue/manage/http.rs` 中每个 handler 的职责。
- [x] 在 `server/src/features/image_queue/manage/repo.rs` 中收拢数据库读写：
  - [x] 查询 queue entry。
  - [x] 查询 target image。
  - [x] 执行 approve / reject / revert 需要的 DB 操作。
- [x] 新增或扩展 `service.rs`：
  - [x] 处理 approve / reject / revert 编排。
  - [x] 检查 queue state。
  - [x] 处理通知触发的 best-effort 边界。
- [ ] 把 `manage::Error` 调整为面向调用方动作的语义：
  - [x] `NotFound`
  - [x] `InvalidOperation`
  - [x] `InvalidEntry`
  - [x] `UnknownTarget`
  - [x] `AmbiguousTarget`
  - [x] `PublishedNotFound`
  - [x] `PermissionDenied`
  - [x] `Database(DatabaseError)`
  - [x] `Internal(InternalError)`
- [x] 避免在 HTTP handler 里直接处理 `entity::image_queue::Entity`。
- [x] 保留 `From<Error> for AppError` 作为唯一 HTTP 转换点。
- [x] 完成后删除 slice 级 TODO。

验收：

- [x] `http.rs` 只负责 extractor、调用 service、返回 response。
- [x] `repo.rs` 不构造 `AppError`。
- [x] `service.rs` 不构造 axum response。
- [x] `manage::Error` 的每个 variant 都有明确状态码映射。

## Phase 4: 迁移 auth 相关错误

auth 相关错误通常有清晰恢复语义，不能简单压平。

- [ ] 保留以下语义错误类型，但移除手写 HTTP response 重复逻辑：
  - [x] `features/auth/error.rs`
  - [x] `features/auth/session/error.rs`
  - [x] `features/auth/password_reset/error.rs`
  - [x] `domain/auth.rs`
- [x] 为 auth feature 错误类型实现 `From<Error> for AppError`。
- [x] handler 返回类型改为 `Result<T, AppError>` 或现有语义错误类型。
- [ ] 明确区分：
  - [ ] 未登录 / token 无效：`Unauthorized`
  - [ ] 已登录但动作不允许：`BadRequest` 或更具体业务错误
  - [ ] backend/session 存储失败：`Internal`
  - [ ] reset key 无效或过期：对用户公开的业务错误
- [ ] 避免把 session backend source message 直接暴露给用户。

验收：

- [x] auth handler 中没有直接手写 `api_response::Error::from_err_and_code(...).into_response()`。
- [x] auth 错误文案仍与现有 API 行为一致。
- [x] 内部 source 只进入 log，不进入 response body。

## Phase 5: 迁移 feature error derive macro

这一步按 feature 小批量迁移，避免一次性改完整个 server。

- [x] 用以下命令列出 `ApiError` / `IntoErrorSchema` 使用点：
  - [x] `rg -n "derive\\(.*ApiError|ApiError|IntoErrorSchema|#\\[api_error" server/src -g "*.rs"`
- [x] 第一批迁移低复杂度查询类 feature：
  - [x] `features/artist/error.rs`
  - [x] `features/release/error.rs`
  - [x] `features/song/error.rs`
  - [x] `features/event/error.rs`
  - [x] `features/label/error.rs`
  - [x] `features/tag/error.rs`
  - [x] `features/credit_role/error.rs`
  - [x] `features/song_lyrics/error.rs`
- [x] 第二批迁移图片和上传类 feature：
  - [x] `features/artist_image/error.rs`
  - [x] `features/release_image/error.rs`
  - [x] `features/user_image/error.rs`
  - [x] `domain/image/service.rs`
  - [x] `domain/image_queue/model.rs`
- [x] 第三批迁移 correction / application 层：
  - [x] `application/error.rs`
  - [x] `application/correction/mod.rs`
  - [x] `adapter/inbound/rest/error.rs`
- [x] 每个错误类型迁移时做三件事：
  - [x] 手写 `Display` 或使用 `derive_more::Display`。
  - [x] 手写 `From<Error> for AppError`。
  - [x] 移除 `ApiError` / `IntoErrorSchema` derive 和 `#[api_error(...)]` attribute。
- [x] 如果错误类型本质只是 validation，优先改为清晰的语义 variant，例如 `InvalidRequest(String)`。

验收：

- [x] 每批迁移后 `cargo clippy` 通过。
- [x] 不再为了状态码保留 `ApiError` trait impl。
- [x] feature 错误不依赖 axum response，只在转换为 `AppError` 时知道 HTTP status。

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

## Phase 7.5: 收敛 SNAFU 和 backtrace

参考原则：运行时错误优先表达调用方动作和诊断上下文，不再默认捕获 backtrace，也不为了 `transparent` forwarding 保留宏封装。

- [x] 移除 runtime/domain/feature 错误中的 `std::backtrace::Backtrace`。
- [x] 对需要定位创建点的诊断错误使用 `Location<'static>` 字段；普通 validation / not-found 错误不再机械携带 location。
- [x] 删除只携带 backtrace、没有调用方动作语义的错误封装：
  - [x] `application::error::InvalidField`
  - [x] `application::error::Unauthorized`
  - [x] `application::error::EntityNotFound`
- [x] 迁移领域 validation 错误到 `derive_more::Display` / `derive_more::Error`：
  - [x] `domain::artist::model::new_artist::ValidationError`
  - [x] `domain::song::ValidationError`
  - [x] `domain::song_lyrics::ValidationError`
  - [x] `domain::markdown::Error`
  - [x] `shared::error::ValidationError`
- [x] 迁移 image parsing / storage 错误，拆分用户输入错误、图片解析内部错误与 service infra 错误，去掉 SNAFU forwarding。
- [x] 迁移 auth/session/password-reset 错误，显式保留登录状态、验证码状态、session backend 失败等可行动语义。
- [x] 迁移 infra / database / adapter 的 transparent wrapper，显式实现 `Display` / `Error` / `From`。
- [x] 保留 `snafu::Whatever` / `ResultExt` 在启动和 CLI 路径中的使用；这是一次性启动失败报告，不参与 HTTP/runtime 错误模型。

验收：

- [x] `rg -n "Backtrace|backtrace" server/src -g "*.rs"` 无结果。
- [x] `rg -n "snafu::Snafu|use snafu::Snafu|derive\\(Debug, Snafu\\)|derive\\(Debug, snafu::Snafu\\)|#\\[snafu" server/src -g "*.rs"` 不再命中 runtime/domain/feature 错误；`snafu::Whatever` 只保留在启动和 CLI 路径。
- [x] `cargo clippy` 不出现本阶段新增 warning。

## Phase 8: 验证和回归

每个小阶段至少运行：

- [x] `nix develop -c cargo check`
- [x] `nix develop -c just fmt`
- [x] `nix develop -c cargo clippy`

在涉及具体行为的 slice 上补充：

- [x] 单元测试或现有 handler/service 测试。
- [ ] 关键 HTTP status 和 body 断言。
- [ ] OpenAPI 生成检查：`nix develop -c cargo run -- --openapi ./openapi.json`。

已知执行环境注意点：

- `direnv exec . ...` 当前可能受 `.envrc` 信任状态阻塞，优先使用 `nix develop -c ...`。
- root `just fmt` 可能被 web 侧 Prettier 插件加载问题阻塞；如果本轮只改 server，可先运行 server 目录下的格式化和 clippy，并在结果中说明 root fmt blocker。
- 本轮 root `nix develop -c just fmt` 仍被 web 侧 `@trivago/prettier-plugin-sort-imports` 加载失败阻塞；server `nix develop -c just fmt` 已通过。

## 完成定义

- [ ] HTTP 错误出口统一到 `AppError`。
- [ ] 需要恢复或表达业务语义的错误仍保留独立类型。
- [ ] 不再从错误来源机械分类，而是按调用方动作和用户可见语义分类。
- [ ] `ApiError` derive macro 不再被 server 应用代码依赖。
- [ ] `api_response::Error` 只作为响应 body DTO 保留，不再承担应用错误建模职责。
- [ ] 文档、测试和 OpenAPI 与新的错误模型一致。
