default *argv:
    just dev::up {{ argv }}

up *argv:
    just build-toolchain-images
    docker compose -f docker-compose.yml up -d --build --remove-orphans {{ argv }}

fresh *argv:
    just build-toolchain-images
    docker compose -f docker-compose.yml up -d --build --force-recreate --remove-orphans {{ argv }}

down *argv:
    docker compose -f docker-compose.yml down --remove-orphans {{ argv }}

log *argv:
    docker compose -f docker-compose.yml logs -f {{ argv }}

logs *argv:
    just dev::log {{ argv }}
