### 1.1 评论系统 {#comment}

**优先级**: 高 | **状态**: 完全缺失 | **设计文档**: [comment](./comment/design.md)


**实现要点**:
- `Comment` 域模型，支持线程化回复
- `CommentState` 枚举: Active, Hidden, Deleted, Pending
- `CommentTarget` 枚举: Artist, Release, Song, Event, Tag, Correction, User
- 评论修订历史追踪


### 1.2 搜索功能 {#search}

**优先级**: 高 | **状态**: 完全缺失 | **设计文档**: [search](./search/design.md)


**实现要点**:
- 跨语言搜索（中/日/英）
- 罗马化支持（日语假名、中文拼音）
- 模糊匹配
- 技术方案: PostgreSQL 全文搜索 或 Meilisearch


### 1.3 修正系统扩展 {#correction}

**优先级**: 高 | **状态**: 部分实现（已支持拒绝与统一处理接口） | **设计文档**: [correction](./correction/design.md)


**实现要点**:
- ✅ 拒绝功能（通过 `POST /correction/{id}?method=Reject`）
- ✅ 权限控制：审批/拒绝需要 `correction.manage`（默认 Admin/Moderator）
- ⏳ 审核员分配
- ⏳ Merge 类型支持
- 依赖: 通知系统

---

### 1.4 喜欢系统 {#like}

**优先级**: 高 | **状态**: 完全缺失 | **设计文档**: [like-and-favorite](./like-and-favorite/design.md)


**实现要点**:
- `user_like` 数据库表
- `LikeableEntityType` 枚举: Song, Release, Artist, Event

---

### 1.5 用户权限系统 {#permission}

**优先级**: 高 | **状态**: 部分实现（基础 RBAC + 管理 API 已实现） | **设计文档**: [user](./user/design.md)


**实现要点**:
- ✅ 权限/角色表：`permission`、`role_permission`、`user_role`
- ✅ 启动时同步默认权限映射（与 `UserRoleEnum` 一致）
- ✅ 权限检查：`ensure_permission::<P>`
- ✅ 管理 API：`GET /admin/users`、`PUT /admin/user/{id}/roles`（含变更审计）
- ⏳ 角色/权限扩展（contributor/editor 等）与更细粒度权限
- ⏳ 补齐鉴权边界（例如 `/image-queue` 列表与 `pending-count` 目前仅要求登录）

---

## 第二阶段：中心功能

### 2.1 用户关注系统 {#following}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [user](./user/design.md)


---

### 2.2 用户列表系统 {#user-list}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [user-lists](./user-lists/design.md)


**使用场景**: 播放列表、收藏夹、愿望清单、主题收藏

---

### 2.3 通知系统 {#notification}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [notification](./notification/design.md)


**通知类型**:
- 评论: 被回复、被提及、审核结果
- 修正: 批准、拒绝、需要审核
- 社交: 被关注、关注用户新动态

---

## 第三阶段：管理功能

### 3.1 图片队列系统 {#image-queue}

**优先级**: 中 | **状态**: 部分实现（管理 API + 页面已实现） | **设计文档**: [image](./image/design.md)


**实现要点**:
- ✅ 管理端：队列列表 `GET /image-queue`、待处理数量 `GET /image-queue/pending-count`
- ✅ 管理端：详情 `GET /image-queue/{id}`、处理 `POST /image-queue/{id}?method=...`
- ✅ 用户侧：`GET /user/{id}/image-queue`（本人可看；他人需 `image.queue.manage`）
- ✅ 权限控制：详情/处理需要 `image.queue.manage`（默认 Admin/Moderator）
- ⏳ 通知：审核结果通知上传者（依赖通知系统）

---

### 3.2 标签系统扩展 {#tag}

**优先级**: 中 | **状态**: 部分实现 | **设计文档**: [tag](./tag/design.md)


---

### 3.3 Credit Role Tree {#credit-role-tree}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [credit-role](./credit-role/design.md)


**实现要点**:
- Credit Role 层级树结构（parent_id 字段）
- 树形浏览 API (`GET /credit-role/tree`)
- 角色路径查询（面包屑导航）

---

## 第四阶段：数据分析

### 4.1 统计系统 {#statistics}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [statistics](./statistics/design.md)


**实现要点**:
- `entity_view_count` 表
- `user_contribution_stats` 表
- 后台定时任务更新统计

---

### 4.2 推荐系统 {#recommendation}

**优先级**: 中 | **状态**: 完全缺失 | **设计文档**: [recommendation](./recommendation/design.md)


**实现要点**:
- 基于标签的 Jaccard 相似度
- Redis 缓存 (TTL: 1小时)
- 依赖: 标签系统扩展

---

## 第五阶段：高级功能

### 5.1 历史查看 API {#history}

**优先级**: 低 | **状态**: 完全缺失 | **设计文档**: [history-tracking](./history-tracking/design.md)


**实现要点**:
- 基于 Correction 系统
- 通过 `correction_revision.entity_history_id` 获取快照
- 差异计算算法