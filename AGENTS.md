完成任务后，在目标子项目中运行其格式化命令。
当你需要在子目录中进行工作时，阅读对应的AGENTS.md
不要维护未上线代码的无谓兼容性，只有用户明确要求兼容时才考虑兼容，优先选择最优雅，简洁的实现方案
- `server/AGENTS.md`
- `web/AGENTS.md`

## 常用命令参考

- `just fmt`：格式化整个仓库（含 `server/`、`web/`）

### `server/`

- `just fmt`
- `just fix`
- `just check`
- `just integration-test`：集成测试（自动建/清环境）
- `cargo run -- --openapi ./openapi.json`：导出 OpenAPI

### `web/`

在 `web/` 目录中运行：

- `just fmt`
- `just fmt-check`
- `just check <path>`：检查目标路径
- `just test`：运行 Vitest

---

- 重新生成文件后需要重新格式化生成文件
