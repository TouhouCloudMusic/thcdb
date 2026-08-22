set windows-shell := ["sh.exe", "-c"]
set dotenv-load := true
set positional-arguments := true

mod test-env '.just/test-env.just'

fmt:
    taplo fmt
    cargo fmt

fix:
    cargo fix          --workspace --allow-dirty --allow-staged
    cargo clippy --fix --workspace --allow-dirty --allow-staged

check:
    taplo fmt --check
    cargo fmt --check
    cargo clippy --workspace
    cargo test --workspace

integration-test:
    #!/usr/bin/env bash
    set -e

    trap 'just test-env down' EXIT
    just test-env fresh
    cargo test --workspace --features integration-test

pre-push: check

default: fmt && fix

__rm_entites:
    rm -f crates/entity/src/entities/*

__generate:
    sea-orm-cli generate entity \
    -o crates/entity/src/entities \
    --with-prelude=none \
    --with-serde=both \
    --enum-extra-derives Copy \
    --enum-extra-derives enumset::EnumSetType \
    --enum-extra-derives utoipa::ToSchema \
    --enum-extra-attributes="enumset(no_super_impls), enumset(serialize_repr = \"list\")"

generate: __rm_entites __generate

@migrate *args:
    cargo run -p migration "$@"

converge:
    cargo tarpaulin --workspace --exclude-files crates/entity/src/entities/*
