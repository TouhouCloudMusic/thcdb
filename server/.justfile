set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]
set dotenv-load := true
set dotenv-required := true

fmt:
  taplo fmt
  cargo fmt

fix:
  cargo fix          --workspace --allow-dirty --allow-staged
  cargo clippy --fix --workspace --allow-dirty --allow-staged

check:
  taplo fmt --check
  cargo fmt --check
  cargo clippy
  cargo test

pre-push: check

default: fmt && fix

__rm_entites:
  rm crates/entity/src/entities/*

__generate:
  sea-orm-cli generate entity \
  -o crates/entity/src/entities \
  --with-prelude=none \
  --with-serde=both \
  --enum-extra-derives utoipa::ToSchema \
  --enum-extra-derives Copy

generate: __rm_entites __generate

converge:
  cargo tarpaulin --workspace --exclude-files crates/entity/src/entities/*
