# 版本控制系统

实现resource的版本控制.
history的基本结构为：
- UUID.
记录操作的resource对象的UUID.
- 版本.
类型为键值对，键名为`version`，键值类型为整数.
- 发起者.
记录发起操作的user的UID.
- 操作类型.
有`create`,`modify`,`merge`三种类型.
- 操作.
内容见后续.

每个history以提案为最小单元记录.

---
**职能**：
- 操作
    - [create](#create)
    - [delete](#delete)
    - [modify](#modify)
    - [merge](#merge)

---

## create
## delete
## modify
## merge
如果操作为`modify`和`delete`，则：
- 在`modify`对象的新建history记录以下内容
    - `操作类型`为`merge`.
    - `操作`的内容为`{两个对象的差异数据}`.
    - `版本`自增.