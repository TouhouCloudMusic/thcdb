# set shell := ["bash", "-euo", "pipefail", "-c"]

set dotenv-load := true
set positional-arguments := true

mod dev

init:
    prek install

fmt:
    taplo fmt
    just --fmt --unstable

fmt-all: fmt
    cd server && just fmt
    cd web && just fmt

build-toolchain-images:
    docker build -f server/Dockerfile.toolchain --target rust-builder -t thcdb/rust-builder:nightly-bookworm server
    docker build -f server/Dockerfile.toolchain --target wild-linker-builder -t thcdb/wild-linker-builder:nightly-bookworm server
