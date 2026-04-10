# 代码检查

完成任务后，运行`just check`检查
JavaScript是动态语言，build的检查很宽松，不要使用build来进行检查，不要构建storybook!
你应当通过类型系统, linter和单元测试来确认修改是否有效
禁止使用`tsc --no-emit`, oxlint的检查更快速，完善

# 编码规范

完成任务后，基于编码规范审阅改动。

- 除非用户要求，否则不要添加注释

## Javascript

- 常量和不捕获局部变量的函数应当提升到模块顶级，避免重复创建以提升性能
- 在定义的地方export item而不是在集合导出
- 函数的定义方式对齐Rust: 顶级或不捕获任何局部变量的，以function定义。在函数内部，且同时捕获局部变量(不包括常量)的，使用const定义闭包。
  例如：

  ```ts
  function add(a, b) {
  	return a + b
  }

  const add3 = (x) => add(3, x)

  const FORTY_TWO = 42
  function addFortyTwo(x) {
  	return x + FORTY_TWO
  }

  function outer() {
  	const local = 24
  	return (x) => x + 24
  }
  ```

- 对于可空值，使用 `??` 而不是 `||`
- 禁止使用嵌套层级超过2的三元表达式
- 代码需要能够流畅的从上往下阅读，因此：
  - 定义必须先于使用
  - 避免上下跳转的控制流或内容
- 使用globalThis, 而不是window/global

## JSX

- 组件必须使用 `function` 定义
- 禁止使用button作为link

## Typescript

- 优先使用 `type` 而不是 `interface` 来声明类型
- 在导入时，必须使用单独的 `import type { ... }` 来导入类型, 不要用 `import { type ... }`
- 避免不必要的类型标注：在标注类型前，先寻找是否已经存在定义了的类型别名
- 为了可读性和局域性，组件的 Props 定义及相关内容（例如常量）需要放在组件上方，而不是文件顶部, 除非它们在其他地方也被使用

## Solid JS

- 不要解构 `props`，这会破坏 Solid 的响应式系统
- 使用 Solid 的 `<Switch>`/`<Match>` 进行多分支条件渲染；简单显隐可用 `<Show>`
- 禁止在 `createEffect` 中调用任意 `setSignal`（例如 `setXxx`）。如需根据其他信号变化“重置/派生”值，优先使用派生状态（`createMemo`）表达，避免通过 effect 进行命令式重置
- 不要使用 `classList`

## Tailwind CSS

twMerge和twJoin是两个用于合并Tailwind CSS类名的工具。twMerge会智能地合并类名，避免重复和冲突，而twJoin则简单地连接类名，不进行任何优化。
当场景简单时（即已知所有的类名），使用twJoin，否则使用twMerge以避免潜在的类名冲突和冗余。
twMerge和twJoin都接受false作为参数，因此在条件类名时，可以直接传入条件表达式，例如：

```tsx
twMerge("base-class", condition && "conditional-class")
```

而不是

```tsx
twMerge("base-class", condition ? "conditional-class" : "")
```

### v3 -> v4

Tailwind CSS v4 更新了许多用法，你必须使用新的用法，以下是替换列表：

- break-words -> wrap-break-word
- [background-*:<value>] -> bg-\*-[<value>] # 同样适用于fg
- `*-gradient-to-*` -> `*-linear-to-*`
- `outline-offset-[-<number>px]` -> `-outline-offset-<number>`
- `aspect-[x/y]` -> `aspect-x/y`

### 设计系统

优先使用设计系统定义的样式，如：

- 颜色：`text-primary`、`bg-secondary` 等

不要使用自定义设置，如`text-[11px]`, `tracking-[0.22em]`

## UI 文案

- 默认使用克制、直接、偏工具界面的文案风格
- 优先写操作、状态、约束本身，不要补充产品价值、流程宣传或类似 SaaS landing page 的解释
- 避免使用类似 “seamless”、“manage your”、“becoming public”、“queued for moderation” 这类偏营销或产品包装的表达

## Effect

不要使用`.pipe`方法，而是使用`pipe`函数，保证缩进一致以提升可读性

# 架构约定

- 页面与详情视图优先保持纯展示：视图组件负责接收 props 并渲染，query、prefetch 和 query client 放在 route 或 container 层。
- 可复用的 UI 区块应只消费调用方准备好的数据，不自行发起与实体耦合的查询；这样更容易复用、写 story 和测试。
- `web` 新增 API 接入优先使用生成的客户端与 schema，而不是补手写包装层；只有在生成产物确实覆盖不了需求时才引入人工抽象。
- Storybook 中同一组件如果只是切换数据状态或展示模式，优先用 args / controls 表达，避免拆出多个高度重复的 stories。

# 生成的文件

以下是生成的文件和目录，禁止手动修改：

- `src/routeTree.gen.ts`（TanStack Router 自动生成）
- `packages/api/src/gen.ts`
- `src/hey-api/`

使用 `just gen-api` 生成 API 相关产物。
schema 来源优先级：命令参数 > `API_SCHEMA` > `$VITE_SERVER_URL/openapi.json` > 通过 server CLI 本地生成 `./tmp/openapi.json`。
旧代码仍使用 `@thc/api`，新代码使用 Hey API 生成的 SDK 和 Valibot schema。

如果你的任务需要更新这些文件，当你可以通过命令更新时：运行更新命令，否则，暂停你的工作，要求用户在本地重新生成它们后再继续。

# Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
