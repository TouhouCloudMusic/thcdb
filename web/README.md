# 开发文档技术标准

技术栈
Solid.js / Typescript

Figma 网页设计链接
[设计图](https://www.figma.com/design/ysKf14Y5OZthgVaGdN6QGn/%E8%BD%A6%E4%B8%87%E4%BA%91%E5%8E%9F%E5%9E%8B?node-id=0-1&t=4cU7bMs5smxjJ77G-1)

## 如何开始开发

[如何开始开发](doc/如何开始开发.md)

## 生成 API 代码

在仓库根目录执行：

```bash
# 二选一：
# 1) 直接指定 OpenAPI schema 地址
export API_SCHEMA=http://127.0.0.1:12345/openapi.json
# 2) 或者只设置服务端地址（默认使用 $VITE_SERVER_URL/openapi.json）
# export VITE_SERVER_URL=http://127.0.0.1:12345
just gen-api
```

## 命名规范

TODO

## Commit 格式

module(可选, 小写): Message(第一个单词大写)

示例:

```
payment: Fix currency rounding error

- Corrects USD conversion calculations
- Affects checkout and refund flows
```

## Issue 认领工作流

各位开发者请在总需求issue里面查看并选择自己需要制作的组件，并使用Todo Task Template进行开发说明，开发子分支会被自动创建。
