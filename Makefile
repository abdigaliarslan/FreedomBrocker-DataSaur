.PHONY: up down run migrate dev-fe build

# Docker
up:
	docker compose up -d

down:
	docker compose down

# Backend
run:
	cd backend && go run ./cmd/server

build:
	cd backend && go build -o bin/fire-server ./cmd/server

# Database
migrate:
	cd backend && go run ./cmd/server --migrate-only

# Frontend
dev-fe:
	cd frontend && npm run dev

# All (dev mode)
dev: up
	@echo "PostgreSQL is running on :5432"
	@echo "Run 'make run' for backend and 'make dev-fe' for frontend"
