# User系统

外部数据关联user使用UID.
user的基本数据有：
- UID.（数据类型为bigint）
自增，不由外部管理.
- ID（类型为varchar，大小为16）
- 密码.（数据类型为varchar，大小为256）
- 主权限（数据类型为varchar，大小为49）
默认为`comment,gain_permission,resource_rectify,create_personal_list`.
- 管理权限（数据类型为varchar，大小为16）
默认为空.
- 销户.（数据类型为bigint）
默认为0.
- Q.（数据类型为varchar，大小为128）
- A.（数据类型为varchar，大小为128）

user表中，第一行作为admin账户的预留位.
admin账户的数据为
- `0`
- 无
- 无
- 无
- `admin`
- `0`
- 无
- 无

admin账户的登陆凭证为空，为了防止被意外的登录，它只能被本地所调用.

---
## 系统组成
- [注册、登录、销户、找回账户、修改密码](#注册登录销户找回账户修改密码)
- [User权限系统](./manager_permission/design.md)
- [通知系统](./notification/design.md)
- [社交系统](./socialize/design.md)
- [信息系统](./information/design.md)
---

## 注册、登录、销户、找回账户、修改密码
### 注册
接收一个数组，元素为键值对，包含以下内容：
- ID.
键名为`ID`，键值为字符串.
- 密码.
键名为`password`，键值为字符串.
- Question.
键名为`Q`，键值为字符串.
- Answer.
键名为`A`，键值为字符串.
#### 参数规范
`ID`在user表中必须唯一.
#### 日志记录
执行结束记录INFO等级日志，执行情况为`success, new user with {ID}`.
#### 储存内容
`ID`储存进`ID`.
`密码`经过*不可逆单向加密*后储存进`密码`.
`comment,gain_permission,resource_rectify,create_personal_list`储存进`主权限`.
`Question`储存进`Q`.
`Answer`经过*不可逆单向加密*后储存进`A`.
#### 错误处理
如果`ID`在表中不唯一，则返回`ID_not_unique`.
如果`密码`为空，则返回`empty_password`.
如果`Question`或`Answer`中任一为空，则返回`without_Q_or_A`.

### 登录
接收一个键值对，键名为`ID`，键值为`密码`.
#### 返回值
返回一串二进制编码作为登录凭证，有效期24小时.
#### 错误处理
如果`ID`对应的账户不存在，则返回`unknown_account`.
如果`ID`对应的账户的`销户`不为`0`，则返回`was_delete_account`.
如果`密码`与`ID`对应的账户的`密码`不同，则返回`password_incorrect`.

### 销户
接收一个数组，元素为键值对，包含以下内容：
- ID.
键名为`ID`，键值为字符串.
- 密码.
键名为`password`，键值为字符串.
- Answer.
键名为`A`，键值为字符串.
#### 储存内容
将`ID`对应账户的`销户`的设为请求销户的10位UNIX时间戳.
#### 错误处理
如果`ID`对应的账户不存在，则返回`unknown_account`.
如果`密码`与`ID`对应的账户的`密码`不同，则返回`password_incorrect`.
如果`Answer`与`ID`对应的账户的`A`不同，则返回`answer_incorrect`.
如果`ID`对应的账户的`销户`不为`0`，则返回`already_deleted`.

### 找回账户
接收一个数组，元素为键值对，包含以下内容：
- ID.
键名为`ID`，键值为字符串.
- 密码.
键名为`password`，键值为字符串.
- Answer.
键名为`A`，键值为字符串.
#### 储存内容
将`ID`对应账户的`销户`的设为`0`.
#### 错误处理
如果`ID`对应的账户不存在，则返回`unknown_account`.
如果`密码`与`ID`对应的账户的`密码`不同，则返回`password_incorrect`.
如果`Answer`与`ID`对应的账户的`A`不同，则返回`answer_incorrect`.
如果`ID`对应的账户的`销户`为`0`，则返回`not_deleted`.

### 修改密码
接收一个数组，元素为键值对，包含以下内容：
- ID.
键名为`ID`，键值为字符串.
- 新密码.
键名为`new_password`，键值为字符串.
- Answer.
键名为`A`，键值为字符串.
#### 储存内容
用经过*不可逆单向加密*后的`新密码`覆盖`ID`对应的账户的`密码`.
#### 错误处理
如果`ID`对应的账户不存在或`ID`对应的账户的`销户`不为`0`，则返回`unknown_account`.
如果`Answer`与`ID`对应的账户的`A`不同，则返回`answer_incorrect`.

### 补充
销户时间超过90天的账户将UID以外的键值置空.


## 用户权限系统
设计文档：[user_manager_permission](./manager_permission/design.md)
用户的社交、操作的权限管理.用于管理用户能力范围.


## 通知系统
设计文档：[user_notification](./notification/design.md)
包含各类通知，主要由以下组成：
- 系统通知，由系统生成.
- 社交通知，评论被评论.
- 权限通知，权限被授予、卸下、封禁.


## 社交系统
设计文档：[socialize](./socialize/design.md)
目前只有评论和讨论.


## 信息系统
设计文档：[information](./information/design.md)
个人贡献次数、个人收藏、user行为图象等信息.