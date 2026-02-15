# Architecture Design: Docker-based SQL Server CDC Testing Environment for Snowflake Openflow

## Overview
This document outlines the architecture for a self-contained, reproducible Docker environment simulating a SQL Server database with Change Data Capture (CDC) enabled. The goal is to allow Snowflake Sales Engineers (SEs) to test the Openflow SQL Server connector without a real SQL Server instance. The setup is cross-platform, working on Mac (ARM64) and Linux (x86), and starts with a single `docker-compose up` command.

Key features:
- SQL Server container with CDC enabled.
- Python-based data generator for simulating realistic INSERT, UPDATE, and DELETE operations.
- Optional monitoring container for easy database inspection.
- Reproducible, configurable, and SE-friendly with documentation.

## 1. Docker Compose Architecture
The setup uses Docker Compose to orchestrate containers. All services run on a shared Docker network for communication. Persistent volumes ensure data durability across restarts.

### Services
- **sqlserver**: Microsoft Azure SQL Edge (for ARM64 compatibility) or SQL Server (for x86). Image: `mcr.microsoft.com/azure-sql-edge:latest` (multi-arch support for amd64/arm64).
  - Ports: 1433 (exposed for Openflow connection).
  - Volumes: `/var/opt/mssql` for data persistence; init scripts mounted for startup.
  - Health check: SQL query to verify CDC is enabled and database is ready.
- **datagen**: Custom Python container that connects to SQL Server and generates data.
  - Depends on `sqlserver` (starts after it's healthy).
  - Volumes: Shared scripts for data generation.
  - Health check: Simple ping to SQL Server.
- **monitoring** (optional): Adminer container for web-based DB access (supports SQL Server via FreeTDS driver).
  - Image: `adminer:latest`.
  - Ports: 8080.
  - Depends on `sqlserver`.
  - Health check: HTTP probe on port 8080.

### Network and Volumes
- **Network**: Custom bridge network `cdc-net` for internal communication.
- **Volumes**:
  - `sql-data`: Persistent storage for SQL Server data.
  - `init-scripts`: Mounted host directory for SQL init scripts.
  - `datagen-scripts`: Mounted for Python scripts.

### Health Checks
- SQL Server: `CMD-SHELL` with `sqlcmd` to query `SELECT 1`.
- DataGen: Custom script to test DB connection.
- Monitoring: `curl --fail http://localhost:8080`.

### docker-compose.yml Snippet
```yaml
version: '3.8'
services:
  sqlserver:
    image: mcr.microsoft.com/azure-sql-edge:latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrongPassw0rd
      - MSSQL_ENABLE_HADR=1  # For CDC
    ports:
      - "1433:1433"
    volumes:
      - sql-data:/var/opt/mssql
      - ./init-scripts:/init-scripts
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P $$SA_PASSWORD -Q 'SELECT 1'"]
      interval: 10s
      retries: 10
    networks:
      - cdc-net

  datagen:
    build: ./datagen
    depends_on:
      sqlserver:
        condition: service_healthy
    environment:
      - SQL_SERVER_HOST=sqlserver
      - SQL_SERVER_PASSWORD=YourStrongPassw0rd
      - DATA_RATE=10  # Operations per minute
    volumes:
      - ./datagen/scripts:/app/scripts
    networks:
      - cdc-net

  monitoring:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - sqlserver
    environment:
      - ADMINER_DEFAULT_SERVER=sqlserver
      - ADMINER_DESIGN=dracula
    networks:
      - cdc-net

networks:
  cdc-net:
volumes:
  sql-data:
```

## 2. SQL Server Setup
- **Image Selection**: Use `mcr.microsoft.com/azure-sql-edge:latest` (Developer edition equivalent). It's lightweight, supports CDC, and is multi-arch (ARM64 for Mac, AMD64 for Linux). For full SQL Server features if needed, fallback to `mcr.microsoft.com/mssql/server:2022-latest` on x86 (with emulation on ARM via Docker Desktop settings).
- **CDC Enablement**: On startup, run init SQL scripts:
  - Enable CDC at instance level: `EXEC sys.sp_cdc_enable_db`.
  - Create sample database `DemoDB`.
  - Enable CDC on tables: `EXEC sys.sp_cdc_enable_table`.
- **Sample Database and Tables**:
  - Database: `DemoDB`.
  - Tables: Relatable e-commerce model for demos.
    - `Customers` (ID, Name, Email, JoinDate).
    - `Products` (ID, Name, Price, Stock).
    - This allows demonstrating CDC on INSERT (new order), UPDATE (status change), DELETE (order cancellation).
- **Init Script**: Mounted as `init.sql` and executed via entrypoint or healthcheck dependency.

## 3. Python Data Simulator
- **Connection Library**: Use `pyodbc` for cross-platform SQL Server connectivity (ODBC driver).
- **Functionality**:
  - Connect to SQL Server using env vars (host, user, password).
  - Generate realistic data with `faker` library (e.g., names, emails, products).
  - Operations: Loop performing INSERT (new records), UPDATE (modify existing), DELETE (remove records).
  - Configurable: Env vars for rate (ops/min), scenario (steady, burst, mixed), burst size.
- **Scenarios**:
  - Steady: Constant rate (e.g., 1 op every 6s for 10/min).
  - Burst: High-volume spikes (e.g., 50 ops in 10s, then pause).
  - Mixed: Random mix of INSERT/UPDATE/DELETE (e.g., 40/40/20%).
- **Dockerfile**: Base on `python:3.11-slim`, install `pyodbc`, `faker`, `unixodbc-dev`, and Microsoft ODBC driver.

## 4. Reproducibility Features
- **Single Command Start**: `docker-compose up -d` builds and starts everything.
- **README.md**: Step-by-step setup, prerequisites (Docker, Compose), usage, configuration.
- **Environment Variables**:
  - `SA_PASSWORD`: SQL admin password.
  - `DATA_RATE`: Ops per minute.
  - `SCENARIO`: steady|burst|mixed.
  - `BURST_SIZE`: For burst mode.
- **Cross-Platform**: Azure SQL Edge ensures native ARM64 support. Test on Mac M1+ and Ubuntu x86.
- **Cleanup Script**: `cleanup.sh` to `docker-compose down -v` and remove volumes/images.

## 5. SE-Friendly Design
- **Openflow Pointing**: Connect to `localhost:1433`, database `DemoDB`, user `sa`, password from env. Monitor CDC tables like `cdc.dbo_Orders_CT`.
- **Sample Openflow Config**:
  ```yaml
  connector: sqlserver
  host: localhost
  port: 1433
  user: sa
  password: YourStrongPassw0rd
  database: DemoDB
  tables: Orders, Customers, Products
  ```
- **Troubleshooting Guide**: Common issues (e.g., CDC not enabled, connection refused), logs checks, Docker restarts.
- **Expected Behavior**: "After starting, expect ~10 new rows in Snowflake within 1-2 minutes via Openflow sync. Updates/Deletes should propagate in near-real-time (under 30s)."

## Proposed File Structure
```
sql-server-openflow-poc/
├── docker-compose.yml       # Main compose file
├── README.md                # Setup, usage, docs
├── init-scripts/            # SQL init scripts
│   └── init.sql             # Enable CDC, create DB/tables
├── datagen/                 # Data generator service
│   ├── Dockerfile           # Build Python image
│   └── scripts/             # Mounted scripts
│       └── generator.py     # Main Python script
├── monitoring/              # Optional, if custom
├── cleanup.sh               # Cleanup script
└── .env                     # Env vars template
```
This structure keeps things modular and easy to extend.