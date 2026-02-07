# Web Repository Guidelines

## 概览

本文件仅描述 `web/` 前端。前端采用 Solid.js + TypeScript，构建工具为 Vite，路由与数据请求分别使用 TanStack Router / TanStack Query。

## 项目结构

```
web/
├── src/               # 应用主要代码（页面、组件、状态、路由等）
│   ├── component      # 通用组件
│   ├── domain         # 领域模型与校验 schema
│   ├── layout         # 布局组件
│   ├── route          # 路由页面
│   ├── state          # 全局状态与数据层
│   ├── style          # 样式与主题
│   └── view           # 业务视图/页面模块
├── packages/          # 共享包
│   ├── api            # 生成的后端 API SDK 与适配器
│   ├── query          # 基于 API 的 TanStack Query 封装
│   ├── toolkit        # 通用工具函数集合
│   └── icons          # 自定义图标集合
├── public/            # 静态资源
├── doc/               # 开发文档
├── package.json
├── pnpm-workspace.yaml
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── .justfile          # 开发命令
```

src 说明：`src/` 为前端应用的主要代码（页面、组件、状态、路由等）。

## 技术栈（主要）

- 框架：Solid.js
- 语言：TypeScript
- 构建：Vite
- 路由：TanStack Router
- 数据请求：TanStack Query
- 规范：ESLint + Oxlint + Prettier
- 测试：Vitest

## 常用命令

- `just fmt`：Prettier 格式化。
- `just fmt-check`：Prettier 检查。
- `just lint`：运行 `oxlint` + `eslint`。
- `just fix`：自动修复 lint。
- `just check`：类型检查（`pnpm tsgo -p .`）。
- `just test`：运行 `vitest`。
- `pnpm vitest run <filename>`：测试单个文件。

## 编码规范

- 除非用户要求，否则不要添加任何评论
- 使用import type {...} 而不是 import { type ... } 来导入类型
- 顶级组件必须使用function定义
- 为了可读性和局域性，组件的Props定义及相关内容需要放在组件上方，而不是文件顶部
- 常量和不捕获局部变量的函数应当提升到模块顶级，避免重复创建以提升性能

### Solid JS

- 不要解构props，这会破坏solid的响应式系统。
- 禁止在 JSX 中使用嵌套三元表达式（例如 `cond ? A : B`）。
- 使用 Solid 的 `<Switch>`/`<Match>` 进行多分支条件渲染；简单显隐可用 `<Show>`。
- 禁止在 `createEffect` 中调用任意 `setSignal`（例如 `setXxx`）。如需根据其他信号变化“重置/派生”值，优先使用派生状态（`createMemo`）表达，避免通过 effect 进行命令式重置。
- 不要在 JSX 表达式中内联过于复杂的函数。将此类函数提升到组件顶部定义为常量lambda或工厂函数
- 不要使用classList

### Typescript

- 优先使用使用`type`而不是`interface`来声明类型
- 在导入时，使用单独的`import type { .. }`来导入类型
- 禁止使用`as $type`进行类型断言
- 避免不必要的类型标注。在标注类型前，首先寻找是否已经存在定义了的类型别名

## 生成的文件

以下是生成的文件和目录，禁止手动修改

- src/routeTree.gen.ts
- packages/api/src/gen.ts

如果你的任务需要更新这些文件，请暂停你的工作，并要求用户更新。
