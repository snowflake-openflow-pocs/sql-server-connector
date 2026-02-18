# Architecture Design: SQL Server CDC Testing Environment for Snowflake Openflow

## Overview
This document outlines the architecture for a self-contained, reproducible environment simulating a SQL Server database with Change Tracking enabled. The setup runs inside Snowflake SPCS (Snowpark Container Services), allowing Snowflake Sales Engineers (SEs) to test the Openflow SQL Server connector without external infrastructure. For local development, Docker Compose provides an identical experience.

Key features:
- SQL Server 2022 container with Change Tracking enabled on all demo tables.
- Streamlit dashboard with built-in data generator (Faker) for simulating realistic INSERT, UPDATE, and DELETE operations.
- Deployable to SPCS with a single `make all` command, or locally with `docker-compose up`.

## 1. Container Architecture

The setup uses two containers communicating via localhost (SPCS) or Docker network (local).

### Containers
- **sqlserver**: Microsoft SQL Server 2022 (`mcr.microsoft.com/mssql/server:2022-latest`, linux/amd64).
  - Ports: 1433.
  - Volumes: `/var/opt/mssql` for data persistence; init.sql runs on first startup.
  - Health check: SQL query via `sqlcmd` to verify readiness.
  - Databases: DemoDB (Customers, Products, Orders), SalesDB, HRDB — all with Change Tracking enabled.

- **streamlit**: Python-based Streamlit dashboard with built-in data generator.
  - Ports: 8501 (public HTTP endpoint in SPCS).
  - Dependencies: streamlit, pyodbc, faker, pandas, plotly.
  - Pages:
    - **Setup**: Database discovery, table readiness checks (PK, Change Tracking status).
    - **Simulator**: Data generation with steady/burst/mixed modes using Faker.
    - **Demo Script**: Step-by-step SE walkthrough with talking points.
  - Depends on `sqlserver` being healthy.

### Network and Storage
- **SPCS**: Containers share localhost networking within a single service. Block storage (10 GB) for SQL Server data.
- **Local**: Custom bridge network `cdc_net` for container communication. Docker volume for SQL Server data.

### docker-compose.yml
```yaml
version: '3.8'
services:
  sqlserver:
    platform: linux/amd64
    build: ./containers/sqlserver
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrongPassw0rd!
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $$SA_PASSWORD -C -Q 'SELECT 1'"]
      interval: 10s
      retries: 10
      start_period: 30s

  streamlit:
    platform: linux/amd64
    build: ./containers/streamlit
    environment:
      - SQL_HOST=sqlserver
      - SQL_PORT=1433
      - SQL_USER=sa
      - SQL_PASSWORD=YourStrongPassw0rd!
      - SQL_DATABASE=DemoDB
    ports:
      - "8501:8501"
    depends_on:
      sqlserver:
        condition: service_healthy

volumes:
  sqlserver_data:
```

## 2. SQL Server Setup
- **Image**: `mcr.microsoft.com/mssql/server:2022-latest` (linux/amd64, confirmed SPCS-compatible).
- **Change Tracking Enablement**: On startup, init.sql creates databases and enables Change Tracking at both database and table level.
- **Sample Databases and Tables**:
  - **DemoDB**: Customers, Products, Orders — relatable e-commerce model.
  - **SalesDB**: Accounts, Opportunities, Invoices.
  - **HRDB**: Employees, Departments, TimeOff (TimeOff deliberately missing CT — for demo purposes).
  - This allows demonstrating CDC on INSERT (new customer/order), UPDATE (status change, stock adjustment), DELETE (order cancellation).

## 3. Built-in Data Generator (Streamlit Simulator)
Data generation is integrated directly into the Streamlit dashboard's Simulator page, eliminating the need for a separate container.

- **Connection**: Uses `pyodbc` with ODBC Driver 18 for SQL Server.
- **Data Library**: `faker` for realistic names, emails, cities, etc.
- **Operations**: INSERT (customers, orders), UPDATE (order status, product stock), DELETE (pending orders).
- **Modes**:
  - **Steady**: ~10 ops/minute (1 every 6 seconds) via `st.fragment(run_every=6)`.
  - **Burst**: 50 operations in rapid succession, then pause.
  - **Mixed**: Random mix of INSERT (40%) / UPDATE (40%) / DELETE (20%).
- **Controls**: Start/Stop/Reset buttons with real-time metrics display.
- **Live Metrics**: Auto-refreshing entity counts and order status breakdown via `st.fragment(run_every=2)`.

## 4. Reproducibility Features
- **Single Command Deploy**: `make all` for SPCS, `docker-compose up` for local.
- **Environment Variables**: SA_PASSWORD, SQL_HOST, SQL_PORT, SQL_USER, SQL_DATABASE.
- **Cross-Platform**: SQL Server 2022 linux/amd64 runs natively on SPCS and via Rosetta emulation on Apple Silicon.
- **Cleanup**: `make clean` for SPCS, `docker-compose down -v` for local.

## 5. SE-Friendly Design
- **Openflow Connection**: Internal SPCS DNS (`cdc-demo-service.<hash>.svc.spcs.internal:1433`), no EAI needed.
- **Dashboard**: Public HTTP endpoint via SPCS ingress, Snowflake OAuth authentication.
- **Demo Script Page**: Step-by-step walkthrough with talking points for SE presentations.

## File Structure
```
sql-server-openflow-poc/
├── README.md                    # SE setup guide
├── DEPLOYMENT-PLAN.md           # Build plan and architecture decisions
├── architecture.md              # This document
├── Makefile                     # Full deployment automation
├── docker-compose.yml           # Local testing
├── .env.example                 # Environment template
├── setup/
│   ├── 01-create-objects.sql    # DB, warehouse, repo, pool, secrets
│   ├── 02-create-service.sql    # SPCS service spec
│   └── 99-cleanup.sql           # DROP everything
├── containers/
│   ├── sqlserver/
│   │   ├── Dockerfile
│   │   ├── init.sql             # DemoDB + SalesDB + HRDB + Change Tracking
│   │   └── startup.sh           # Wait for SQL Server, run init
│   └── streamlit/
│       ├── Dockerfile
│       ├── pyproject.toml       # Dependencies
│       ├── Home.py              # Landing page
│       ├── db.py                # DB connection utility
│       ├── components.py        # Reusable UI components
│       ├── theme.py             # Snowflake dark theme
│       ├── pages/
│       │   ├── 1_Setup.py       # DB discovery, CT verification
│       │   ├── 2_Simulator.py   # Built-in data generator
│       │   └── 3_Demo_Script.py # SE walkthrough
│       └── .streamlit/
│           └── config.toml
├── scripts/
│   ├── push-images.sh           # Build + push images
│   └── test-local.sh            # Local health check
└── skills/
    ├── DEPLOY-SQL-SERVER.md
    └── DEPLOY-OPENFLOW-CONNECTOR.md
```
