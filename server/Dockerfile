FROM rustlang/rust:nightly@sha256:ebabfcbe6b9c40cc645638d512e84dfb922edfc3e26161a97eb277de6abf0fb8 AS builder

WORKDIR /app

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim@sha256:90522eeb7e5923ee2b871c639059537b30521272f10ca86fdbbbb2b75a8c40cd

RUN apt-get update && apt-get install


COPY --from=builder /app/target/release/thcdb_rs /usr/local/bin/thcdb_rs


CMD ["thcdb_rs"]
