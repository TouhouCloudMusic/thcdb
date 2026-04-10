完成任务后，运行just fmt来保证格式正确

## 常用命令参考

- `just fmt`：格式化整个仓库（含 `server/`、`web/`）

### `server/`

- `just fmt`
- `just fix`
- `just check`
- `just integration-test`：集成测试（自动建/清环境）
- `cargo run -- --openapi ./openapi.json`：导出 OpenAPI

### `web/`

- `just fmt`
- `just fmt-check`
- `just check`：运行linter检查
- `just test`：运行 Vitest
