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

generate:
  sea-orm-cli generate entity \
  -o entity/src/entities \
  --with-serde=both \
  --model-extra-derives juniper::GraphQLObject \
  --model-extra-attributes 'graphql(scalar=crate::extension::GqlScalarValue)' \
  --enum-extra-derives juniper::GraphQLEnum \
  --enum-extra-derives utoipa::ToSchema \
  --enum-extra-derives Copy

__rm_entites:
  rm ./entity/src/entities/*

db_all: migrate __rm_entites generate

converge:
  cargo tarpaulin --workspace --exclude-files entity/src/entities/*
