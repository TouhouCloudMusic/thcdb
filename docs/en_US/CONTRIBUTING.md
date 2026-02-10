# Touhou Cloud DB Development Guide

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## Contents

- [Development](#development)
- [Commit Convention](#commit-convention)

## <a id="development"></a>Development

### Run the development environment with Docker (recommended)

Run in the repository root:

```bash
# Update env as needed
cp .env.example .env
just dev
```

Default access addresses:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:12345`

Stop services:

```bash
just down
```

### Run locally and separately

#### Frontend

We use pnpm to manage packages.

If you want to run the frontend directly locally, it is recommended to add this in `web/.env`:

```bash
# web/.env
VITE_SERVER_URL=http://127.0.0.1:12345
```

You can also directly copy `web/.env.example` as a starting point.

#### Backend

##### Prerequisites

- rust
- [Just](https://github.com/casey/just) Task runner
- [Taplo](https://taplo.tamasfe.dev/) Toml formatter
- sea-orm-cli
- PostgreSQL
- Redis

##### Configuration

If you want to run the backend directly locally, you need to set the following environment variables:

- `DATABASE_URL` (required): Database connection string, for example `postgres://username:password@localhost:5432/database_name`
- `REDIS_URL` (required): Redis connection address, for example `redis://username:password@localhost:6379`
- `ADMIN_PASSWORD` (required): Admin account password for development (the backend uses it to initialize/update the admin account on startup)

##### Configuration file and environment variable override rules

The backend configuration is loaded from `server/config.toml` and can be overridden by environment variables.

- Top-level fields use variables with the same names directly (for example `DATABASE_URL`, `REDIS_URL`).
- Nested fields use `::` to separate hierarchy levels (for example `middleware::limit::req_per_sec`, `app::port`).

The priority in current code is:

1. `config.toml`
2. environment variables
3. `config.dev.toml` (only for `debug` build and when the file exists)

### <a id="commit-convention"></a>Commit Convention

Use imperative mood and start with a capital letter.
