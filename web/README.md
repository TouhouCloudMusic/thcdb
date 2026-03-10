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
# schema 来源优先级：
# 1) just gen-api <schema>
# 2) API_SCHEMA
# 3) $VITE_SERVER_URL/openapi.json
# 4) server CLI 本地生成 ./tmp/openapi.json
#
# 例如：
# just gen-api http://127.0.0.1:12345/openapi.json
# export API_SCHEMA=http://127.0.0.1:12345/openapi.json
# export VITE_SERVER_URL=http://127.0.0.1:12345
# unset API_SCHEMA VITE_SERVER_URL
just gen-api
```

## 命名规范

TODO
