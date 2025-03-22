set windows-shell := ["pwsh.exe", "-NoLogo","-Command"]
set dotenv-load := true
set dotenv-required := true

fmt:
  taplo fmt
  atlas schema fmt ./schema
  cargo fmt

fix:
  cargo fix --workspace --allow-dirty --allow-staged
  cargo clippy --fix --workspace --allow-dirty --allow-staged

check:
  taplo fmt --check
  cargo fmt --check
  cargo clippy
  cargo test

pre-push: check

default: fmt && fix

migrate:
  atlas schema apply --env local


__rm_entites:
  rm ./entity/src/entities/*

__generate:
  sea-orm-cli generate entity \
  -o entity/src/entities \
  --with-prelude=none \
  --with-serde=both \
  --enum-extra-derives utoipa::ToSchema \
  --enum-extra-derives Copy

generate: __rm_entites __generate

db_all: migrate generate

converge:
  cargo tarpaulin --workspace --exclude-files entity/src/entities/*
