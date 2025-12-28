# Repository Guidelines

## Project Structure & Module Organization
- `server/`: Rust backend services, data access, and migrations.
- `web/`: Solid.js + TypeScript frontend and shared web packages.
- `docs/`: Architecture notes, roadmap, and contributor docs (multi-language).
- Root `docker-compose.yml` and `.justfile`: local dev stack and top-level automation.

## Build, Test, and Development Commands
- `just --list` — discover available root tasks.
- `just dev` — start the Docker Compose stack.
- `just rebuild` — rebuild images and restart services.
- `just down` — stop services and remove local images.
- Module-specific commands are documented in each module’s guide.

