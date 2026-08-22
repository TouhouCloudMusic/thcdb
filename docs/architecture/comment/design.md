# Comment (评论) 模块

> **实现状态**: 部分实现：实体评论 MVP 已支持列表、创建、删除；完整评论系统仍未实现 | [查看路线图](../ROADMAP.md#comment)

评论系统支持用户对数据库中各种实体进行社区讨论和反馈。

## 系统概述

评论系统包含四个主要实体：

- **comment_target**: 可评论目标的统一引用对象
- **comment_thread**: 可评论目标，一个实体对应一个评论线程
- **comment**: 主要评论记录
- **comment_revision**: 评论的历史修订版本

> 对齐说明：早期实现把 `target` / `target_id` 直接放在 `comment` 行上。实体评论 MVP 改为 `comment_target` 承载统一目标引用，`comment_thread` 和 `comment` 只通过普通外键引用上层对象。

## CommentTarget 实体

评论目标通过 `comment_target` 统一建模。`comment_target` 使用目标专属外键列引用 artist / release / song / label / event / tag / correction，并用 exactly-one 约束保证一行只指向一个真实目标。

所有评论线程只引用 `comment_target.id`。这样评论、后续点赞或附件等能力可以共享同一个目标身份，同时保留数据库原生外键、唯一约束、索引和级联删除。

## CommentThread 实体

评论线程包含以下信息：

- **ID**: 评论线程标识
- **目标**: 被评论目标的 `comment_target`

一个目标实体最多对应一个 `comment_thread`。

## Comment 实体

评论包含以下信息：

- **内容**: 评论文本
- **状态**: 评论的当前状态 (CommentState)
- **作者**: 评论的创建者
- **线程**: 所属评论线程
- **父评论**: 如果是回复，则指向父评论
- **时间信息**: 创建时间和最后修改时间

### CommentState

表示评论的当前状态：

- **Active**: 可见的正常评论
- **Deleted**: 软删除的评论

### CommentTarget 目标类型

评论可以附加到各种实体类型：

- **Artist**: 艺人页面评论
- **Label**: 厂牌页面评论
- **Release**: 专辑/EP 页面评论
- **Song**: 单曲评论
- **Event**: 活动页面评论
- **Tag**: 标签定义评论
- **Correction**: 修正提案评论

## CommentRevision 实体

评论的历史修订版本，用于追踪评论的编辑历史：

- **评论引用**: 所属的评论
- **内容**: 该版本的评论内容
- **创建时间**: 修订版本的创建时间

## 线程系统

### 回复结构

评论通过 `thread_id` 和 `in_reply_to_comment_id` 字段表达回复关系：

- **顶级评论**: `in_reply_to_comment_id` 为 `NULL`
- **回复**: `in_reply_to_comment_id` 引用同一 `thread_id` 下被回复的评论
- **嵌套回复**: 可以回复已有回复，并由回复关系构建层次化展示

## 审核功能

### 内容审核

- **自动过滤**: 检测垃圾信息和不当内容
- **用户举报**: 社区驱动的审核
- **管理员工具**: 隐藏、删除或编辑评论
- **申诉流程**: 用户可以对审核行为提出异议

### 富文本支持

- **Markdown**: 支持格式化文本，但不支持 html
- **链接**: 自动链接检测和格式化
- **提及**: 用户和实体提及功能
- **表情符号**: Unicode 表情符号支持

## API 端点

### 当前已实现 MVP

| 端点 | 方法 | 说明 |
|------|------|------|
| `/{target_type}/{id}/comments` | GET | 获取实体评论列表，`target_type` 支持 artist / release / song / label / event / tag |
| `/{target_type}/{id}/comments` | POST | 创建实体评论或回复 |
| `/comment/{id}` | DELETE | 删除评论 |

### 未来完整设计

#### 评论 CRUD

| 端点 | 方法 | 说明 |
|------|------|------|
| `/artist/{id}/comments` | GET | 获取艺人评论列表 |
| `/artist/{id}/comments` | POST | 创建艺人评论 |
| `/release/{id}/comments` | GET | 获取发行评论列表 |
| `/release/{id}/comments` | POST | 创建发行评论 |
| `/song/{id}/comments` | GET | 获取歌曲评论列表 |
| `/song/{id}/comments` | POST | 创建歌曲评论 |
| `/label/{id}/comments` | GET | 获取厂牌评论列表 |
| `/label/{id}/comments` | POST | 创建厂牌评论 |
| `/event/{id}/comments` | GET | 获取活动评论列表 |
| `/event/{id}/comments` | POST | 创建活动评论 |
| `/tag/{id}/comments` | GET | 获取标签评论列表 |
| `/tag/{id}/comments` | POST | 创建标签评论 |
| `/correction/{id}/comments` | GET | 获取修正评论列表 |
| `/correction/{id}/comments` | POST | 创建修正评论 |
| `/comment/{id}` | GET | 评论详情 |
| `/comment/{id}` | PUT | 更新评论 |
| `/comment/{id}/reply` | POST | 回复评论 |

#### 评论审核

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/comments/pending` | GET | 待审核评论 |
| `/admin/comment/{id}/approve` | POST | 批准评论 |
| `/admin/comment/{id}/hide` | POST | 隐藏评论 |
| `/admin/comment/{id}/restore` | POST | 恢复评论 |

#### 评论历史

| 端点 | 方法 | 说明 |
|------|------|------|
| `/comment/{id}/revisions` | GET | 评论修订历史 |
