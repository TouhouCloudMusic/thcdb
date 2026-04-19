# THCDB 架构文档

本目录包含 THCDB 服务器的完整架构设计文档。

## 目录结构

```
architecture/
├── ROADMAP.md                        # 开发路线图和待实现功能
├── README.md                         # 本文件
├── shared-types.md                   # 跨模块共享类型定义
│
├── data_explore/                     # 数据管理
│    ├── search/                      # 数据搜索
│    └── examine_and_verify/          # 操作审核
├── resource/                           # 对象类型系统
│    ├── artist/                      # 艺人模块
│    ├── release/                     # 发行版本模块
│    ├── song/                        # 歌曲模块
│    ├── event/                       # 活动模块
│    ├── label/                       # 厂牌模块
│    ├── tag/                         # 标签模块
│    └── history-tracking/            # resource历史模块
│
├── user/                             # 用户系统
│    ├── information/                 # 用户信息
│    │    └── attention/              # 关注模块 
│    │         ├── love/              # 喜欢模块
│    │         └── favorite/          # 收藏模块
│    ├── manager_permission/          # 权限模块
│    ├── notification/                # 通知模块
│    └── socialize/                   # 社交模块
│         └── comment/                # resource评论模块
│
├── statistics/                       # 统计模块
├── recommendation/                   # 推荐模块
└── localization/                     # 本地化模块
```

## 模块状态概览

| 模块 | 状态 | 说明 |
|------|------|------|
| [Artist](./resource/artist/) | ✅ 已完成 | 查询、创建、更新、图片上传 |
| [Release](./resource/release/) | ✅ 已完成 | 查询、创建、更新、封面上传 |
| [Song](./resource/song/) | ✅ 已完成 | 查询、创建、更新 |
| [Event](./resource/event/) | ⚠️ 部分完成 | 仅查询 |
| [Label](./resource/label/) | ⚠️ 部分完成 | 仅查询 |
| [Tag](./resource/tag/) | ⚠️ 部分完成 | 查询、投票 |
| [User](./user/) | ⚠️ 部分完成 | 基础功能，权限管理待实现 |
| [Comment](./user/socialize/comment/) | ❌ 未实现 | |
| [Examine and Verify](./data_management/examine_and_verify/) | ⚠️ 部分完成 | 创建、批准，拒绝待实现 |
| [Love](./user/information/attention/love/) & [Favorite](./user/information/attention/favorite/) | ❌ 未实现 | |
| [Search](./data_explore/search/) | ❌ 未实现 | |
| [Notification](./user/notification/) | ❌ 未实现 | |
| [Statistics](./statistics/) | ❌ 未实现 | |
| [Recommendation](./recommendation/) | ❌ 未实现 | |
| [History Tracking](./resource//history-tracking/) | ⚠️ 部分完成 | 数据层完成，API 待实现 |
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

resource的代码遵循 DDD 原则：

- **domain/**: 领域模型、repository trait、领域服务
- **application/**: 应用服务，编排领域逻辑
- **adapter/inbound/rest/**: HTTP 处理器

### Examine and Verify系统

所有核心实体的变更都通过Examine and Verify系统进行：

1. 用户提交请求
2. 审核员核实通过
3. 批准后应用到数据库
4. 历史记录保存在历史表中

## Log
日志级别有且仅有：Error, Warning, Info, Debug.
日志默认使用json编码，以json格式储存，每份日志文件寿命为14天.
日志格式为
> {"level":"日志等级","time":"yyyymmddhhmmss.SSS","invoker_type":"发起请求的对象的类型","invoker":"发起请求的对象","receiver_module":"动作所在模块","receiver":"动作","status":"动作执行情况","mistake_point":"错误位置"}

将换行转义为“\n”，半角引号转义为“\"”，反斜杠转义为“\\”.

## 错误码
不打断运行的，返回值简单明了的阐述事实即可.
打断运行的，返回值以`ERR_所在Feature：`开头，然后阐述问题.

## 快速导航

- **开始开发**: 查看 [ROADMAP.md](./ROADMAP.md) 了解待实现功能
- **共享类型**: 参考 [shared-types.md](./shared-types.md) 了解跨模块类型定义
- **核心实体**: [Artist](./resource/artist/), [Release](./resource/release/), [Song](./resource/song/)
- **用户系统**: [User](./user/), [Comment](./user/socialize/comment/), [Love](./user/information/attention/love/), [Favorite](./user/information/attention/favorite/)
- **数据质量**: [Examine and Verify](./data_management/examine_and_verify/), [History](./resource/history-tracking/)