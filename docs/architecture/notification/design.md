# Notification (通知) 模块

> **实现状态**: 部分实现。站内 Inbox、Read、Saved、SSE 失效通知与 90 天清理任务已实现；通知偏好和外部投递通道未实现。

Notification 使用 PostgreSQL 保存公共业务 event、recipient-owned notification 和用户状态。SSE 只发送缓存失效信号，不承载通知正文。

## 持久化模型

| 表 | 职责 |
| --- | --- |
| `notification` | 某个 recipient 实际拥有的通知。它是 API、分页、Read、Saved 和 retention 的稳定对象。 |
| `notification_event` | 公共业务 event。保存 event type、actor、发生时间、幂等 identity 和 live entity reference。 |
| `notification_entry` | 公共 event 在一条 notification aggregate 内的 membership。保存 aggregate sequence、Inbox position 和投递时间。 |
| `comment_thread_notification` | `CommentThreadUpdated` notification 的类型化聚合身份，保证同一 recipient 与 comment thread 只有一条聚合通知。 |
| `<event_type>_notification_event` | 某种 event 独有的类型化历史事实。字段使用数据库类型、外键和 CHECK 约束，不保存 JSON 副本。 |
| `account_role_changed_notification_event` | `AccountRoleChanged` event 的新角色集合，每行对应一个角色。 |

关系如下：

```text
notification 1 --- N notification_entry N --- 1 notification_event
      |
      0..1
comment_thread_notification

notification_event 1 --- 0..1 <event_type>_notification_event
notification_event 1 --- 0..N account_role_changed_notification_event
```

同一个公共 event 可以进入多条 notification。公共历史事实和 source reference 只保存一次，entry 不复制 event 数据。

`notification_event` 的类型化 nullable references 由 event shape CHECK 约束为封闭 union。只有 source 删除会清空的 comment、thread 和 collection reference 允许领域空值；其他 event 类型必须提供自己的必需引用，且不能混入无关引用。Moderation event 使用 `CorrectionApproved`、`CorrectionRejected`、`ImageQueueApproved`、`ImageQueueRejected` 和 `ImageQueueReverted` 精确记录已经发生的操作。

每个业务 notification crate 负责解析 recipient 和权限，并使用 Notification core 提供的领域构造函数创建 `CreateNotificationsCommand`。该命令将业务动作、actor、发生时间、业务 identity 和已解析的 recipient 分组绑定为一个有效投递计划。Notification core 根据计划创建公共 event、写入类型化历史事实，并物化一个或多个 recipient-owned notification aggregate。写入入口不接受裸 JSON、独立 discriminator、aggregate kind 或调用方拼接的幂等键。

Event-owned data 与 `notification_event` 在同一事务中写入。`CorrectionReviewRequested`、`CorrectionUpdated`、moderation、`UserFollowed`、`CollectionFollowed` 和 `CollectionItemAdded` 没有 `event_type` 与 live reference 之外的额外事实，因此不创建空 data row。Data 表不复制 `event_type`；类型表与 event type 的对应由封闭写入路径保证。

Collection notification 只保存 `notification_event.user_collection_id` 这项 live reference。列表 API 根据该引用加载当前 collection：recipient 可以访问时返回当前 ID 和标题，引用被删除时返回 `Deleted`，collection 仍存在但不可访问时返回 `Restricted`。删除和受限状态不保存或返回历史标题。

`notification.id` 是唯一 API identity 和分页 tie-breaker。API 将 aggregate 的 `last_seq` 作为字符串返回，避免 JavaScript `int64` 精度损失。

## 类型与分类

| Category | Notification aggregate kind | 含义 |
| --- | --- | --- |
| `Correction` | `CorrectionReviewRequested` | 修正请求审核 |
| `Correction` | `CorrectionUpdated` | 已订阅修正发生更新 |
| `Correction` | `CorrectionModerated` | 修正被批准或拒绝 |
| `Comment` | `CommentReplied` | 单次直接回复 |
| `Comment` | `CommentThreadUpdated` | 评论 thread 聚合更新 |
| `Social` | `UserFollowed` | 用户被关注 |
| `Collection` | `CollectionFollowed` | 公开 collection 被关注 |
| `Collection` | `CollectionItemAdded` | 已关注 collection 新增条目 |
| `ImageQueue` | `ImageQueueModerated` | 图片队列项目被批准、拒绝或撤销 |
| `Account` | `AccountRoleChanged` | 当前用户的角色发生变化 |

`NotificationEventType` 记录精确业务事实，`NotificationAggregateKind` 记录 recipient-owned 展示与聚合类型。Correction 和 ImageQueue 的多个具体 moderation event 分别汇入宽泛的 `CorrectionModerated` 与 `ImageQueueModerated` aggregate；API 再从精确 event type 投影现有 `action` 字段。

列表 state 包含 `inbox`、`unread` 和 `saved`。`inbox` 包含 Saved notification；`saved` 只是额外筛选，不创建副本。

## Event 幂等与投递

具有稳定业务 identity 的 event 使用 `notification_event.idempotency_key` 的 partial unique index保证 event 存续期间的幂等。`CollectionItemAdded` 使用 `user_collection_item.id` 构造 identity，`CommentCreated` 使用 `comment_id` 构造 identity，并额外由 `UNIQUE(comment_id)` 约束引用唯一性。Follow 操作由业务关系插入事务保证幂等，不额外创建 event key。Notification event 与源业务变更在同一事务内同步创建；当前没有会在 retention 后重放 event 的异步通道。

降噪窗口属于 recipient delivery eligibility，不属于 event identity：

- `UserFollowed`、`CollectionFollowed`: 同一 recipient 和 follow 关系 1 分钟内只实际投递一次。
- `CollectionItemAdded`: 同一 recipient 和 collection 30 分钟内只实际投递一次。

窗口从最近一次实际 entry 的 `created_at` 计算。被抑制的业务事件不创建 entry，也不延长窗口。`CollectionItemAdded` 的窗口决策由 collection 行锁串行化。

Recipient 在 event 创建时由 subscription 和权限规则解析。除账号角色变更外，actor 不接收自己产生的 notification。Event 已存在时不向后来新增的 recipient 补历史 membership。

当前没有 notification mute 设置。Mute 属于尚未实现的通知偏好，不是本轮持久化模型的一部分。

Notification core 在同一业务事务中创建 event、Notification 和第一条 entry。每个 recipient 使用 `notification_inbox_state` 事务性分配单调的 `inbox_seq`；该序号允许空洞。ThreadUpdate append 按 recipient 顺序分配 Inbox position，再锁定 recipient-owned notification，并从 materialized `last_seq` 分配下一 aggregate sequence。Entry 插入成功后，同一事务推进 `last_seq` 和 `last_activity_at`。重复 event membership 不推进 aggregate，但可以消耗一个 Inbox position。

## Comment Notification

DirectReply 和 ThreadUpdate 是两条独立 notification：

- `CommentReplied` 是单 event notification，`seq` 固定为 1。
- `CommentThreadUpdated` 按 recipient 与 thread 聚合，新 comment 持续追加 entry。
- Recipient 同时满足直接回复和 thread subscription 时，同一个 `CommentCreated` event 进入两条 notification。
- 两条 notification 的 Read、Saved、分页 identity 和 retention 生命周期完全独立。

Comment 的 live identity 由 `notification_event.comment_id` 保存；comment 删除后，外键通过 `ON DELETE SET NULL` 清空，API 的 `Deleted` 状态不返回 ID。Reply 的事件时正文位于 `comment_created_notification_event`。Direct Reply 不保存或返回 parent comment preview，因为通知只需表达 recipient 的 comment 被回复。

创建 comment 前会锁定 comment thread。删除 comment 使用同一行锁，因此已删除 comment 不能与并发回复创建交错成新的 parent 关系。

## Read

所有 notification 使用两个独立 watermark：

```text
unread_after_seq = max(read_through_seq, purged_through_seq)
entry.seq > unread_after_seq
```

满足该条件的 entry 未读。`read_through_seq` 记录用户行为，`purged_through_seq` 记录 retention 已删除的前缀。两者从 0 开始且只能单调前进。DirectReply 是单 event sequence：0 表示未读，1 表示已读。

单条 Read 接收当前 item 的 `through_seq`。该值来自当前分页 snapshot 内的 aggregate head。后端验证 recipient ownership 和 `through_seq <= last_seq`，再使用 `GREATEST` 推进 `read_through_seq`。并发追加的更大 sequence 不会被读取。

用户创建 comment 时，Web 提交当前已加载评论中的最后一个 `read_through_comment_id`。后端验证 comment 属于当前 thread，并只推进该用户对应的 ThreadUpdate notification；DirectReply notification 不受影响。没有 boundary 时不推断用户看过哪些 comment。

## Mark All Read

首次 `GET /notifications` 在 `REPEATABLE READ` 事务中读取 recipient 的 `notification_inbox_state.last_inbox_seq`。该值成为 `snapshot_inbox_seq`，同一分页会话的所有页面只投影 `inbox_seq <= snapshot_inbox_seq` 的 entry。State 行更新与 entry 在同一写事务提交，因此未被首屏 MVCC snapshot 看见的 entry 一定具有更大的 Inbox position。

`POST /notifications/read-all` 接收 `snapshot_inbox_seq`，并在一个事务内为每条 notification 推进该边界内最大的 aggregate `seq`。该操作覆盖全部 category、Saved 状态和未加载分页。并发 append 获得更大的 Inbox position 并保持未读。

Inbox snapshot 只固定 append membership。Read、Saved、权限和实体删除仍读取当前状态；retention 可以删除 snapshot 内的旧 entry。

## Saved

`notification.saved_at IS NOT NULL` 表示 Saved。Saved 与 Read 正交：

- 保存使用 `COALESCE(saved_at, clock_timestamp())`，因此幂等。
- 取消保存只把 `saved_at` 设为 `NULL`。
- 新 event 追加到 Saved ThreadUpdate 时，Saved 状态不变。
- Saved notification 不受普通 retention 删除。

## 历史事实与删除

Comment notification 将事件时正文保存在类型化 event 表。作者和创建时间复用 `notification_event.actor_user_id` 与 `notification_event.occurred_at`。编辑 live comment 不改写历史事实。

读取时仍检查 live comment 和 thread：

- Comment projection 使用 `Visible` / `Deleted` 状态 union。Comment 或 thread 已删除时返回 `Deleted`，且该 variant 不包含 ID 或历史正文。`comment_id` 是可空 live 外键。
- Collection reference 使用 `Available` / `Restricted` / `Deleted` 状态 union。当前 recipient 可访问时返回 live identity 和当前标题；不可访问或已删除时不返回实体 ID 或历史标题。
- Source entity 仍存在时可使用当前标题等 live metadata。

ImageQueue 的管理与评论交互权限不是内容保密边界。权限变化不会隐藏已投递的 comment 历史正文。

读取端先查询 snapshot head，再按当前 batch 涉及的 notification kind 批量读取对应 data 表。缺少必需 data row、状态超出通知允许集合或持久化 event 不满足对应类型的不变量时，只跳过该 notification，记录结构化错误，并继续扫描直到填满页面或数据耗尽。数据库和事务错误仍使请求失败。公开 API 不提供通用 `Unavailable` body。

Unread count 直接统计持久化的未读 notification aggregate，上限为 100。该计数不执行展示投影，因此缺少必需 data row 的 aggregate 仍计入角标。

## 分页

`GET /notifications` 直接以 `notification` 为分页单位。一条数据库 notification 对应一个 API item，不在 service 中 fan-out。

固定 `snapshot_inbox_seq` 后，每条 notification 的排序位置为该 boundary 内最后一条 entry 的 `inbox_seq`。排序键为：

```text
snapshot_head.inbox_seq DESC
```

Cursor 包含 `snapshot_inbox_seq` 和 `before_inbox_seq`。同一 recipient 的 Inbox position 唯一，因此不需要额外平局键。Read 与 Saved 不参与排序。坏 item 被跳过时，service 继续扫描，并只在确认存在下一条可渲染 notification 时返回 `next_cursor`。

## 用户事件流

`GET /user-events/stream` 是独立于 notification feature 的用户事件流。Notification feature 只发布无业务 payload 的 `notification-inbox-updated` 事件，Web 收到后使 notification list 和 unread count query 失效。

角色管理用例同时产生两项独立结果：写入角色变更 notification 后发布 `notification-inbox-updated`，更新授权状态后发布 `authorization-updated`。Web 分别刷新通知和当前用户授权状态。两类事件复用同一 SSE 连接，但不由 notification feature 统一解释。

当前单实例部署使用进程内 bounded broadcast。事件携带目标 user ID，SSE consumer 按当前用户过滤；连接建立或 consumer lag 时重新发送两类失效信号以恢复最新状态。该传输是 best-effort，不承担持久化职责。多实例部署需要以 transactional outbox 和 Redis Pub/Sub 替换进程内发布层，本地 broadcast 只负责连接 fan-out。

新投递、Read、Mark all read、Saved、取消 Saved，以及 source entity metadata 变更或删除，都会在事务提交后发送失效通知。同一个公共 event 同时生成 DirectReply 和 ThreadUpdate 时，每个 recipient 只接收一次失效信号。

## HTTP API

| 方法 | 端点 | 契约 |
| --- | --- | --- |
| `GET` | `/notifications` | 按 state/category 列表，支持固定 Inbox watermark 的 keyset pagination |
| `GET` | `/notifications/unread-count` | 返回持久化的未读 notification aggregate 数，上限为 100 |
| `POST` | `/notifications/{notification_id}/read` | 通过 `through_seq` 单调推进一条 notification |
| `POST` | `/notifications/read-all` | 读取当前 recipient 在 `snapshot_inbox_seq` 内的全部 notification |
| `PUT` | `/notifications/{notification_id}/saved` | 幂等保存 notification |
| `DELETE` | `/notifications/{notification_id}/saved` | 取消保存 notification |

通知偏好、archive、邮件和 push notification 端点当前不存在。

## Retention

`notification_cleanup` use case 由 worker 按 `0 0 0 * * *` 每日运行。保留期由 `notification.retention_days` 配置，默认 90 天。执行失败后，worker 使用指数退避和 jitter 重试三次。

每个事务使用一条带 `LIMIT` 的 `FOR UPDATE SKIP LOCKED` 查询原子领取最多 1,000 条 notification，并按 recipient 与 notification ID 的稳定顺序锁定 aggregate。每批最多删除 1,000 条 entry。

未 Saved 且 `last_activity_at` 早于 cutoff 的小 aggregate 整条删除。较大的 aggregate 先按批清理旧前缀，直到剩余 entry 可在预算内整条删除。Saved 或仍活跃的 aggregate 只删除 `purged_through_seq` 之后、`last_seq` 之前的连续过期前缀；最新 entry 始终保留。

Entry 删除、purge watermark 更新、notification 删除和 event GC 位于同一事务。Entry-owned data 随 entry 级联删除；event-owned data 随 event 级联删除。Event GC 只处理当前批次删除 entry 涉及的 event，并在全局确认没有其他 entry 引用后删除。

取消 Saved 后，如果 notification 已超过普通保留期，它在下一次 cleanup 立即具备删除资格。
