# Contributing to Touhou Cloud DB

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## Prerequisites

To contribute to Touhou Cloud DB, make sure you have the following installed:

### Rust Toolchain

Our project is written in Rust. You can install it from [rust-lang.org](https://www.rust-lang.org/). The backend uses a specific Rust toolchain configuration that is automatically applied through our [`server/rust-toolchain.toml`](../../server/rust-toolchain.toml) file. Key details include:

- **Nightly Channel**: We use the Rust nightly channel for access to cutting-edge features
- **Required Components**:
  - `rustfmt`: For consistent code formatting
  - `clippy`: For advanced code linting
  - `rustc-codegen-cranelift-preview`: For faster development builds

The toolchain will be automatically installed when you first build the project. To manually check or update your toolchain:

We recommend using [rustup](https://rustup.rs/) to manage your Rust installation. After installing, run the following command to ensure you have the correct toolchain:

```bash
# Check your active toolchain
rustup show

# Update the toolchain components
rustup update
```

### Additional Tools

We leverage several tools to enhance development workflow:

- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) is used for TOML file formatting and linting. Install Taplo to ensure your TOML files are correctly formatted.

```bash
cargo install taplo-cli
```

- **Just**: We use [Just](https://github.com/casey/just) for our project's scripts. It serves as a command runner used for common project tasks.

```bash
cargo install just
```

View available commands with `just --list`

- **Sea Orm CLI**: A tool for generating entities from database. Install it with:

```bash
cargo install sea-orm-cli
```

### Database and Cache

- **PostgreSQL**: We use [PostgreSQL](https://www.postgresql.org/) for our database. Please refer to PostgreSQL's installation guide to set it up.

- **Redis**: We use [Redis](https://redis.io/) for our cache. Please refer to Redis's installation guide to set it up.

### Optional Tools

- **Mold** (Unix-like systems only): If you want faster compilation, you can install [Mold](https://github.com/rui314/mold) through your system package manager and uncomment the clang argument in [`server/.cargo/config.toml`](../../server/.cargo/config.toml)

Note: Windows users should skip this as Mold is not compatible with Windows.

## Configurations

### Environment Variables

Before you begin contributing, make sure to set the following environment variables:

- `DATABASE_URL`: The database URL, usually in the format `postgres://username:password@localhost:5432/database_name`.
- `REDIS_URL`: The redis url, usually in the format `redis://username:password@localhost:6379`.
- `ADMIN_PASSWORD`: The Admin password for the dev only admin account, you can set it to any value for local development.

We recommend creating a `server/.env` file to store these variables when running the backend locally (outside Docker). This file is git-ignored, allowing you to maintain personal settings without affecting version control.

Example `.env` file:

```bash
# Database connection (several formats supported)
# Format 1: Full connection string with username and password
DATABASE_URL=postgres://youmu:password@localhost:5432/touhou_cloud_db

# Format 2: Using OS user authentication (no password)
# DATABASE_URL=postgres://youmu@localhost:5432/touhou_cloud_db

# Format 3: Using current system user (simplest for development)
# DATABASE_URL=postgres://localhost:5432/touhou_cloud_db

# Redis connection (typically doesn't need auth for local development)
REDIS_URL=redis://localhost:6379

# Development admin account password
ADMIN_PASSWORD=your_secure_password
```

### Pre-Push Hook

To setup pre-push hook, you must run `cargo test` once.

Our pre-push hook runs automatically whenever you execute `git push` and performs the following checks:

- Code formatting via `taplo fmt --check` and `cargo fmt --check`
- Linting via `cargo clippy`
- Tests via `cargo test`

These checks are defined in our [`server/.justfile`](../../server/.justfile) under the `pre-push` and `check` tasks.

If any check fails, your push will be prevented until the issues are fixed. This ensures that code pushed to the repository maintains our quality standards.
