FROM debian:bookworm-slim AS base
RUN apt-get update && apt-get install -y curl

FROM base AS builder

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

RUN apt-get update && apt-get install -y \
    clang \
    libssl-dev \
    pkg-config \
    git \
    libgit2-dev \
    mold

RUN rustup update \
&& rustup override set nightly \
&& rustup component add rustc-codegen-cranelift-preview --toolchain nightly \
&& rustup target add x86_64-unknown-linux-gnu --toolchain nightly

ENV RUSTFLAGS="-Clink-arg=--ld-path=mold -Zthreads=0 -Zshare-generics=y"
ENV CARGO_INCREMENTAL=0

COPY . .

# TODO: configure debug or release build
RUN --mount=type=cache,id=cargo_regi,target=/root/.cargo/registry \
    --mount=type=cache,id=cargo_git,target=/root/.cargo/git \
    --mount=type=cache,id=target,target=/app/target \
    cargo build \
    && mv /app/target/debug/thcdb_rs /root

FROM debian:bookworm-slim AS runtime

COPY --from=builder /root/thcdb_rs /root/thcdb_rs
COPY ./config.toml .

ENTRYPOINT ["/root/thcdb_rs"]
