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

#### Pre-Push Hook

run `cargo test`