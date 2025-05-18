# Contributing to Touhou Cloud DB

## Getting Started

### Prerequisites

To contribute to Touhou Cloud DB, make sure you have the following installed:

- **Rust**: Our project is written in Rust. You can install it from [rust-lang.org](https://www.rust-lang.org/).

- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) is used for TOML file formatting and linting. Install Taplo to ensure your TOML files are correctly formatted.

- **Just**: We use [Just](https://github.com/casey/just) for our project's scripts. Please refer to Just's installation guide to set it up.

- **Mold**: If you want faster compilation, you can install [Mold](https://github.com/rui314/mold) and uncomment the clang argument in [.cargo/config.toml](./.cargo/config.toml)

- **Sea Orm CLI**: A tool for generate entities from database. Run `cargo install sea-orm-cli` to install it.

``` plaintext
The above is for development only.
```

- **Postgresql**: We use [PostgreSQL](https://www.postgresql.org/) for our database. Please refer to PostgreSQL's installation guide to set it up.

- **Redis**: We use [Redis](https://redis.io/) for our cache. Please refer to Redis's installation guide to set it up.

### Configurations

#### Environment Variables

Before you begin contributing, make sure to set the following environment variables:

- `DATABASE_URL`: The database URL.
- `REDIS_URL`: The redis url.
- `ADMIN_PASSWORD`: The Admin password for the dev only admin account.

#### Pre-Push Hook

To setup pre-push hook, you must run `cargo test` once.
