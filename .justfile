set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := true

dev:
	docker compose -f docker-compose.yml up --remove-orphans

rebuild:
	docker compose -f docker-compose.yml up --build --force-recreate --remove-orphans

down:
	local_images="$$(docker compose -f docker-compose.yml images 2>/dev/null | awk '$$2 ~ /^localhost\\// {print $$2 \":\" $$3}' || true)"; \
	docker compose -f docker-compose.yml down --remove-orphans; \
	if [[ -n "$$local_images" ]]; then docker image rm -f $$local_images; fi

compose *args:
	docker compose -f docker-compose.yml {{args}}
