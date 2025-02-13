# Contributing to Touhou Cloud DB

## Getting Started

### Prerequisites

To contribute to Touhou Cloud DB, make sure you have the following installed:

- **Rust**: Our project is written in Rust. You can install it from [rust-lang.org](https://www.rust-lang.org/).

- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) is used for TOML file formatting and linting. Install Taplo to ensure your TOML files are correctly formatted.

- **Just**: We use [Just](https://github.com/casey/just) for our project's scripts. Please refer to Just's installation guide to set it up.

- **Mold**: If you want faster compilation, you can install [Mold](https://github.com/rui314/mold] and uncomment the clang argument in [.cargo/config.toml](./.cargo/config.toml)

- **Sea Orm CLI**: A tool for generate entities from database. Run `cargo install sea-orm-cli` to install it.

```
  以上为开发Only
```

- **Atlas**: We use [Atlas](https://atlasgo.io/) for database migrations. Please refer to Atlas's installation guide to set it up.

- **Postgresql**: We use [PostgreSQL](https://www.postgresql.org/) for our database. Please refer to PostgreSQL's installation guide to set it up.

- **Redis**: We use [Redis](https://redis.io/) for our cache. Please refer to Redis's installation guide to set it up.


### Configure

#### Environment Variables

Before you begin contributing, make sure to set the following environment variables:

- `DATABASE_URL`: The database URL.
- `ATLAS_DEV_DATABASE_URL`: The database URL for atlas validate schema, this database must be empty. [More details](https://atlasgo.io/concepts/dev-database).
- `REDIS_URL`: The redis url.
- `SERVER_PORT`: The server listening port.

#### Pre-Push Hook

To setup pre-push hook, you must run `cargo test` once.

#### Apply Migrations

Currently, we use [`just`](https://github.com/casey/just?tab=readme-ov-file#global-justfile) to manager scripts. You can find the scripts in [`.justfile`](.justfile)

<!-- You need to register an atlas account and login to use the triggers features.
```shell
atlas login
```
If you do not have any organization, you can request admin to join touhou-cloud-music atlas organization. -->

To apply migrations, run `just db_all`.

<!-- We have some seed data in our migration crate, you can run `cargo run -p migration` to apply them. -->
