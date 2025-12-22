# Artist (艺人) 模块

> **实现状态**: ✅ 已完成 | [查看路线图](../ROADMAP.md)

音乐艺人实体，包括个人歌手、乐队、组合等音乐创作者和表演者。

## 基本信息

- **Name / 名称**: 艺人的主要名称
- **Aliases / 别名**: 艺人的其他名称或昵称
- **ArtistType / 艺术家类型**: [跳到细致解释的链接](#ArtistType)
- **StartDate / EndDate / 开始/结束日期**: 艺人的活动时间范围 (StartDate / EndDate)
- **Current Location / 当前位置**: 艺人当前所在地 (Location)
- **Origin Location / 起源位置**: 艺人起源地 (Location)

### ArtistType

表示不同类型的艺人：

- **Solo**: 个人艺人
- **Multiple**: 多人组合（乐队、社团等）
- **Unknown**: 未知类型

### StartDate / EndDate

表示艺人的开始和结束日期：

- 对于个人而言，表示出生和去世日期
- 对于团体而言，表示成立和解散日期
- 未知类型艺人则不适用

日期包含精度信息，见 [DatePrecision](../shared-types.md#dateprecision)。

### Location

表示地理位置，包含：

- **国家**: 所在国家
- **省份/州**: 所在省份或州
- **城市**: 所在城市

## 关系

### 核心关联

- **发行版本**: 艺人可以作为主要艺人、特邀艺人或参与者与发行版本关联
- **歌曲**: 艺人可以是作曲者、表演者或个人歌曲的参与者
- **厂牌**: 艺人可以创立或与唱片厂牌关联

### 元数据

- **本地化名称**: 支持多语言和多文字的艺人名称
- **图片**: 个人资料图片
- **链接**: 官方网站、社交媒体资料和其他外部引用

## 历史追踪

相关历史表：
- `artist_history` - 艺人基本信息变更历史
- `artist_alias_history` - 艺人别名变更历史
- `artist_localized_name_history` - 艺人本地化名称历史
- `artist_membership_history` - 艺人成员关系历史
- `artist_membership_role_history` - 成员角色历史
- `artist_membership_tenure_history` - 成员任期历史
- `artist_link_history` - 艺人链接历史

## API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/artist` | GET | ✅ | 查询艺人列表 |
| `/artist/{id}` | GET | ✅ | 获取艺人详情 |
| `/artist` | POST | ✅ | 创建艺人 (通过修正系统) |
| `/artist/{id}` | PUT | ✅ | 更新艺人 (通过修正系统) |
| `/artist/{id}/image` | POST | ✅ | 上传艺人图片 |
