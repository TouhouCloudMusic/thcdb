set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]
set dotenv-load := true
set dotenv-required := true
set positional-arguments

fmt:
  taplo fmt
  dprint fmt
  cargo fmt

fix:
  cargo fix          --workspace --allow-dirty --allow-staged
  cargo clippy --fix --workspace --allow-dirty --allow-staged

check:
  taplo fmt --check
  dprint check
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

@migrate *args:
  cargo run -p migration "$@"


converge:
  cargo tarpaulin --workspace --exclude-files crates/entity/src/entities/*
