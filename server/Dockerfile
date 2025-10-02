FROM debian:bookworm-slim AS base
RUN apt-get update && apt-get install -y curl

FROM base AS wild
RUN curl -L https://github.com/davidlattimore/wild/releases/download/0.6.0/wild-linker-0.6.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz -C /usr/local/bin/ --strip-components=1


FROM rust:slim-bookworm AS builder

RUN rustup toolchain install nightly-x86_64-unknown-linux-gnu && \
    rustup default nightly

WORKDIR /app

RUN apt-get update && apt-get install -y \
    clang \
    lld \
    libssl-dev \
    pkg-config \
    git \
    libgit2-dev

COPY . .
COPY --from=wild /usr/local/bin/wild /usr/local/bin/wild

ENV RUSTFLAGS="-Clink-arg=--ld-path=wild -Zthreads=0 -Zshare-generics=y"
ENV CARGO_INCREMENTAL=0
# TODO: configure debug or release build
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build

FROM debian:bookworm-slim AS runtime

WORKDIR /app

COPY --from=builder /app/target/debug/thcdb_rs /app/thcdb_rs
COPY ./config.toml .

ENTRYPOINT ["/app/thcdb_rs"]
