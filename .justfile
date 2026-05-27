# set shell := ["bash", "-euo", "pipefail", "-c"]

set dotenv-load
set positional-arguments

mod dev

init:
    prek install
    uv sync
    cd web && pnpm install

fmt:
    taplo fmt
    just --fmt
    ruff format
    cd server && just fmt
    cd web && just fmt

build-toolchain-images:
    docker build -f server/Dockerfile.toolchain --target rust-builder -t thcdb/rust-builder:nightly-bookworm server
    docker build -f server/Dockerfile.toolchain --target wild-linker-builder -t thcdb/wild-linker-builder:nightly-bookworm server
