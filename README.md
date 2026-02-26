# SQL Server Openflow CDC Demo

> Real-time data replication from SQL Server to Snowflake using Change Data Capture

> **Note:** For full end-to-end Openflow replication, SQL Server must be deployed on a publicly accessible host (e.g., DigitalOcean, AWS RDS, Azure SQL). Openflow connectors run inside Snowflake and need network access to your database.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   SQL Server    │         │    Openflow     │         │   Snowflake     │
│                 │ ──CDC──▶│   (Apache NiFi) │ ──────▶ │                 │
│  Change Tracking│         │   Connectors    │         │  Destination    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## What is Openflow?

**Openflow** is Snowflake's managed data integration platform built on Apache NiFi. It moves data from external sources into Snowflake in real-time — no ETL code required.

| Feature | Description |
|---------|-------------|
| **Pre-built Connectors** | 30+ sources including PostgreSQL, MySQL, Salesforce, Kafka, Google Drive |
| **Real-time CDC** | Changes appear in Snowflake within seconds |
| **Schema Evolution** | Automatic handling of `ALTER TABLE` and DDL changes |
| **Exactly-once Delivery** | Journal tables ensure no duplicates |

Run `make up` and visit the dashboard home page for an interactive overview.

---

## Quick Start

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env` with your SQL Server connection:

```env
SQL_HOST=your-sql-server-host
SQL_PORT=1433
SQL_USER=sa
SQL_PASSWORD=your-password
SQL_DATABASE=RetailAnalyticsDB
```

### 2. Start

```bash
make up
```

### 3. Open Dashboard

http://localhost:3000

---

## What's Included

| Component | Description |
|-----------|-------------|
| `containers/nextjs/` | Dashboard UI — visualize CDC flow and monitor replication |
| `containers/fastapi/` | API backend for SQL Server queries |
| `containers/sqlserver/` | Sample databases with Change Tracking enabled |
| `docs/` | Technical documentation and architecture guides |

---

## Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers |
| `make down` | Stop all containers |
| `make logs` | Follow container logs |
| `make dev` | Run locally without Docker |

---

## SQL Server Requirements

For Openflow CDC to work, your SQL Server tables need:

1. **Primary keys** on all replicated tables
2. **Change Tracking enabled** at database and table level

```sql
-- Enable on database
ALTER DATABASE YourDB SET CHANGE_TRACKING = ON 
  (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);

-- Enable on each table
ALTER TABLE dbo.YourTable ENABLE CHANGE_TRACKING 
  WITH (TRACK_COLUMNS_UPDATED = ON);
```

---

## Learn More

- [Openflow Documentation](https://docs.snowflake.com/en/user-guide/data-load/openflow) — Official Snowflake docs
- [SQL Server Connector](https://docs.snowflake.com/en/user-guide/data-load/openflow/connectors/sql-server/about) — Setup and configuration
