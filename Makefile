.PHONY: help up down restart build dev logs ps clean backfill test lint format

# Default target
help:
	@echo "Mission Control - Available Commands:"
	@echo "  make up          - Start all docker containers in background"
	@echo "  make down        - Stop and remove all containers"
	@echo "  make restart     - Restart all docker containers"
	@echo "  make build       - Build docker images"
	@echo "  make dev         - Start frontend Vite dev server (port 5173)"
	@echo "  make logs        - Follow logs from all docker containers"
	@echo "  make ps          - Show status of running containers"
	@echo "  make clean       - Stop containers and remove volumes"
	@echo "  make backfill    - Run 30-day historical data ingestion"
	@echo "  make test        - Run test suite across all monorepo workspaces"
	@echo "  make lint        - Run linter across all workspaces"
	@echo "  make format      - Format source code with Prettier"

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

build:
	docker compose build

dev:
	npm run dev --workspace=@mission-control/frontend

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v

backfill:
	docker compose exec ingestion-service npm run backfill || docker compose run --rm ingestion-service npm run backfill

test:
	npm test

lint:
	npm run lint

format:
	npm run format
