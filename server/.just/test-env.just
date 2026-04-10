set working-directory := '..'

up:
    docker compose -f docker-compose.test.yml up -d --remove-orphans

fresh:
    docker compose -f docker-compose.test.yml up -d --force-recreate --remove-orphans

down:
    docker compose -f docker-compose.test.yml down --remove-orphans

logs *args:
    docker compose -f docker-compose.test.yml logs {{ args }}
