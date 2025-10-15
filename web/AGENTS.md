# Agent Guidelines

完成修改了代码的任务后，你需要:

- 运行 `just fmt` 格式化代码
- 运行 `pnpm tsgo -p . --pretty false` 检查类型错误
- 运行 `pnpm oxlint -f stylish` 检查代码风格

## Command

`pnpm tsgo -p . --pretty false`: 快速的类型检查，以紧凑格式输出。
`just fmt`: 格式化代码。
`pnpm vitest run <filename>`: 测试单个文件。

## Coding Style

- 除非用户要求，否则不要添加任何评论
- 使用let来定义变量和lambada表达式，使用const定义常量，使用function来定义一般函数和组件
- 对于隐式捕获外部状态的函数（闭包，通过参数传递不算做隐式捕获外部状态），必须使用lambda定义，禁止使用`function`定义。

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

## 架构

- packages/api

  生成的后端api sdk和适配器

- packages/query

  将后端api封装为tanstack query

- packages/toolkit

  工具函数集合

- packages/icon

  自定义图标集合

- src

  app的主要代码

## 生成的文件

以下是生成的文件和目录，禁止手动修改

- src/routeTree.gen.ts
- packages/api/src/gen.ts

如果你的任务需要更新这些文件，请暂停你的工作，并要求用户更新。
