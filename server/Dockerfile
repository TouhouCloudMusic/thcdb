FROM rustlang/rust:nightly@sha256:2d1d69e289f49b809e90bde331469bb95eaf72d9f10aee1f9b7b951a6edc414c AS builder

WORKDIR /app

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim@sha256:90522eeb7e5923ee2b871c639059537b30521272f10ca86fdbbbb2b75a8c40cd

RUN apt-get update && apt-get install


COPY --from=builder /app/target/release/thcdb_rs /usr/local/bin/thcdb_rs


CMD ["thcdb_rs"]
