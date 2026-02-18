# SQL Server Openflow POC – Deployment Plan
**Date:** February 14, 2026  
**Audience:** Snowflake Sales Engineering (Pablow)  
**Status:** Pre-Build Review  
**Target Demo:** Thursday, February 19, 2026

---

## 1. What We're Building

A fully self-contained SPCS-based SQL Server CDC demo environment that any Snowflake SE can deploy into their own account. One set of `snow` CLI commands brings online a SQL Server 2022 instance (with Change Tracking enabled), a Python data generator producing realistic e-commerce activity, and a Streamlit dashboard for controlling and monitoring the demo — all running inside Snowflake. The SE then deploys the Openflow SQL Server CDC connector, which connects to the SQL Server via internal SPCS DNS (zero networking friction), and watches data flow into Snowflake tables in real-time. No external infrastructure, no tunnels, no cloud hosting — everything lives inside Snowflake.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SNOWFLAKE ACCOUNT (SPCS)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Compute Pool: CDC_DEMO_POOL (CPU_X64_S: 3 vCPU, 13 GB)      │   │
│  │                                                              │   │
│  │  Service: CDC_DEMO_SERVICE (single service, 2 containers)    │   │
│  │  ┌────────────────┐ ┌──────────────────────┐                 │   │
│  │  │  SQL Server    │ │  Streamlit Dashboard  │                 │   │
│  │  │  2022 (linux/  │ │  + Data Generator     │                 │   │
│  │  │  amd64)        │ │  (Python/Faker)       │                 │   │
│  │  │  Port 1433     │ │  Port 8501            │                 │   │
│  │  │  DemoDB        │ │  (public HTTP)        │                 │   │
│  │  │  - Customers   │ │  Pages:               │                 │   │
│  │  │  - Products    │ │  · Setup              │                 │   │
│  │  │  - Orders      │ │  · Simulator (gen)    │                 │   │
│  │  │  Change Tracking│ │  · Demo Script       │                 │   │
│  │  │  enabled       │ │                       │                 │   │
│  │  └───────┬────────┘ └──────────────────────┘                 │   │
│  │          │ Block Storage (10 GB)                             │   │
│  │          │ /var/opt/mssql                                    │   │
│  └──────────┼───────────────────────────────────────────────────┘   │
│             │                                                       │
│             │ Internal DNS: cdc-demo-service.<hash>.svc.spcs.internal:1433
│             │ (no EAI needed — same SPCS network)                   │
│             │                                                       │
│  ┌──────────▼───────────────────────────────────────────────────┐   │
│  │  Openflow Runtime (SPCS)                                     │   │
│  │  SQL Server CDC Connector                                    │   │
│  │  · JDBC URL: jdbc:sqlserver://cdc-demo-service.<hash>        │   │
│  │    .svc.spcs.internal:1433;databaseName=DemoDB               │   │
│  │  · Change Tracking polling                                   │   │
│  │  · PutSnowpipeStreaming → Snowflake tables                   │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                       │
│  ┌──────────▼───────────────────────────────────────────────────┐   │
│  │  Snowflake Tables (CDC Target)                               │   │
│  │  POC_CDC.PUBLIC.Customers / Products / Orders                │   │
│  │  Near-real-time sync from SQL Server                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture

| Factor | SPCS | Docker Local + ngrok | Render/Cloud |
|--------|------|---------------------|--------------|
| **Networking** | Internal DNS, zero config | Tunnel needed, fragile | Stable but external |
| **SE reproducibility** | Clone repo, run commands | Docker Desktop required | Account signup |
| **Openflow connectivity** | Same network, no EAI | EAI + tunnel endpoint | EAI + external host |
| **Demo story** | "Everything in Snowflake" | "Laptop demo" | "Cloud hosted" |
| **Maintenance** | Zero external deps | Docker version issues | Cloud billing |

---

## 3. Infrastructure Specs

### Compute Pool

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Instance Family** | `CPU_X64_S` | 3 vCPU, 13 GB — fits SQL Server (2-4GB) + generator (1GB) + Streamlit (1GB) with headroom |
| **Min Nodes** | 1 | POC only needs one node |
| **Max Nodes** | 1 | No scaling needed |
| **Auto Suspend** | 3600s (1 hour) | Save credits when not demoing |
| **Auto Resume** | TRUE | Restart automatically when service accessed |

**Cost estimate:** ~1-2 credits/hour while running. Auto-suspend keeps idle cost at zero.

If 13 GB feels tight, step up to `CPU_X64_M` (6 vCPU, 28 GB) for comfort.

### Container Resources

| Container | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|------------|-----------|----------------|--------------|
| **SQL Server 2022** | 1 | 2 | 2 Gi | 4 Gi |
| **Streamlit + Data Generator** | 0.5 | 1 | 512 Mi | 1 Gi |
| **Total** | 1.5 | 3 | ~2.5 Gi | ~5 Gi |

### Storage

- **Block volume:** 10 GB for SQL Server data at `/var/opt/mssql`
- **Encryption:** SNOWFLAKE_SSE
- **Snapshot on delete:** Yes (7-day retention)

### Image: SQL Server 2022 (NOT Azure SQL Edge)

**Why SQL Server 2022 over Azure SQL Edge:**
- ✅ Confirmed `linux/amd64` support (SPCS requirement)
- ✅ Full Change Tracking + CDC support
- ✅ SQL Agent available (needed for full CDC)
- ❌ Azure SQL Edge: ARM64 primary, amd64 support uncertain on SPCS

**Image:** `mcr.microsoft.com/mssql/server:2022-latest`

---

## 4. Build Phases

### Phase 1: Docker Images (Day 1) — ~5 hours

**Objective:** Both container images built, tested locally, pushed to Snowflake registry.

| Task | Time | Deliverable |
|------|------|-------------|
| **1.1** Create image repository in Snowflake | 15m | `CREATE IMAGE REPOSITORY poc_images` |
| **1.2** SQL Server Dockerfile (2022 + init.sql for DemoDB + Change Tracking) | 1.5h | Dockerfile + init.sql with Customers/Products/Orders + CT enabled |
| **1.3** Streamlit Dockerfile (Python + streamlit + pyodbc + faker + ODBC driver) | 1.5h | Dockerfile + multipage app with built-in data generator |
| **1.4** Test locally with docker-compose | 30m | Both containers run, data flows, dashboard loads |
| **1.5** Push all images to Snowflake registry | 30m | `docker push` × 2 |

**Exit Criteria:** Both images in Snowflake registry, verified locally.

### Phase 2: SPCS Deployment + Streamlit (Day 2) — ~6 hours

**Objective:** Service running on SPCS, Streamlit dashboard functional.

| Task | Time | Deliverable |
|------|------|-------------|
| **2.1** Create compute pool + secrets + service spec | 1h | SQL commands + `service_spec.yaml` |
| **2.2** Deploy service to SPCS | 30m | `CREATE SERVICE` + verify both containers running |
| **2.3** Validate SQL Server + Change Tracking via logs | 30m | `SYSTEM$GET_SERVICE_LOGS` shows DemoDB ready |
| **2.4** Streamlit Setup page (DB health, table status, CT verification) | 1h | Connection info card, table list with PK/CT status |
| **2.5** Streamlit Simulator page (mode selector, rate control, start/stop) | 1h | Control data generator via shared state/API |
| **2.6** Streamlit Monitor page (auto-refresh CDC metrics, change charts) | 1.5h | `st.fragment(run_every=2)` with live insert/update/delete counters |
| **2.7** Streamlit Demo Script page (walkthrough) | 30m | Step-by-step with st.expander |

**Exit Criteria:** Dashboard at public endpoint, all pages working, data generator controllable.

### Phase 3: Openflow + Integration (Day 3) — ~4 hours

**Objective:** Full end-to-end: SQL Server → Openflow → Snowflake, visible in dashboard.

| Task | Time | Deliverable |
|------|------|-------------|
| **3.1** Get SPCS service DNS name | 15m | `DESCRIBE SERVICE` → extract internal DNS |
| **3.2** Deploy Openflow SQL Server CDC connector | 30m | `nipyapi ci deploy_flow` from connector registry |
| **3.3** Configure connector (JDBC URL with SPCS DNS, creds, tables) | 30m | Parameters set via `nipyapi ci configure_inherited_params` |
| **3.4** Upload JDBC driver + verify + start flow | 30m | `nipyapi ci upload_asset` + `verify_config` + `start_flow` |
| **3.5** Validate data landing in Snowflake tables | 30m | `SELECT count(*) FROM poc_cdc.public.orders` shows rows |
| **3.6** Add Snowflake query to Monitor page (show synced row counts) | 30m | Dashboard shows both SQL Server counts and Snowflake counts |
| **3.7** README + SE setup guide | 45m | Step-by-step for any SE to deploy from scratch |
| **3.8** Dry run | 30m | Walk through full demo script |

**Exit Criteria:** Data flowing end-to-end, dashboard shows it, SE can replicate.

---

## 5. Openflow Connector Deployment (Applied to SPCS)

| Step | Action | Notes |
|------|--------|-------|
| 1 | Get service DNS | `DESCRIBE SERVICE cdc_demo_service` → find `<service>.<hash>.svc.spcs.internal` |
| 2 | Deploy SQL Server CDC connector | `nipyapi ci deploy_flow --registry_client ConnectorFlowRegistryClient --bucket connectors --flow sqlserver` |
| 3 | Inspect parameters (dry run) | `nipyapi ci configure_inherited_params --process_group_id <id> --dry_run` |
| 4 | Configure source params | JDBC URL: `jdbc:sqlserver://<dns>:1433;databaseName=DemoDB`, user: `sa`, password from secret |
| 5 | Configure destination params | Snowflake DB, schema, role, warehouse |
| 6 | Upload JDBC driver | `nipyapi ci upload_asset --url https://...mssql-jdbc-12.x.jar --context_id <id>` |
| 7 | Set Object Identifier Resolution | `CASE_INSENSITIVE` (Snowflake-native, no quoting) |
| 8 | Verify controllers | `nipyapi ci verify_config --verify_processors=false` |
| 9 | Enable controllers | `nipyapi canvas schedule_all_controllers` |
| 10 | Verify processors | `nipyapi ci verify_config --verify_controllers=false` |
| 11 | Start flow | `nipyapi ci start_flow` |
| 12 | Validate | `nipyapi ci get_status` + `SELECT count(*) FROM poc_cdc.public.orders` |

**Key advantage:** No EAI needed. Openflow and SQL Server are both on SPCS — internal DNS resolves automatically.

---

## 6. Key Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Container image** | SQL Server 2022 | Confirmed linux/amd64; Azure SQL Edge amd64 uncertain |
| 2 | **Compute pool** | CPU_X64_S (3 vCPU, 13 GB) | Minimum viable; upgrade to CPU_X64_M if needed |
| 3 | **Architecture** | Single service, 2 containers | Share localhost networking, simplest deployment |
| 4 | **Dashboard** | Streamlit | All Python, Snowflake product, no build step |
| 5 | **Networking** | SPCS internal DNS | Zero EAI, zero config, Openflow connects directly |
| 6 | **Object ID Resolution** | CASE_INSENSITIVE | Snowflake-native uppercase, no quoting headaches |
| 7 | **Storage** | Block volume 10 GB | Persistent SQL Server data across restarts |
| 8 | **CDC method** | Change Tracking | Works on SQL Server 2022, Openflow supports natively |
| 9 | **Schema** | Customers/Products/Orders | Relatable e-commerce model |
| 10 | **SE distribution** | Git repo + snow CLI commands | Clone, run, demo |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **SQL Server 2022 image too large for SPCS** | Low | Medium | Image is ~1.5GB compressed; SPCS handles large images fine |
| **JDBC driver compatibility** | Medium | High | Pre-test upload before demo day; use matching driver version |
| **Compute pool credit burn** | Low | Low | Auto-suspend at 1 hour; SE suspends after demo |
| **SQL Server startup time** | Medium | Low | First boot ~30-60s; init.sql runs on startup; health check waits |
| **SPCS readiness probe for SQL Server** | Medium | Medium | SQL Server has no HTTP endpoint; use sidecar health check or skip probe, rely on startup logs |
| **pyodbc ODBC driver in container** | Low | Medium | Use Microsoft's official ODBC 17/18 driver in Dockerfile |
| **Change Tracking init timing** | Low | Low | init.sql enables CT after table creation; tested locally first |

---

## 8. What "Done" Looks Like — Thursday

### Must Have ✅

- [ ] Both images pushed to Snowflake registry (sqlserver, streamlit)
- [ ] `CREATE COMPUTE POOL` + `CREATE SERVICE` brings up both containers
- [ ] SQL Server healthy with DemoDB + Change Tracking enabled
- [ ] Data generator producing INSERTs/UPDATEs/DELETEs
- [ ] Streamlit dashboard accessible at public endpoint (4 pages)
- [ ] Openflow CDC connector deployed and syncing to Snowflake
- [ ] Dashboard shows live metrics + Snowflake row counts
- [ ] README with SE setup instructions (< 15 minutes to deploy)

### Nice to Have

- [ ] Screencast walkthrough
- [ ] One-click setup script (single SQL file)
- [ ] Latency gauge (SQL Server insert → Snowflake visible)

---

## 9. Timeline

```
Day 1 (5h)  │ Phase 1: Dockerfiles, local test, push to registry
Day 2 (6h)  │ Phase 2: SPCS deploy + Streamlit dashboard
Day 3 (4h)  │ Phase 3: Openflow connector + integration + docs
```

**Total: ~15 hours**

---

## 10. SE Setup Guide (What Goes in README)

```bash
# 1. Clone the repo
git clone <repo-url> && cd sql-server-openflow-poc

# 2. Set your Snowflake connection
snow connection test -c <your-connection>

# 3. Create infrastructure
snow sql -c <conn> -f setup/01-create-objects.sql    # DB, warehouse, image repo, compute pool, secrets
snow sql -c <conn> -f setup/02-create-service.sql     # Deploy service

# 4. Push images (one-time)
./scripts/push-images.sh <registry-url>

# 5. Wait for service to start (~2 min)
snow sql -c <conn> -q "DESCRIBE SERVICE cdc_demo_service"

# 6. Open dashboard
# URL from DESCRIBE SERVICE output → public endpoint

# 7. Deploy Openflow connector
# Follow steps in dashboard's "Demo Script" page

# 8. Cleanup when done
snow sql -c <conn> -f setup/99-cleanup.sql
```

---

## 11. File Structure

```
sql-server-openflow-poc/
├── README.md                    # SE setup guide
├── DEPLOYMENT-PLAN.md           # This document
├── docker-compose.yml           # Local testing only
├── setup/
│   ├── 01-create-objects.sql    # DB, warehouse, repo, pool, secrets
│   ├── 02-create-service.sql    # Service spec + CREATE SERVICE
│   └── 99-cleanup.sql           # DROP everything
├── containers/
│   ├── sqlserver/
│   │   ├── Dockerfile
│   │   └── init.sql             # DemoDB + Change Tracking + tables
│   └── streamlit/
│       ├── Dockerfile
│       ├── pyproject.toml
│       ├── Home.py              # Main Streamlit app
│       ├── db.py                # Database connection utility
│       ├── components.py        # Reusable UI components
│       ├── theme.py             # Snowflake dark theme
│       ├── pages/
│       │   ├── 1_Setup.py
│       │   ├── 2_Simulator.py   # Built-in data generator (Faker)
│       │   └── 3_Demo_Script.py
│       └── .streamlit/
│           └── config.toml      # Snowflake theme
├── scripts/
│   ├── push-images.sh           # Build + tag + push all images
│   └── test-local.sh            # docker-compose up wrapper
└── architecture.md              # Original architecture doc
```

---

## 12. Questions for Pablow

1. **Compute pool size:** CPU_X64_S (3 vCPU, 13 GB) enough, or go CPU_X64_M (6 vCPU, 28 GB) for safety?
2. **Target schema:** `POC_CDC.PUBLIC` for the Snowflake CDC destination?
3. **Git repo location:** Internal Snowflake GitHub? Or public for broader SE access?
4. **MSSQL_PID:** Developer edition fine, or need Express for licensing clarity?
5. **Dashboard auth:** Snowflake OAuth (default for SPCS public endpoints) is fine?

---

**Document Version:** 3.0 — SPCS Architecture  
**Owner:** Engineering  
**Approver:** Pablow (SE)