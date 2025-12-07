# Correction (修正) 模块

> **实现状态**: ⚠️ 部分完成 | [查看路线图](../ROADMAP.md#correction)

修正系统通过结构化的审核流程实现协作编辑和数据库内容质量控制。

## 系统概述

修正系统包含三个主要实体：

- **correction**: 主要修正记录
- **correction_revision**: 修正的历史修订版本
- **correction_user**: 修正的用户角色和权限

## Correction 实体

修正记录包含以下信息：

- **Status / 状态**: 修正的当前状态 (CorrectionStatus)
- **CorrectionType / 修正类型**: [跳到细致解释的链接](#CorrectionType)
- **Target Entity / 目标实体**: 被修正的实体类型和标识
- **Timestamps / 时间信息**: 创建时间和处理时间

### CorrectionStatus

表示修正的当前状态：

- **Pending**: 等待审核
- **Approved**: 已接受并应用
- **Rejected**: 已拒绝并说明原因
- **Superseded**: 被新修正替代

### CorrectionType

表示修正的操作类型：

- **Create**: 添加新实体
- **Update**: 修改现有实体
- **Delete**: 删除实体
- **Merge**: 合并重复实体

### 可修正的实体

修正可以应用于各种实体类型，见 [EntityType](../shared-types.md#entitytype)。

## CorrectionRevision 实体

修正的历史修订版本，包含：

- **修正引用**: 所属的修正记录
- **历史快照**: 实体在该版本的状态
- **作者**: 创建此修订版本的用户
- **描述**: 变更说明

## CorrectionUser 实体

记录用户在修正中的角色：

- **Author**: 创建修正
- **Reviewer**: 分配审核
- **Approver**: 批准修正
- **Watcher**: 订阅更新

## 工作流程

### 1. 提交

- 用户识别需要修正的内容
- 创建修正并提出变更建议
- 提供描述和理由
- 系统分配唯一 ID 并设置状态为 `Pending`

### 2. 审核

- 合格的审核员检查修正
- 可能要求额外信息
- 可以批准、拒绝或要求修改
- 通过评论系统进行讨论

### 3. 决定

- 授权批准者做出最终决定
- 批准的修正应用到数据库
- 拒绝的修正包含解释说明
- 状态更新并记录时间戳

### 4. 应用

- 批准的修正修改目标实体
- 历史状态保存在历史表中
- 向相关用户发送通知
- 修正标记为 `Approved`

## API 端点

### 已实现

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/correction` | POST | ✅ | 创建修正 |
| `/correction/{id}/approve` | POST | ✅ | 批准修正 |
| `/corrections/pending` | GET | ✅ | 待处理列表 |

### 待实现

| 端点 | 方法 | 说明 |
|------|------|------|
| `/correction/{id}` | GET | 修正详情 |
| `/correction/{id}/reject` | POST | 拒绝修正 |
| `/correction/{id}/revisions` | GET | 修正历史版本 |
| `/correction/{id}/comments` | GET | 修正评论 |
| `/user/{id}/corrections` | GET | 用户的修正列表 |
| `/correction/{id}/supersede` | POST | 替代修正 |
