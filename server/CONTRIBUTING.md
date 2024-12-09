# Contributing to Touhou Cloud DB

## Getting Started

### Prerequisites

To contribute to Touhou Cloud DB, make sure you have the following installed:

- **Rust**: Our project is written in Rust. You can install it from [rust-lang.org](https://www.rust-lang.org/).
- **Atlas**: We use [Atlas](https://atlasgo.io/) for database migrations. Please refer to Atlas's installation guide to
  set it up.
- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) is used for TOML file formatting and linting. Install Taplo to ensure
  your TOML files are correctly formatted.

### Configure

#### Environment Variables

Before you begin contributing, make sure to set the following environment variables:

- `DATABASE_URL`: The database URL.
- `ATLAS_DEV_DATABASE_URL`: The database URL for atlas validate schema, this database must be epty. [More details](https://atlasgo.io/concepts/dev-database).
- `REDIS_URL`: The redis url.
- `SERVER_PORT`: The server listening port.

#### Pre-Push Hook

run `cargo test`

#### Apply Migrations

Currently, we use [`just`](https://github.com/casey/just?tab=readme-ov-file#global-justfile) to manager scripts. You can find the scripts in [`.justfile`](.justfile)

To apply migrations, run `just db_all`, then run `cargo run -p migration`.
