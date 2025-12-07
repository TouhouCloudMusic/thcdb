# History Tracking (历史追踪) 模块

> **实现状态**: ⚠️ 数据层已完成，API 待实现 | [查看路线图](../ROADMAP.md#history)

THCDB 实现了全面的历史追踪系统，为几乎所有实体提供完整的版本控制。

## 系统概述

历史追踪系统通过为主要实体创建对应的 `*_history` 表来实现：

- **完整审计轨迹** - 记录所有数据变更
- **版本控制** - 支持数据的时间点恢复
- **变更追踪** - 了解数据如何随时间演变

## 与 Correction 系统的关系

历史查看基于 Correction 系统实现：

- 每次实体变更都通过 correction 流程
- `correction_revision.entity_history_id` 指向历史表快照
- 历史查看和版本对比基于 correction 记录

## 历史表结构

### 命名规范

- **主表**: `entity_name` (如 `artist`)
- **历史表**: `entity_name_history` (如 `artist_history`)

### 历史表特征

- 包含主表的所有字段
- 额外的时间戳和版本信息
- 与主表的外键关联
- 不可修改的记录（仅插入）

## 涵盖的实体

### 核心实体历史

- `artist_history` - 艺人信息变更历史
- `release_history` - 发行版本信息变更历史
- `song_history` - 歌曲信息变更历史
- `label_history` - 厂牌信息变更历史
- `event_history` - 活动信息变更历史

### 关系实体历史

- `artist_alias_history` - 艺人别名变更历史
- `artist_localized_name_history` - 艺人本地化名称历史
- `artist_membership_history` - 艺人成员关系历史
- `artist_membership_role_history` - 成员角色历史
- `artist_membership_tenure_history` - 成员任期历史
- `artist_link_history` - 艺人链接历史

### 发行版本相关历史

- `release_artist_history` - 发行版本艺人关联历史
- `release_catalog_number_history` - 目录编号历史
- `release_credit_history` - 发行版本制作人员历史
- `release_event_history` - 发行版本活动关联历史
- `release_localized_title_history` - 发行版本本地化标题历史
- `release_track_history` - 曲目列表历史
- `release_track_artist_history` - 曲目艺人关联历史

### 歌曲相关历史

- `song_artist_history` - 歌曲艺人关联历史
- `song_credit_history` - 歌曲制作人员历史
- `song_language_history` - 歌曲语言历史
- `song_localized_title_history` - 歌曲本地化标题历史
- `song_lyrics_history` - 歌词变更历史

### 其他实体历史

- `label_founder_history` - 厂牌创始人历史
- `label_localized_name_history` - 厂牌本地化名称历史
- `credit_role_history` - 制作角色历史
- `credit_role_inheritance_history` - 角色继承关系历史
- `event_alternative_name_history` - 活动替代名称历史
- `tag_history` - 标签历史
- `tag_alternative_name_history` - 标签替代名称历史
- `tag_relation_history` - 标签关系历史

## 业务价值

### 数据完整性

- **变更追踪** - 了解数据何时、如何变更
- **错误恢复** - 能够回滚到之前的正确状态
- **数据验证** - 验证数据变更的合理性

### 协作支持

- **编辑历史** - 查看谁做了什么变更
- **冲突解决** - 处理并发编辑冲突
- **贡献追踪** - 认可用户的贡献

## 用户界面集成

### 历史查看器

- **时间线视图** - 显示实体的变更时间线
- **版本比较** - 比较不同版本之间的差异
- **变更高亮** - 突出显示具体的变更内容
- **用户活动** - 追踪特定用户的编辑活动

## API 端点 (待实现)

| 端点 | 方法 | 说明 |
|------|------|------|
| `/{entity_type}/{id}/corrections` | GET | 获取实体的所有已批准 correction 列表 |
| `/correction/{id1}/compare/{id2}` | GET | 比较两个 correction 的实体快照差异 |

### 响应内容

`/{entity_type}/{id}/corrections` 返回：

- correction ID
- 修正类型 (Create/Update/Delete/Merge)
- 作者信息
- 处理时间
- 变更描述

`/correction/{id1}/compare/{id2}` 返回：

- 两个版本的差异列表
- 变更的字段和值
