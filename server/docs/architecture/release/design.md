# Release (发行版本) 模块

> **实现状态**: ✅ 已完成 | [查看路线图](../ROADMAP.md)

音乐发行版本，包括专辑、EP、单曲、合辑等音乐作品集合。

## 基本信息

- **Title / 标题**: 发行版本的主要标题
- **ReleaseType / 发行类型**: [跳到细致解释的链接](#ReleaseType)
- **Release Date / 发行日期**: 正式发行日期，包含精度信息 (DatePrecision)
- **Recording Dates / 录制日期**: 录制时间范围（开始和结束日期），包含精度信息

日期精度见 [DatePrecision](../shared-types.md#dateprecision)。

### ReleaseType

表示发行版本的类型：

- **Album**: 完整专辑（通常 8 首以上）
- **EP**: 迷你专辑（通常 3-7 首）
- **Single**: 单曲发行（可能包含 B 面歌曲）
- **Compilation**: 精选集或合辑
- **Demo**: 样本录音
- **Other**: 其他类型

## 相关实体

### 核心关联

- **艺人**: 主要艺人、特邀艺人和贡献者
- **曲目**: 组成发行版本的个人歌曲
- **厂牌**: 发行或发行专辑的唱片厂牌
- **活动**: 发布活动、音乐会或演出

### 元数据

- **本地化标题**: 支持多语言的发行版本标题
- **图片**: 封面艺术、背面封面、内页说明、宣传图片
- **目录编号**: 来自厂牌的官方发行标识符
- **制作人员**: 详细的制作人员信息（制作人、工程师、录音室）

## 曲目关系

发行版本通过 `release_track` 实体包含曲目，提供：

- 曲目排序和编号
- 曲目特定的元数据
- 多碟发行版本的碟片/面组织
- 个人曲目制作人员和信息

## 历史追踪

相关历史表：
- `release_history` - 发行版本基本信息变更历史
- `release_artist_history` - 发行版本艺人关联历史
- `release_catalog_number_history` - 目录编号历史
- `release_credit_history` - 发行版本制作人员历史
- `release_event_history` - 发行版本活动关联历史
- `release_localized_title_history` - 发行版本本地化标题历史
- `release_track_history` - 曲目列表历史
- `release_track_artist_history` - 曲目艺人关联历史

## API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/release` | GET | ✅ | 查询发行版本列表 |
| `/release/{id}` | GET | ✅ | 获取发行版本详情 |
| `/release` | POST | ✅ | 创建发行版本 (通过修正系统) |
| `/release/{id}` | PUT | ✅ | 更新发行版本 (通过修正系统) |
| `/release/{id}/image` | POST | ✅ | 上传封面图片 |
