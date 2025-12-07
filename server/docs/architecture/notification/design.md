# Notification (通知) 模块

> **实现状态**: ❌ 未实现 | [查看路线图](../ROADMAP.md#notification)

通知系统为用户提供各类事件的提醒功能。

## 系统概述

通知系统包含：

- **Notification**: 通知实体
- **NotificationSettings**: 用户通知偏好设置

## Notification 实体

通知包含以下信息：

- **Recipient / 接收者**: 接收通知的用户
- **NotificationType / 通知类型**: [跳到细致解释的链接](#NotificationType)
- **Content / 内容**: 通知的具体内容数据
- **Read / 已读状态**: 是否已被用户阅读
- **Created At / 创建时间**: 通知的创建时间

## 通知类型 (NotificationType)

### 评论相关

- **CommentReply**: 评论被回复
- **CommentMention**: 被评论提及
- **CommentModeration**: 评论审核结果

### 修正相关

- **CorrectionApproved**: 修正被批准
- **CorrectionRejected**: 修正被拒绝
- **CorrectionNeedsReview**: 有修正需要审核
- **CorrectionComment**: 修正被评论

### 图片相关

- **ImageApproved**: 图片被批准
- **ImageRejected**: 图片被拒绝
- **ImageReverted**: 图片被撤销

### 社交相关

- **NewFollower**: 被关注
- **FollowingActivity**: 关注用户新动态

## NotificationSettings 实体

用户通知偏好设置：

- **评论回复**: 是否接收评论回复通知
- **提及**: 是否接收被提及通知
- **修正状态**: 是否接收修正状态变更通知
- **新关注者**: 是否接收新关注者通知
- **邮件通知**: 是否启用邮件通知

## 通知推送机制

### 选项 1: 轮询

- 客户端定期请求 `/notifications/unread-count`
- 简单易实现
- 延迟较高

### 选项 2: WebSocket

- 实时推送通知
- 更好的用户体验
- 需要 WebSocket 基础设施

## 依赖关系

通知系统依赖以下模块：

- **评论系统**: 评论相关通知
- **修正系统**: 修正相关通知
- **图片队列系统**: 图片相关通知
- **用户关注系统**: 社交相关通知

## API 端点 (待实现)

| 端点 | 方法 | 说明 |
|------|------|------|
| `/notifications` | GET | 通知列表 |
| `/notifications/unread-count` | GET | 未读数量 |
| `/notifications/{id}/read` | POST | 标记已读 |
| `/notifications/read-all` | POST | 全部已读 |
| `/notifications/settings` | GET | 获取通知设置 |
| `/notifications/settings` | PUT | 更新通知设置 |
