ARG DEBIAN_VERSION=bookworm
ARG RUST_BUILDER_IMAGE=thcdb/rust-builder:nightly-bookworm
ARG WILD_LINKER_IMAGE=thcdb/wild-linker-builder:nightly-bookworm

FROM ${WILD_LINKER_IMAGE} AS wild-linker-builder

FROM ${RUST_BUILDER_IMAGE} AS builder
WORKDIR /app

COPY --from=wild-linker-builder /usr/local/cargo/bin/wild /usr/local/cargo/bin/wild

ENV RUSTFLAGS="-Clink-arg=--ld-path=wild -Zshare-generics=y"

COPY . .

RUN rm -f rust-toolchain.toml rust-toolchain

# TODO: configure debug or release build
RUN --mount=type=cache,id=cargo_regi,target=/root/.cargo/registry \
    --mount=type=cache,id=cargo_git,target=/root/.cargo/git \
    --mount=type=cache,id=target,target=/app/target \
    cargo build \
    && mv /app/target/debug/thcdb_rs /root

FROM debian:${DEBIAN_VERSION}-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/thcdb_rs /app/thcdb_rs
COPY ./config.toml /app/config.toml

ENTRYPOINT ["/app/thcdb_rs"]
