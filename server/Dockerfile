FROM rustlang/rust:nightly@sha256:c16fc895b24c983805f1755ec5f4ae5dd09a8335384cc692da97a8207f3bdb75 AS builder

WORKDIR /app

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim@sha256:90522eeb7e5923ee2b871c639059537b30521272f10ca86fdbbbb2b75a8c40cd

RUN apt-get update && apt-get install


COPY --from=builder /app/target/release/thcdb_rs /usr/local/bin/thcdb_rs


CMD ["thcdb_rs"]
