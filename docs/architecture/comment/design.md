# Comment (评论) 模块

> **实现状态**: ❌ 未实现 | [查看路线图](../ROADMAP.md#comment)

评论系统支持用户对数据库中各种实体进行社区讨论和反馈。

## 系统概述

评论系统包含两个主要实体：

- **comment**: 主要评论记录
- **comment_revision**: 评论的历史修订版本

## Comment 实体

评论包含以下信息：

- **内容**: 评论文本
- **状态**: 评论的当前状态 (CommentState)
- **作者**: 评论的创建者
- **目标**: 被评论的实体类型和标识 (CommentTarget)
- **父评论**: 如果是回复，则指向父评论
- **时间信息**: 创建时间和最后修改时间

### CommentState

表示评论的当前状态：

- **Active**: 可见的正常评论
- **Hidden**: 被管理员隐藏但未删除
- **Deleted**: 软删除的评论
- **Pending**: 等待审核批准

### CommentTarget

评论可以附加到各种实体类型：

- **Artist**: 艺人页面评论
- **Release**: 专辑/EP 页面评论
- **Song**: 单曲评论
- **Event**: 活动页面评论
- **Tag**: 标签定义评论
- **Correction**: 修正提案评论
- **User**: 用户资料评论

## CommentRevision 实体

评论的历史修订版本，用于追踪评论的编辑历史：

- **评论引用**: 所属的评论
- **内容**: 该版本的评论内容
- **创建时间**: 修订版本的创建时间

## 线程系统

### 回复结构

评论通过 `parent_id` 字段支持层次化线程：

- **顶级评论**: `parent_id` 为 `NULL`
- **回复**: `parent_id` 引用父评论
- **嵌套回复**: 可以回复回复，创建线程

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

## API 端点 (待实现)

### 评论 CRUD

| 端点 | 方法 | 说明 |
|------|------|------|
| `/{entity_type}/{entity_id}/comments` | GET | 获取实体评论列表 |
| `/{entity_type}/{entity_id}/comments` | POST | 创建评论 |
| `/comment/{id}` | GET | 评论详情 |
| `/comment/{id}` | PUT | 更新评论 |
| `/comment/{id}` | DELETE | 删除评论 |
| `/comment/{id}/reply` | POST | 回复评论 |

### 评论审核

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/comments/pending` | GET | 待审核评论 |
| `/admin/comment/{id}/approve` | POST | 批准评论 |
| `/admin/comment/{id}/hide` | POST | 隐藏评论 |
| `/admin/comment/{id}/restore` | POST | 恢复评论 |

### 评论历史

| 端点 | 方法 | 说明 |
|------|------|------|
| `/comment/{id}/revisions` | GET | 评论修订历史 |
