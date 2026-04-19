# API

此处为sever对外接口的描述文档.
## 接口约定
除了`user_signup`和`user_signin`外，所有请求均需要携带账户认证信息.
账户认证信息由`user_signin`签发.

---
- [user](#user)
    - [signup](#signup)
    - [signin](#signin)
    - [signout](#signout)
    - [close](#close)
- [resource](#resource)
    - [search](#search)
    - [create](#create)
    - [delete](#delete)
    - [modify](#modify)
    - [merge](#merge)
---

# user
## signup
## signin
## signout
## close

# resource
## search
对resource按指定的条件进行检索.
**方法**：`GET`或`POST`.
**路径**：`/api/resource/search`.
### 请求体（json）
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `size` | integer | 否 | 20 | 返回条数，1-256。 |
| `end_uuid` | string | 否 | null | 游标分页标识。 |
| `keyword` | string | 否 | null | 搜索关键词。 |
| `resource_types` | array[string] | 是 | - | 限定类型。 |
| `filter` | object | 否 | {} | 过滤条件。 |
| `sort` | string | 否 | null | 排序，格式 `"field:order"`。 |
| `full_output` | boolean | 否 | false | 是否返回对象数据而非UUID。 |
### 响应
#### 成功响应 （HTTP 200）
如果`full_output`为`false`，
```json
{
    "status": "success",
    "messages": [],
    "errorcode": 0,
    "data": {
        "items": ["uuid1", "uuid2"],
        "has_more": false
    }
}
```
如果`full_output`为`true`，
```json
{
    "status": "success",
    "messages": [],
    "errorcode": 0,
    "data": {
        "items": ["对象数据1", "对象数据2"],
        "has_more":false
    }
}
```
#### 错误响应
**含有非法参数**，
```json
{
    "status": "error",
    "message": ["illegal_value", ["非法参数名"]],
    "errorcode": "400"
}
```
**`keyword`为空且推荐系统未实现**，
```json
{
    "status": "warning",
    "message": ["search_unhandled_request"],
    "errorcode": "503"
}
```
**`resource_types`为空**，
```json
{
    "status": "error",
    "message": ["unrestricted_type"],
    "errorcode": "400"
}
```
**`filter`的元素不是`resource_types`对应的resource类型中的任何一个键**，
```json
{
    "status": "error",
    "message": ["request_type_have_not_filter", ["不合规的元素"]],
    "errorcode": "400"
}
```

## create
权限要求：
- 请求角色：**data manager**.
- 直接操作：**admin**.
## delete
权限要求：
- 请求角色：**data manager**.
- 直接操作：**admin**.
## modify
权限要求：
- 请求所需权限：**resource_rectify**.
- 直接操作：**admin**.
## merge
权限要求：
- 请求所需权限：**resource_rectify**.
- 直接操作：**admin**.