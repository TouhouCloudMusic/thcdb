# set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := true

init:
	prek install

dev:
	docker compose -f docker-compose.yml up --build --force-recreate --remove-orphans

server:
	docker compose -f docker-compose.yml up app --build --force-recreate --remove-orphans

down *args:
	docker compose -f docker-compose.yml down --remove-orphans {{args}}

compose *args:
	docker compose -f docker-compose.yml {{args}}
