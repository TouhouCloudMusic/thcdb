# THCDB 架构文档

本目录包含 THCDB 服务器的完整架构设计文档。

## 目录结构

```
architecture/
├── ROADMAP.md              # 开发路线图和待实现功能
├── README.md               # 本文件
├── shared-types.md         # 跨模块共享类型定义
│
├── artist/                 # 艺人模块
├── release/                # 发行版本模块
├── song/                   # 歌曲模块
├── event/                  # 活动模块
├── label/                  # 厂牌模块
├── tag/                    # 标签模块
│
├── user/                   # 用户模块 (含权限、关注)
├── user-lists/             # 用户列表模块
├── comment/                # 评论模块
├── correction/             # 修正模块
├── image/                  # 图片模块
├── like-and-favorite/      # 喜欢与收藏模块
│
├── search/                 # 搜索模块
├── notification/           # 通知模块
├── statistics/             # 统计模块
├── recommendation/         # 推荐模块
├── history-tracking/       # 历史追踪模块
└── localization/           # 本地化模块
```

## 模块状态概览

| 模块 | 状态 | 说明 |
|------|------|------|
| [Artist](./artist/) | ✅ 已完成 | 查询、创建、更新、图片上传 |
| [Release](./release/) | ✅ 已完成 | 查询、创建、更新、封面上传 |
| [Song](./song/) | ✅ 已完成 | 查询、创建、更新 |
| [Event](./event/) | ⚠️ 部分完成 | 仅查询 |
| [Label](./label/) | ⚠️ 部分完成 | 仅查询 |
| [Tag](./tag/) | ⚠️ 部分完成 | 查询、投票 |
| [User](./user/) | ⚠️ 部分完成 | 基础功能，权限管理待实现 |
| [User Lists](./user-lists/) | ❌ 未实现 | |
| [Comment](./comment/) | ❌ 未实现 | |
| [Correction](./correction/) | ⚠️ 部分完成 | 创建、批准，拒绝待实现 |
| [Image](./image/) | ⚠️ 部分完成 | 上传完成，队列管理待实现 |
| [Like & Favorite](./like-and-favorite/) | ❌ 未实现 | |
| [Search](./search/) | ❌ 未实现 | |
| [Notification](./notification/) | ❌ 未实现 | |
| [Statistics](./statistics/) | ❌ 未实现 | |
| [Recommendation](./recommendation/) | ❌ 未实现 | |
| [History Tracking](./history-tracking/) | ⚠️ 部分完成 | 数据层完成，API 待实现 |
| [Localization](./localization/) | ✅ 已完成 | 数据层完成 |

## 架构原则

### 垂直切片架构

新功能应使用垂直切片架构，放在 `src/feature/` 目录下：

```
feature/{功能名}/
├── mod.rs      # 模块定义和路由
├── http.rs     # HTTP 处理器
├── repo.rs     # 数据访问
└── model.rs    # 数据模型（如需要）
```

参考现有的 `feature/tag_vote` 作为示例。

### 领域驱动设计

代码库遵循 DDD 原则：

- **domain/**: 领域模型、repository trait、领域服务
- **application/**: 应用服务，编排领域逻辑
- **adapter/inbound/rest/**: HTTP 处理器

### 修正系统

所有核心实体的变更都通过修正系统进行：

1. 用户提交修正请求
2. 审核员审核修正
3. 批准后应用到数据库
4. 历史记录保存在历史表中

## 快速导航

- **开始开发**: 查看 [ROADMAP.md](./ROADMAP.md) 了解待实现功能
- **共享类型**: 参考 [shared-types.md](./shared-types.md) 了解跨模块类型定义
- **核心实体**: [Artist](./artist/), [Release](./release/), [Song](./song/)
- **用户系统**: [User](./user/), [Comment](./comment/), [Like](./like-and-favorite/)
- **数据质量**: [Correction](./correction/), [History](./history-tracking/)
