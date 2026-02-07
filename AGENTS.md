# Repository Guidelines

## Project Structure
```
.
├── .github/                # CI workflows, issue templates
│   └── workflows/
├── docs/                   # Architecture and roadmap documentation
├── server/                 # Backend service and Rust workspace
│   ├── src/                # Axum app, CLI entrypoints
│   ├── crates/             # Workspace crates (entity, migration, etc.)
│   │   ├── entity/
│   │   └── migration/
│   ├── AGENTS.md           # Server-specific structure, conventions, commands
│   ├── Cargo.toml
│   ├── config.toml         # Server runtime config
│   ├── Dockerfile          # Dev Dockerfile
│   ├── Dockerfile.prod     # Production Dockerfile
│   ├── rust-toolchain.toml
│   └── .justfile
├── web/                    # Frontend app and shared packages (pnpm workspace)
│   ├── src/                # Frontend application code
│   ├── packages/           # Shared packages (api, query, toolkit, icons, ...)
│   ├── public/             # Static assets
│   ├── AGENTS.md           # Web-specific structure, conventions, commands
│   ├── Dockerfile.prod     # Production Dockerfile
│   ├── nginx.conf          # Reverse proxy / static hosting config
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── tsconfig.json
│   ├── openapi-ts.config.ts
│   ├── vite.config.ts
│   └── .justfile
├── .env.example
├── .env.prod.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── flake.nix               # Nix dev environment
├── flake.lock
├── README.md
├── renovate.json
└── .justfile
```

## Quickstart
- Start dev stack: `just dev`
- Web: `http://127.0.0.1:${WEB_PORT:-3000}`
- Server: `http://127.0.0.1:${SERVER_PORT:-12345}` (OpenAPI: `/openapi.json`)
- Stop: `just down`

## Common Commands
- Root
  - `just dev`: Start full stack via Docker Compose.
  - `just server`: Start backend only via Docker Compose.
  - `just down`: Stop stack and remove local images.
  - `just compose <args>`: Pass-through to Docker Compose.
