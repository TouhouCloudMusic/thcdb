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
# 0) 不启动服务，直接生成 OpenAPI schema 文件
# cargo run --manifest-path ../server/Cargo.toml -- --openapi ./tmp/openapi.json
# export API_SCHEMA=./tmp/openapi.json
#
# 1) 直接指定 OpenAPI schema 地址
export API_SCHEMA=http://127.0.0.1:12345/openapi.json
# 2) 或者只设置服务端地址（使用 $VITE_SERVER_URL/openapi.json）
# export VITE_SERVER_URL=http://127.0.0.1:12345
# 3) 两者都不设置时，默认使用服务器 CLI 生成 ./tmp/openapi.json
# unset API_SCHEMA VITE_SERVER_URL
just gen-api
```

## 命名规范

TODO

