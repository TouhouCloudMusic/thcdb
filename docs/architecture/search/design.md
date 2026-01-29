# Search (搜索) 模块

> **实现状态**: 🟡 部分实现（已具备基础相似度检索能力，但缺少统一 `/search` 聚合与跨名称表搜索） | [查看路线图](../ROADMAP.md#search)

搜索功能为用户提供跨实体的内容发现能力，底层复用现有实体搜索实现。

# Overview

## 愿景

提供一个**统一、稳定、可演进**的搜索能力：

- 用户只需输入关键词，即可在 **Artist / Release / Song / Event / Label / Tag** 等核心实体中快速定位目标。
- 支持 **多语言（中/日/英）** 与常见名称变体（本地化名称、别名、alternative name），并在可控成本下逐步引入 **罗马化**（假名→罗马字、中文→拼音等）。
- 默认实现以 **PostgreSQL** 为主（复用现有 `pg_trgm` 相似度检索），同时保持接口与内部抽象可在未来迁移到 **PostgreSQL 全文检索** 或 **Meilisearch**。

## 当前现状（用于规划基线）

- 已存在若干实体的“按 keyword 查询”能力（例如 `GET /artist?keyword=...`），底层使用 `pg_trgm` 相似度排序。
- 数据库侧已提供 `pg_trgm` 扩展与部分 GiST 索引迁移，但覆盖范围尚未完整（例如别名/本地化表覆盖不齐）。
- 缺少统一的 `GET /search`：
  - 不能一次返回多实体分组结果
  - 不能按 `type` 过滤统一行为
  - 不能明确 `limit/cursor`（或其它分页方式）的跨实体约定
  - 不能覆盖名称相关表（localized / alias / alternative）的一致检索策略

## 设计原则

- **先统一入口，再逐步增强**：先交付可用的全局搜索（聚合与分组），再逐步增强覆盖面与排序质量。
- **复用优先**：优先复用/抽离现有实体搜索逻辑，避免复制粘贴与行为漂移。
- **可观测与可回滚**：任何影响排序/召回的变更，都需要可配置（阈值/权重）与可追踪（日志/性能指标）。
- **安全与性能底线**：所有查询参数化；对超短 keyword、超大 limit 做保护；用索引与 explain 验证关键路径。

## 系统概述

搜索系统需要支持：

- **多实体搜索**: 同时搜索多个实体并分组返回
- **类型过滤**: 通过 `type` 过滤实体类型；未提供时搜索全部
- **模糊匹配**: 基于 pg_trgm 的相似度匹配

## 搜索特性

### 搜索目标

目前包含实体：

- **Artist**
- **Release**
- **Song**
- **Event**
- **Label**
- **Tag**

### 搜索过滤器

- **按类型**: 通过 `type` 限定搜索特定实体类型

## 技术方案

### PostgreSQL pg_trgm

使用 `pg_trgm` 相似度搜索，包含名称相关的表：

- 主表名称字段（artist.name / release.title / song.title / event.name / label.name / tag.name）
- 对应的 alternative/localized 表（如 `*_alternative_name`、`*_localized_name`）

## API 端点 

### 基本搜索

| 端点 | 方法 | 说明 |
|------|------|------|
| `/search` | GET | 全局多实体搜索 |

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索关键词 |
| `type` | string | 实体类型过滤（可重复；不提供则搜索全部） |
| `limit` | int | 返回数量限制（MVP：按“每个实体”计数） |
| `cursor` | int | 游标（仅当 `type` 只指定一个实体时可用） |

### 返回值

```rust
struct SearchResponse {
    artists: CursorResponse<SimpleArtist>,
    releases: CursorResponse<SimpleRelease>,
    songs: CursorResponse<SongRef>,
    events: CursorResponse<SimpleEvent>,
    labels: CursorResponse<SimpleLabel>,
    tags: CursorResponse<TagRef>,
}
```

### 实现约束

- 复用或抽离现有实体搜索实现
- 搜索范围包含名称相关表（含 alternative/localized）

# MVP 约定（需求对齐与验收标准）

本节将 Task #1 的关键决策落到可实现、可验收的协议与行为上。

## 1.1 `/search` 与既有 `?keyword=` 关系

- `/search` 为统一入口，面向 Web/移动端搜索场景。
- 既有端点（如 `GET /artist?keyword=...`、`GET /release?keyword=...`）在 MVP 阶段保留不变，避免破坏已有调用方。
- `/search` 在实现上应 **复用/抽离** 既有“按 keyword 检索”逻辑（Repo 层查询表达式、排序、阈值与 limit/cursor 处理），避免复制粘贴带来的行为漂移。
- 当有前端全局搜索需求时，优先对接 `/search`；旧端点可视为“单实体搜索 legacy API”。

## 1.2 `type` 枚举与默认行为

`type` 使用 kebab-case，并支持重复参数：

- `artist`
- `release`
- `song`
- `event`
- `label`
- `tag`

默认行为：

- 不提供 `type`：搜索上述全部实体，并按实体分组返回。
- 提供 `type`：仅搜索指定的实体类型，未指定的实体分组返回空结果（`items=[]` 且 `next_cursor=null`），以保持响应结构稳定。

非法 `type`：返回 `400`。

## 1.3 分页协议（`limit/cursor`）

为了复用现有分页设施（`CursorResponse<T> { items, next_cursor }`），MVP 采用基于主表 `id` 的 cursor 分页，并对“多实体”与“单实体”分两类语义。

为避免在实现中反复写「`type` 数量 vs `cursor` 是否允许」的分支判断，建议将 HTTP Query 的“原始参数”先解析为 DTO，再 **校验并提升为类型安全的枚举**：一旦进入业务层，`cursor` 的可用性由 enum 结构强制保证。

```rust
#[derive(Clone, Copy, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub enum SearchType {
    Artist,
    Release,
    Song,
    Event,
    Label,
    Tag,
}

#[derive(Clone, Debug)]
pub enum SearchScope {
    All,
    Only(Vec<SearchType>),
}

#[derive(Clone, Copy, Debug)]
pub enum SearchPagination {
    /// 未提供 `type` 或提供多个 `type`
    Multi { limit: u32 },
    /// `type` 恰好一个
    Single { limit: u32, cursor: Option<i32> },
}

pub struct SearchRequest {
    pub keyword: String,
    pub scope: SearchScope,
    pub pagination: SearchPagination,
}
```

- **多实体搜索**（未提供 `type` 或提供多个 `type`）
  - `limit` 表示“每个实体最多返回 N 条”
  - `cursor` **不支持**（返回 `400`）
  - 响应仍返回每个实体的 `next_cursor`（基于该实体结果集最后一条的 `id`），以便客户端需要翻页时改用“单实体搜索”方式继续请求。
- **单实体搜索**（`type` 恰好一个）
  - `limit` 表示“该实体返回 N 条”
  - `cursor` 支持，语义与现有 `/xxx/explore` 一致：从 `cursor` 之后继续取下一页

参数保护（MVP）：

- `keyword`：trim 后长度 `< 2` 直接 `400`（避免超短词触发大范围相似度扫描）
- `limit`：默认 `10`，最大 `50`

## 1.4 排序语义

- 每个实体内部：按相关性排序（pg_trgm similarity distance 从小到大），并追加二级排序键（例如 `id asc`）确保稳定性。
- 跨实体：MVP 不做“全局统一相关性排序”，只按实体分组返回。

## 1.5 最小返回结构（JSON schema）

MVP 返回结构稳定、可扩展：

- 顶层响应与其他 REST API 一致，使用统一 `ApiResponse` 包装（当前实现为 `Data<T>`）：`{ "status": "Ok", "data": SearchResponse }`
- `SearchResponse` 固定包含 `artists/releases/songs/events/labels/tags` 六个分组字段
- 每个分组使用 `CursorResponse<T>`：
  - 必含：`items`（数组）
  - 必含：`next_cursor`（int 或 null）
- `items` 的元素类型：MVP 使用轻量视图模型（`Simple*`/`*Ref`），用于搜索结果列表展示；需要详情时由客户端再用 `id` 调用各实体详情端点。
- 命中细节（可选扩展，不在 MVP 做）：是否命中别名/本地化字段、命中的具体字符串、相似度分数等，可在未来以 `SearchHit` 包装或新增字段方式演进。

## 1.6 验收用例（至少 10 条）

1. `GET /search?keyword=utada`：可返回 Artist / Release / Song 等分组结果；各分组最多 `limit` 条，且结构完整。
2. `GET /search?keyword=%20%20utada%20%20`：等价于 `keyword=utada`（trim 生效）。
3. `GET /search?keyword=UTADA`：大小写不敏感，结果与 `utada` 一致或相近。
4. `GET /search?keyword=%E5%AE%87%E5%A4%9A%E7%94%B0%E3%83%92%E3%82%AB%E3%83%AB`（宇多田ヒカル）：可命中相关 Artist（多语言字符正常工作）。
5. `GET /search?keyword=%E5%91%A8%E6%9D%B0%E4%BC%A6`（周杰伦）：可命中相关 Artist（中文字符正常工作）。
6. `GET /search?keyword=ab`：允许（长度=2），且不会导致明显性能问题（需要后续用 explain/基准验证）。
7. `GET /search?keyword=a`：返回 `400`（超短词保护）。
8. `GET /search?keyword=utada&type=artist`：仅 `artists.items` 非空，其它分组为空。
9. `GET /search?keyword=utada&type=unknown`：返回 `400`（非法 type）。
10. `GET /search?keyword=utada&type=artist&limit=2`：返回 2 条以内；若有下一页则 `artists.next_cursor` 非空。
11. `GET /search?keyword=utada&type=artist&limit=2&cursor=<cursor>`：能正确翻页（不会重复上一页最后一条）。
12. `GET /search?keyword=__no_such_keyword__`：所有分组 `items=[]` 且 `next_cursor=null`。

# 2. 数据库与索引准备（pg_trgm 路线的 MVP）

## 2.1 pg_trgm 索引覆盖审计

当前 keyword 搜索实现使用 `lower(column)` 进行大小写归一化，并通过 `pg_trgm` 的相似度运算符做过滤与排序。因此索引必须覆盖 **表达式 `lower(column)`**，否则查询无法命中索引。

MVP 需要覆盖的名称字段（主表 + 名称变体表）：

- `artist.name`
- `artist_localized_name.name`
- `release.title`
- `release_localized_title.title`
- `song.title`
- `song_localized_title.title`
- `event.name`
- `event_alternative_name.name`
- `label.name`
- `label_localized_name.name`
- `tag.name`
- `tag_alternative_name.name`

索引类型选择：`GiST (gist_trgm_ops)`。

- 代码路径按“相似度距离”排序取前 N 条，更适配 GiST 的使用方式。
- 与既有迁移保持一致，避免 GiST/GiN 混用导致的维护复杂度。

相关迁移：`server/crates/migration/src/m20260106_000000_fix_pg_trgm_lower_indexes/`。

## 2.3 相似度阈值与短词（< 3）策略

### 相似度阈值

MVP 建议以 `pg_trgm.similarity_threshold` 为全局默认阈值，并允许按实体覆盖：

- 全局默认阈值：用于大多数实体
- 实体覆盖阈值：对召回/精度要求不同的实体可单独配置

实现建议：在执行每个实体查询时，使用事务内的 `SET LOCAL pg_trgm.similarity_threshold = <value>`，既保留 `%` 运算符可用索引的能力，又避免连接池下跨请求污染会话级设置。

### 短词（< 3）降级

- `keyword` 长度为 `2`：不走 trgm 相似度过滤，改用 `lower(column) LIKE '<kw>%'
  ` 的前缀匹配 + 严格的 `limit`（防止扫描放大）。

如未来需要进一步优化短词前缀查询，可再引入 `btree (lower(column) text_pattern_ops)` 类型的前缀索引（不作为 MVP 必须项）。

# Task

- [x] 1. 需求对齐与验收标准
  - [x] 1.1 明确“全局搜索”与各实体 `?keyword=` 的关系：是直接复用（调用/抽离）还是替代（逐步弃用旧端点）
  - [x] 1.2 明确 `type` 的枚举与映射（API 值 ↔︎ 领域实体），以及“不提供 type”的默认行为（全量搜索并分组返回）
  - [x] 1.3 明确分页协议：`limit/cursor`（与本文档一致；需要说明跨实体/跨类型时的语义）
  - [x] 1.4 明确排序语义：每个实体内按相关性排序；跨实体是否需要统一相关性（MVP 可先不做）
  - [x] 1.5 定义最小可用返回结构（JSON schema）：哪些字段必须包含、哪些可选（例如是否返回命中的 name variant）
  - [x] 1.6 列出明确的验收用例（至少 10 条）：中/日/英、大小写、空格、短词、别名、本地化、无结果、type 过滤、分页边界

- [ ] 2. 数据库与索引准备（pg_trgm 路线的 MVP）
  - [x] 2.1 审计当前 `pg_trgm` 迁移覆盖：主表 + localized/alias/alternative 表是否都建了合适索引（GiST/GiN 选择需记录理由）
  - [x] 2.2 补齐缺失索引：例如 `song_localized_title`、`artist_alias` 等名称变体表（以实际 schema 为准）
  - [x] 2.3 设定相似度阈值策略（全局默认 + 可按实体覆盖），并记录短 keyword（< 3）时的降级方案（例如 ILIKE 前缀）
  - [ ] 2.4 性能基线：为每个实体至少写 1 个 `EXPLAIN (ANALYZE, BUFFERS)` 样例，记录在本文或单独性能笔记中（见 `performance.md`）

- [ ] 3. 后端：新增统一 `/search` Feature（聚合与分组）
  - [ ] 3.1 在 `server/src/features/` 新增 `search/` 垂直切片（`mod.rs/http.rs/repo.rs/model.rs`），并接入 router/OpenAPI TAG
  - [ ] 3.2 定义请求 DTO：`keyword`（必填）、`type`（可选）、`limit`、`cursor`
  - [ ] 3.3 定义响应模型：按实体分组的结果容器（例如 `artists/releases/...`），并统一带上分页元信息
  - [ ] 3.4 实现 `type` 过滤：只执行被选中的实体查询，避免无谓的 DB round-trip
  - [ ] 3.5 复用策略落地：优先抽离各实体现有“keyword 检索”的公共片段（相似度表达式、排序、limit/cursor）
  - [ ] 3.6 实现跨名称表检索（第 1 版即可）：将主表 + localized/alias/alternative 的命中合并到同一实体结果集中（去重、取最高分）
  - [ ] 3.7 边界处理：空/全空格 keyword、过长 keyword、limit 上限、cursor 越界、非法 type
  - [ ] 3.8 可观测性：记录标准化后的查询参数与耗时；对慢查询打点（trace/span）

- [ ] 4. 测试与回归保护
  - [ ] 4.1 为 `/search` 增加 API 层测试（至少覆盖：type 过滤、分页、无结果、非法参数）
  - [ ] 4.2 为“跨名称表检索”增加数据库集成测试夹具（构造 localized/alias 命中）
  - [ ] 4.3 对排序稳定性做断言（同一输入下结果顺序一致；必要时增加二级排序键，例如 id）

- [ ] 5. 前端对接（如本仓库 web 需要同步实现）
  - [ ] 5.1 定义前端调用协议：输入防抖、最小字数触发、加载态与空态
  - [ ] 5.2 设计结果展示：按实体分组展示 + type 筛选入口；支持键盘导航（可选）
  - [ ] 5.3 监控与埋点（可选）：搜索触发次数、无结果比例、点击转化

- [ ] 6. 下一阶段：跨语言/罗马化与搜索引擎演进
  - [ ] 6.1 明确罗马化策略：写入时生成并存储，还是查询时转换；字段/表结构与回填策略
  - [ ] 6.2 评估并试验 PostgreSQL 全文检索：`tsvector`、分词配置、权重、highlight（如需要）
  - [ ] 6.3 评估并试验 Meilisearch：索引结构、同步机制（CDC/定时任务）、一致性与回滚方案
  - [ ] 6.4 抽象内部 Search Provider 接口：确保从 `pg_trgm` 迁移到 FTS/Meilisearch 不需要改动 HTTP 协议
