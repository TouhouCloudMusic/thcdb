# User权限系统

---
## 权限类别
- [root](#root)
- [user](#user)
- [leader](#leader)
- 社区管理
    - [auditor](#auditor)
    - [superintendent](#superintendent)
- 信息
    - [data checker](#data-checker)
    - [data manager](#data-manager)

```mermaid
graph TB
    subgraph 活动管理图
        direction TB
        management_data_manager[data manager]
        management_data_checker[data checker]
        management_root[root]
        management_user[user]
        management_leader[leader]
        management_superintendent[superintendent]
        management_auditor[auditor]
        data_modify请求[data modify请求]
        management_root --> management_leader
        management_leader --> management_superintendent --> management_auditor --> 社区活动
        management_user --- 社区活动
        management_user --- data_modify请求
        management_leader --> management_data_manager --> management_data_checker --> data_modify请求
    end
    subgraph 职权继承图
        direction RL
        root
        data_manager[data manager]
        data_checker[data checker]
        data_manager --> user
        data_checker --> user
        auditor --> user
        superintendent --> user
        leader --> user
    end
```
---

## root
最高权限，**无视examine and verify**，无法清除日志，操作依然被日志记录.
无法直接运行汇编语言、机器语言、高级语言.
只能在数据库中手动标记授予.
不应可以登录，只可在后台进行调用，对user账户不开放.

## user
所有账户的基础权限，本质上是一组权限.
能力：
- comment：发布评论的权限.
- gain_permission：获得管理权限的权限.
- object_rectify：发出关于某个object的修正请求.
- create_personal_list：创建个人列表，包括收藏夹、歌单等.

## leader
本身由root账户授予，并且是user账户.
原则上只有一位.
职责：对整个网站内容负责，对所有用户进行管理.
能力：
- 授予或卸下user账户`auditor`,`superintendent`,`data checker`,`data manager`权限.
- 封禁某个user账户的`gain_permission`.

## auditor
auditor黑名单的user的账户无法获取该权限，有权限的自动卸下权限.
职能：
- 对 *评论、用户主页等* 与社交直接相关的信息进行审核，通过compliance audit系统.
- 可以对user进行时长不大于一个月的封禁或对某项社交功能的时长不大于三个月的禁止.
- 没有examine and verify的权限.

## superintendent
职责：对*所有社区活动*进行管理并负责.
能力：
- 授予或卸下user账户的auditor权限.
- 封禁user权限的账户.
- 将某个auditor权限的账户加入auditor黑名单.
- 解除封禁某个账户的gain_permission权限.

## data checker
data checker黑名单的user无法获取该权限.
职能：
- 对数据进行审查核实，通过examine and verify系统.
- 没有compliance audit权限.

## data manager
职责：对*所有object的数据*进行管理并负责.
能力：
- 授予或卸下user账户的data checker权限.
- 将某个user加入data checker黑名单.
- 封禁或解封某个user的object_rectify权限.
- 对数据进行组织、迁移.
- 解除封禁某个账户的gain_permission权限.