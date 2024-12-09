set windows-shell := ["pwsh.exe", "-NoLogo","-Command"]
set dotenv-load := true
set dotenv-required := true

fmt:
  taplo fmt
  cargo fmt
  atlas schema fmt ./schema

fix: fmt
  cargo clippy --fix --allow-dirty --allow-staged

pre-push:
  taplo check
  cargo fmt --check
  cargo clippy

default: fix

db_url := if os() == 'windows' {
	"$env:DATABASE_URL"
} else {
	"$DATABASE_URL"
}

dev_db_url := if os() == 'windows' {
	"$env:ATLAS_DEV_DATABASE_URL"
} else {
	"$ATLAS_DEV_DATABASE_URL"
}

migrate:
  atlas schema apply -u {{db_url}} --to=file://schema --dev-url {{dev_db_url}} --env local

generate:
  sea-orm-cli generate entity -o entity/src/entities --with-serde=both --model-extra-derives juniper::GraphQLObject --model-extra-attributes 'graphql(scalar=crate::extension::GqlScalarValue)' --enum-extra-derives juniper::GraphQLEnum

db_all: migrate && generate
