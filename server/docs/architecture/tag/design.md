# Tag (标签) 模块

> **实现状态**: ⚠️ 部分完成 | [查看路线图](../ROADMAP.md#tag)

标签系统为音乐内容提供灵活的分类和元数据组织，实现丰富的发现和分类功能。

## Tag 实体

标签包含以下信息：

- **Name / 名称**: 标签的主要名称
- **TagType / 标签类型**: [跳到细致解释的链接](#TagType)
- **Short Description / 简要描述**: 标签的简短说明
- **Description / 详细描述**: 详细描述和使用指南

### TagType

表示标签的类别：

- **Genre**: 流派
- **Descriptor**: 描述符
- **Movement**: 运动
- **Scene**: 场景

## TagAlternativeName 实体

标签的替代名称，包含：

- **名称**: 替代名称文本
- **是否原始语言**: 标识是否为原始语言名称
- **语言**: 该名称的语言

## 标签关系

### 层次结构

标签可以形成层次关系，如：
"电子音乐" → "Trance" → "Uplifting Trance"

## 标签应用

### 实体标记

标签可以应用于各种实体：

- **歌曲**: 流派、情绪、乐器、主题
- **发行版本**: 整体风格、制作质量、活动
- **艺人**: 音乐风格、来源、类型
- **活动**: 位置、类型、焦点

## 历史追踪

相关历史表：
- `tag_history` - 标签基本信息变更历史
- `tag_alternative_name_history` - 标签替代名称历史
- `tag_relation_history` - 标签关系历史

## API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/tag` | GET | ✅ | 查询标签列表 |
| `/tag/{id}` | GET | ✅ | 获取标签详情 |
| `/tag/{id}/vote` | POST | ✅ | 标签投票 |
| `/{entity_type}/{id}/tags` | GET | ❌ | 获取实体的标签 |
| `/{entity_type}/{id}/tags` | POST | ❌ | 为实体添加标签 |
| `/tag/{id}/parents` | GET | ❌ | 获取父标签 |
| `/tag/{id}/children` | GET | ❌ | 获取子标签 |
| `/tag` | POST | ❌ | 创建标签 |
| `/tag/{id}` | PUT | ❌ | 更新标签 |
