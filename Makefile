# =============================================================================
# SQL Server Openflow POC — Makefile
# =============================================================================
#
# Deploy a SQL Server CDC demo environment to Snowpark Container Services.
# Usage:
#   make all              — Full deployment (setup → build → push → deploy)
#   make local-up         — Run locally with Docker Compose
#   make clean            — Tear everything down
#
# Prerequisites:
#   - snow CLI (authenticated)
#   - Docker Desktop (running)
#   - nipyapi CLI (for Openflow steps)
#
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Override these via environment or command line:
#   make deploy SNOW_CONN=my-connection REGISTRY_URL=xyz.registry.snowflakecomputing.com/...

SNOW_CONN        ?= pronoia.g
DATABASE         ?= CDC_DEMO
SCHEMA           ?= PUBLIC
WAREHOUSE        ?= CDC_DEMO_WH
COMPUTE_POOL     ?= CDC_DEMO_POOL
SERVICE_NAME     ?= CDC_DEMO_SERVICE
IMAGE_REPO       ?= $(DATABASE).$(SCHEMA).IMAGES
SA_PASSWORD      ?= YourStrongPassw0rd!

# Snowflake registry URL — get this from: snow sql -q "DESCRIBE IMAGE REPOSITORY ..."
REGISTRY_URL     ?= $(shell snow sql -c $(SNOW_CONN) -q "DESCRIBE IMAGE REPOSITORY $(IMAGE_REPO);" --format json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('repository_url','REGISTRY_NOT_SET'))" 2>/dev/null || echo "REGISTRY_NOT_SET")

# Image names
SQLSERVER_IMAGE  ?= $(REGISTRY_URL)/sqlserver:latest
DATAGEN_IMAGE    ?= $(REGISTRY_URL)/datagen:latest
STREAMLIT_IMAGE  ?= $(REGISTRY_URL)/streamlit:latest

# Platform — SPCS requires linux/amd64
PLATFORM         ?= linux/amd64

.PHONY: all setup login build push deploy verify local-up local-down logs clean help

# -----------------------------------------------------------------------------
# Full Deployment Pipeline
# -----------------------------------------------------------------------------
# Runs the complete deployment from scratch. Idempotent — safe to re-run.

all: setup login build push deploy verify
	@echo ""
	@echo "✅ Full deployment complete!"
	@echo "   Run 'make status' to check service health."
	@echo "   Run 'make endpoint' to get the dashboard URL."

# -----------------------------------------------------------------------------
# Snowflake Object Setup
# -----------------------------------------------------------------------------
# Creates the database, warehouse, image repository, compute pool, and secrets.
# Uses IF NOT EXISTS — safe to run multiple times.

setup:
	@echo "🏗️  Creating Snowflake objects..."
	snow sql -c $(SNOW_CONN) -q " \
		CREATE DATABASE IF NOT EXISTS $(DATABASE); \
		USE DATABASE $(DATABASE); \
		CREATE SCHEMA IF NOT EXISTS $(SCHEMA); \
		CREATE WAREHOUSE IF NOT EXISTS $(WAREHOUSE) \
			WAREHOUSE_SIZE = 'XSMALL' \
			AUTO_SUSPEND = 60 \
			AUTO_RESUME = TRUE; \
		CREATE IMAGE REPOSITORY IF NOT EXISTS $(IMAGE_REPO); \
		CREATE COMPUTE POOL IF NOT EXISTS $(COMPUTE_POOL) \
			MIN_NODES = 1 \
			MAX_NODES = 1 \
			INSTANCE_FAMILY = CPU_X64_S \
			AUTO_RESUME = TRUE \
			AUTO_SUSPEND_SECS = 3600; \
	"
	@echo ""
	@echo "🔐 Creating SA password secret..."
	snow sql -c $(SNOW_CONN) -q " \
		CREATE SECRET IF NOT EXISTS $(DATABASE).$(SCHEMA).SQL_SA_PASSWORD \
			TYPE = PASSWORD \
			USERNAME = 'sa' \
			PASSWORD = '$(SA_PASSWORD)'; \
	"
	@echo "✅ Snowflake objects ready."

# -----------------------------------------------------------------------------
# Docker Registry Login
# -----------------------------------------------------------------------------
# Authenticates Docker to the Snowflake image registry.
# Uses snow CLI credentials — no separate password needed.

login:
	@echo "🔑 Logging into Snowflake registry..."
	@echo "   Registry: $(REGISTRY_URL)"
	snow spcs image-registry login -c $(SNOW_CONN)
	@echo "✅ Docker authenticated."

# -----------------------------------------------------------------------------
# Build Container Images
# -----------------------------------------------------------------------------
# Builds all 3 images for linux/amd64 (required by SPCS).
# On Apple Silicon, this cross-compiles via Docker buildx.

build: build-sqlserver build-datagen build-streamlit
	@echo "✅ All images built."

build-sqlserver:
	@echo "🔨 Building SQL Server image..."
	docker build --platform $(PLATFORM) \
		-t sqlserver:latest \
		-f containers/sqlserver/Dockerfile \
		containers/sqlserver/

build-datagen:
	@echo "🔨 Building Data Generator image..."
	docker build --platform $(PLATFORM) \
		-t datagen:latest \
		-f containers/datagen/Dockerfile \
		containers/datagen/

build-streamlit:
	@echo "🔨 Building Streamlit Dashboard image..."
	docker build --platform $(PLATFORM) \
		-t streamlit:latest \
		-f containers/streamlit/Dockerfile \
		containers/streamlit/

# -----------------------------------------------------------------------------
# Push Images to Snowflake Registry
# -----------------------------------------------------------------------------
# Tags local images with the Snowflake registry URL and pushes them.

push: push-sqlserver push-datagen push-streamlit
	@echo "✅ All images pushed to Snowflake registry."

push-sqlserver:
	@echo "📤 Pushing SQL Server image..."
	docker tag sqlserver:latest $(SQLSERVER_IMAGE)
	docker push $(SQLSERVER_IMAGE)

push-datagen:
	@echo "📤 Pushing Data Generator image..."
	docker tag datagen:latest $(DATAGEN_IMAGE)
	docker push $(DATAGEN_IMAGE)

push-streamlit:
	@echo "📤 Pushing Streamlit Dashboard image..."
	docker tag streamlit:latest $(STREAMLIT_IMAGE)
	docker push $(STREAMLIT_IMAGE)

# -----------------------------------------------------------------------------
# Deploy SPCS Service
# -----------------------------------------------------------------------------
# Creates the multi-container service on SPCS.
# All 3 containers run in a single service, communicating via localhost.

deploy:
	@echo "🚀 Deploying service to SPCS..."
	snow sql -c $(SNOW_CONN) -q " \
		CREATE SERVICE IF NOT EXISTS $(DATABASE).$(SCHEMA).$(SERVICE_NAME) \
			IN COMPUTE POOL $(COMPUTE_POOL) \
			MIN_INSTANCES = 1 \
			MAX_INSTANCES = 1 \
			AUTO_RESUME = TRUE \
			FROM SPECIFICATION \$$\$$ \
			spec: \
			  containers: \
			    - name: sqlserver \
			      image: /$(IMAGE_REPO)/sqlserver:latest \
			      env: \
			        ACCEPT_EULA: \"Y\" \
			      secrets: \
			        - snowflakeSecret: \
			            objectName: $(DATABASE).$(SCHEMA).SQL_SA_PASSWORD \
			            secretKeyRef: password \
			            envVarName: MSSQL_SA_PASSWORD \
			      resources: \
			        requests: \
			          memory: 2Gi \
			          cpu: \"1\" \
			        limits: \
			          memory: 4Gi \
			          cpu: \"2\" \
			      volumeMounts: \
			        - name: sql-data \
			          mountPath: /var/opt/mssql \
			    - name: datagen \
			      image: /$(IMAGE_REPO)/datagen:latest \
			      env: \
			        SQL_HOST: localhost \
			        SQL_PORT: \"1433\" \
			        SQL_USER: sa \
			        SQL_DATABASE: DemoDB \
			        DATA_MODE: steady \
			      secrets: \
			        - snowflakeSecret: \
			            objectName: $(DATABASE).$(SCHEMA).SQL_SA_PASSWORD \
			            secretKeyRef: password \
			            envVarName: SQL_PASSWORD \
			      resources: \
			        requests: \
			          memory: 512Mi \
			          cpu: \"0.5\" \
			        limits: \
			          memory: 1Gi \
			          cpu: \"1\" \
			    - name: streamlit \
			      image: /$(IMAGE_REPO)/streamlit:latest \
			      env: \
			        SQL_HOST: localhost \
			        SQL_PORT: \"1433\" \
			        SQL_USER: sa \
			        SQL_DATABASE: DemoDB \
			      secrets: \
			        - snowflakeSecret: \
			            objectName: $(DATABASE).$(SCHEMA).SQL_SA_PASSWORD \
			            secretKeyRef: password \
			            envVarName: SQL_PASSWORD \
			      readinessProbe: \
			        port: 8501 \
			        path: / \
			      resources: \
			        requests: \
			          memory: 512Mi \
			          cpu: \"0.5\" \
			        limits: \
			          memory: 1Gi \
			          cpu: \"1\" \
			  endpoints: \
			    - name: dashboard \
			      port: 8501 \
			      protocol: HTTP \
			      public: true \
			  volumes: \
			    - name: sql-data \
			      source: block \
			      size: 10Gi \
			      blockConfig: \
			        iops: 1000 \
			        encryption: SNOWFLAKE_SSE \
			        snapshotOnDelete: true \
			        snapshotDeleteAfter: 7d \
			  logExporters: \
			    eventTableConfig: \
			      logLevel: INFO \
			\$$\$$; \
	"
	@echo "✅ Service created. Containers starting..."
	@echo "   Run 'make status' to monitor startup."

# -----------------------------------------------------------------------------
# Verify & Monitor
# -----------------------------------------------------------------------------
# Check service health, container status, and get the dashboard URL.

verify:
	@echo "🔍 Checking service status..."
	snow sql -c $(SNOW_CONN) -q "DESCRIBE SERVICE $(DATABASE).$(SCHEMA).$(SERVICE_NAME);"
	@echo ""
	snow sql -c $(SNOW_CONN) -q "SHOW SERVICE INSTANCES IN SERVICE $(DATABASE).$(SCHEMA).$(SERVICE_NAME);"

status: verify

# View logs for a specific container (default: sqlserver)
# Usage: make logs CONTAINER=datagen
CONTAINER ?= sqlserver
logs:
	@echo "📋 Logs for container '$(CONTAINER)'..."
	snow sql -c $(SNOW_CONN) -q " \
		SELECT value::STRING as log_line \
		FROM TABLE(SYSTEM\$$GET_SERVICE_LOGS( \
			'$(DATABASE).$(SCHEMA).$(SERVICE_NAME)', 0, '$(CONTAINER)' \
		)); \
	"

# Get the public endpoint URL for the Streamlit dashboard
endpoint:
	@echo "🌐 Dashboard endpoint:"
	@snow sql -c $(SNOW_CONN) -q " \
		SHOW ENDPOINTS IN SERVICE $(DATABASE).$(SCHEMA).$(SERVICE_NAME);" \
		--format json 2>/dev/null | python3 -c " \
		import sys,json; \
		eps = json.load(sys.stdin); \
		[print(f\"   {e.get('name','')}: {e.get('ingress_url','')}\") for e in eps]" \
		2>/dev/null || echo "   Service not ready yet. Run 'make status' to check."

# -----------------------------------------------------------------------------
# Local Development
# -----------------------------------------------------------------------------
# Run the full stack locally with Docker Compose.
# Uses docker-compose.yml (SQL Server 2022 works on Mac via Rosetta emulation).

local-up:
	@echo "🐳 Starting local environment..."
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up -d
	@echo ""
	@echo "⏳ Waiting for SQL Server to be ready..."
	@for i in $$(seq 1 30); do \
		docker compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd \
			-S localhost -U sa -P "$(SA_PASSWORD)" -C -Q "SELECT 1" \
			>/dev/null 2>&1 && echo "✅ SQL Server ready!" && break; \
		echo "   Waiting... ($$i/30)"; \
		sleep 2; \
	done
	@echo ""
	@echo "🎯 Services:"
	@echo "   Streamlit Dashboard: http://localhost:8501"
	@echo "   Adminer (DB viewer): http://localhost:8080"
	@echo "   SQL Server:          localhost:1433"

local-down:
	@echo "🛑 Stopping local environment..."
	docker compose down
	@echo "✅ Stopped."

local-reset:
	@echo "🗑️  Resetting local environment (removes volumes)..."
	docker compose down -v
	@echo "✅ Reset complete."

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------
# Tears down all Snowflake objects. Destructive — use with care.

clean:
	@echo "⚠️  Tearing down SPCS resources..."
	@echo "   Dropping service..."
	-snow sql -c $(SNOW_CONN) -q "DROP SERVICE IF EXISTS $(DATABASE).$(SCHEMA).$(SERVICE_NAME);"
	@echo "   Dropping compute pool..."
	-snow sql -c $(SNOW_CONN) -q "DROP COMPUTE POOL IF EXISTS $(COMPUTE_POOL);"
	@echo "   Dropping secret..."
	-snow sql -c $(SNOW_CONN) -q "DROP SECRET IF EXISTS $(DATABASE).$(SCHEMA).SQL_SA_PASSWORD;"
	@echo "   Dropping image repository..."
	-snow sql -c $(SNOW_CONN) -q "DROP IMAGE REPOSITORY IF EXISTS $(IMAGE_REPO);"
	@echo "   Dropping warehouse..."
	-snow sql -c $(SNOW_CONN) -q "DROP WAREHOUSE IF EXISTS $(WAREHOUSE);"
	@echo "   Dropping database..."
	-snow sql -c $(SNOW_CONN) -q "DROP DATABASE IF EXISTS $(DATABASE);"
	@echo "✅ All Snowflake objects removed."

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

help:
	@echo "SQL Server Openflow POC — Available targets:"
	@echo ""
	@echo "  SPCS Deployment:"
	@echo "    make all            Full pipeline: setup → build → push → deploy → verify"
	@echo "    make setup          Create Snowflake objects (DB, warehouse, pool, secrets)"
	@echo "    make login          Docker login to Snowflake registry"
	@echo "    make build          Build all container images (linux/amd64)"
	@echo "    make push           Push images to Snowflake registry"
	@echo "    make deploy         Create SPCS service"
	@echo "    make verify         Check service status"
	@echo "    make endpoint       Get dashboard URL"
	@echo "    make logs           View container logs (CONTAINER=sqlserver|datagen|streamlit)"
	@echo "    make clean          Drop all Snowflake objects"
	@echo ""
	@echo "  Local Development:"
	@echo "    make local-up       Start with Docker Compose"
	@echo "    make local-down     Stop containers"
	@echo "    make local-reset    Stop + remove volumes"
	@echo ""
	@echo "  Configuration (override via env or CLI):"
	@echo "    SNOW_CONN=pronoia.g   Snowflake connection name"
	@echo "    SA_PASSWORD=...       SQL Server SA password"
	@echo "    DATABASE=CDC_DEMO     Target database name"
	@echo ""
