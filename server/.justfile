set windows-shell := ["pwsh.exe", "-NoLogo","-Command"]
set dotenv-load := true
set dotenv-required := true

fmt:
  taplo fmt
  atlas schema fmt ./schema
  cargo fmt

fix:
  cargo clippy --fix --allow-dirty --allow-staged

pre-push:
  taplo check
  cargo fmt --check
  cargo clippy

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
  --enum-extra-derives Copy

db_all: migrate && generate
