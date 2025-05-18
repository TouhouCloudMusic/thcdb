FROM rustlang/rust:nightly@sha256:c16fc895b24c983805f1755ec5f4ae5dd09a8335384cc692da97a8207f3bdb75 AS builder

WORKDIR /app

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim@sha256:4b50eb66f977b4062683ff434ef18ac191da862dbe966961bc11990cf5791a8d



COPY --from=builder /app/target/release/thcdb_rs /usr/local/bin/thcdb_rs


CMD ["thcdb_rs"]
