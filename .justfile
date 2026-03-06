# set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := true
set positional-arguments := true

init:
	prek install

fmt:
	taplo fmt

fmt-all: fmt
	cd server && just fmt
	cd web && just fmt

build-toolchain-images:
	docker build -f server/Dockerfile.toolchain --target rust-builder -t thcdb/rust-builder:nightly-bookworm server
	docker build -f server/Dockerfile.toolchain --target wild-linker-builder -t thcdb/wild-linker-builder:nightly-bookworm server

dev: build-toolchain-images
	docker compose -f docker-compose.yml up --build --remove-orphans

dev-fresh: build-toolchain-images
	docker compose -f docker-compose.yml up --build --force-recreate --remove-orphans

server: build-toolchain-images
	docker compose -f docker-compose.yml up app --build --remove-orphans

server-fresh: build-toolchain-images
	docker compose -f docker-compose.yml up app --build --force-recreate --remove-orphans

down *args:
	docker compose -f docker-compose.yml down --remove-orphans {{args}}

compose *args:
	docker compose -f docker-compose.yml {{args}}
