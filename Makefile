# =============================================================================
# SQL Server Openflow POC — Makefile
# =============================================================================
#
# Local development environment for SQL Server CDC demo with Openflow.
# Connects to a cloud-hosted SQL Server instance.
#
# Quick Start:
#   make up       — Start Next.js + FastAPI + SQL Server
#   make dev      — Run FastAPI + Next.js locally (no Docker)
#   make down     — Stop all containers
#
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

COMPOSE_FILE     ?= docker-compose.nextjs.yml
SQL_PASSWORD     ?= <YOUR_SQL_PASSWORD>

.PHONY: up down rebuild logs logs-nextjs logs-fastapi logs-sqlserver dev fastapi nextjs help

# -----------------------------------------------------------------------------
# Docker Compose (Full Stack)
# -----------------------------------------------------------------------------
# Runs Next.js dashboard, FastAPI backend, and SQL Server in containers.

up:
	@echo "🐳 Starting development environment..."
	docker compose -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "⏳ Waiting for SQL Server to be ready..."
	@for i in $$(seq 1 30); do \
		docker compose -f $(COMPOSE_FILE) exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd \
			-S localhost -U sa -P "$(SQL_PASSWORD)" -C -Q "SELECT 1" \
			>/dev/null 2>&1 && echo "✅ SQL Server ready!" && break; \
		echo "   Waiting... ($$i/30)"; \
		sleep 2; \
	done
	@echo ""
	@echo "🎯 Services:"
	@echo "   Next.js Dashboard: http://localhost:3000"
	@echo "   FastAPI Backend:   http://localhost:8000"
	@echo "   SQL Server:        localhost:1433"

down:
	@echo "🛑 Stopping development environment..."
	docker compose -f $(COMPOSE_FILE) down
	@echo "✅ Stopped."

rebuild:
	@echo "🔄 Rebuilding and restarting containers..."
	docker compose -f $(COMPOSE_FILE) up -d --build
	@echo "✅ Rebuilt and running."

reset:
	@echo "🗑️  Resetting environment (removes volumes)..."
	docker compose -f $(COMPOSE_FILE) down -v
	@echo "✅ Reset complete."

# -----------------------------------------------------------------------------
# Container Logs
# -----------------------------------------------------------------------------
# View logs from specific containers.

logs:
	@docker compose -f $(COMPOSE_FILE) logs -f

logs-nextjs:
	@docker compose -f $(COMPOSE_FILE) logs -f nextjs

logs-fastapi:
	@docker compose -f $(COMPOSE_FILE) logs -f fastapi

logs-sqlserver:
	@docker compose -f $(COMPOSE_FILE) logs -f sqlserver

# -----------------------------------------------------------------------------
# Local Development (No Docker)
# -----------------------------------------------------------------------------
# Run services directly on your machine. Connects to cloud SQL Server.

fastapi:
	@echo "🚀 Starting FastAPI on http://localhost:8000"
	cd containers/fastapi && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

nextjs:
	@echo "🚀 Starting Next.js on http://localhost:3000"
	cd containers/nextjs && npm run dev

dev:
	@echo "🚀 Starting FastAPI + Next.js locally..."
	@echo "   FastAPI: http://localhost:8000"
	@echo "   Next.js: http://localhost:3000"
	@echo ""
	$(MAKE) -j2 fastapi nextjs

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

help:
	@echo "SQL Server Openflow POC"
	@echo ""
	@echo "  Docker Compose:"
	@echo "    make up            Start Next.js + FastAPI + SQL Server"
	@echo "    make down          Stop all containers"
	@echo "    make rebuild       Rebuild and restart containers"
	@echo "    make reset         Stop and remove volumes"
	@echo ""
	@echo "  Logs:"
	@echo "    make logs          Follow all container logs"
	@echo "    make logs-nextjs   Follow Next.js logs"
	@echo "    make logs-fastapi  Follow FastAPI logs"
	@echo "    make logs-sqlserver Follow SQL Server logs"
	@echo ""
	@echo "  Local Development (no Docker):"
	@echo "    make dev           Start FastAPI + Next.js together"
	@echo "    make fastapi       Start FastAPI only (port 8000)"
	@echo "    make nextjs        Start Next.js only (port 3000)"
	@echo ""
