FROM rustlang/rust:nightly AS builder

WORKDIR /app

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim



COPY --from=builder /app/target/release/thcdb_rs /usr/local/bin/thcdb_rs


CMD ["thcdb_rs"]
