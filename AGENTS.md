# Repository Guidelines

## Repository Layout
This repository has two main applications: 
- `server/`: Rust backend
- `web/`: React frontend

## Project Structure
```
.
├── server/                 # Backend service and Rust workspace
│   ├── src/                # Backend source code
│   ├── crates/             # Workspace crates (entity, migration, etc.)
│   ├── README.md
│   ├── Dockerfile
│   ├── Cargo.toml
│   ├── rust-toolchain.toml
│   └── .justfile
├── web/                    # Frontend app and shared packages
│   ├── src/                # Frontend application code
│   ├── packages/           # Shared packages (api, query, toolkit, icons)
│   ├── public              # Static assets
│   ├── README.md
│   ├── package.json
│   ├── vite.config.ts
│   └── .justfile
├── docs/                   # Architecture and roadmap documentation
├── docker-compose.yml
├── README.md
└── .justfile
```

## Key Technologies
- Server (Rust): Axum, SeaORM, PostgreSQL, Redis, Utoipa (OpenAPI)
- Web (React): React, TypeScript, Vite, TanStack Router, TanStack Query

## Common Commands
- Root
  - `just dev`: Start full stack via Docker Compose.
  - `just server`: Start backend only via Docker Compose.
  - `just compose <args>`: Pass-through to Docker Compose.
- Backend (`server/`)
  - `just fmt`: Format Rust/TOML.
  - `just fix`: Auto-fix with `cargo fix` and `cargo clippy --fix`.
  - `just check`: Format checks + `cargo clippy` + `cargo test`.
  - `just generate`: Regenerate SeaORM entities (requires DB access).
  - `just migrate <args>`: Run migrations (e.g., `just migrate up`).
- Frontend (`web/`)
  - `just fmt` / `just fmt-check`: Run Prettier.
  - `just lint` / `just fix`: Lint with `oxlint` + `eslint`.
  - `just check`: Type check (`pnpm tsgo -p .`).
  - `just test`: Run `vitest`.

## OpenAPI Generation
From repo root:
```
# Option A: Generate via running server CLI
# cargo run --manifest-path ./server/Cargo.toml -- --openapi ./tmp/openapi.json
# export API_SCHEMA=./tmp/openapi.json

# Option B: Use a running server
export API_SCHEMA=http://127.0.0.1:12345/openapi.json
# or: export VITE_SERVER_URL=http://127.0.0.1:12345

just gen-api
```
