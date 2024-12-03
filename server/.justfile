set windows-shell := ["pwsh.exe", "-NoLogo","-Command"]
set dotenv-load := true
set dotenv-required := true

fmt:
  taplo fmt
  cargo fmt

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

migrate:
  atlas schema apply -u {{db_url}} --to=file://schema

generate:
  sea-orm-cli generate entity -o entity/src/entities --with-serde=serialize --model-extra-derives juniper::GraphQLObject --model-extra-attributes 'graphql(scalar=crate::extension::GqlScalarValue)' --enum-extra-derives juniper::GraphQLEnum
