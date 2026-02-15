# Deploy SQL Server Container — Guided Walkthrough

This guide walks you through deploying the SQL Server CDC demo container step by step. Each step uses a `make` command and includes what to expect, how to verify success, and what to do if something goes wrong.

**Who this is for:** First-time users who want to understand each step before running the full `make all` pipeline.

---

## Before You Start

### Prerequisites Checklist

- [ ] **Snowflake CLI** installed and authenticated (`snow connection test -c <your-connection>`)
- [ ] **Docker Desktop** installed and running
- [ ] You know your **Snowflake connection name** (run `snow connection list` to see options)

### Set Your Connection

Every `make` command uses `SNOW_CONN` to know which Snowflake account to target. Set it once:

```bash
export SNOW_CONN=your-connection-name
```

Or pass it per-command: `make setup SNOW_CONN=your-connection-name`

---

## Step 1: Create Snowflake Objects

**What this does:** Creates the database, warehouse, image repository, compute pool, and SA password secret in your Snowflake account. All use `IF NOT EXISTS` so it's safe to re-run.

```bash
make setup
```

**You should see:**
```
🏗️  Creating Snowflake objects...
🔐 Creating SA password secret...
✅ Snowflake objects ready.
```

**Verify it worked:**
```bash
snow sql -c $SNOW_CONN -q "SHOW COMPUTE POOLS LIKE 'CDC_DEMO%';"
snow sql -c $SNOW_CONN -q "SHOW IMAGE REPOSITORIES IN CDC_DEMO.PUBLIC;"
```

You should see `CDC_DEMO_POOL` (state: IDLE or ACTIVE) and the `IMAGES` repository.

**If something fails:**
- `Insufficient privileges` → You need ACCOUNTADMIN or a role with CREATE DATABASE, CREATE COMPUTE POOL grants
- `Object already exists` → That's fine, the command is idempotent

---

## Step 2: Login to Snowflake Registry

**What this does:** Authenticates your local Docker to Snowflake's container registry so you can push images.

```bash
make login
```

**You should see:**
```
🔑 Logging into Snowflake registry...
✅ Docker authenticated.
```

**If something fails:**
- `Cannot connect to the Docker daemon` → Start Docker Desktop
- `401 Unauthorized` → Run `snow connection test -c $SNOW_CONN` to verify your credentials

---

## Step 3: Build the SQL Server Image

**What this does:** Builds the SQL Server 2022 container image with the init script that creates DemoDB and enables Change Tracking. Builds for `linux/amd64` (required by SPCS) even if you're on an Apple Silicon Mac.

```bash
make build-sqlserver
```

**You should see:**
```
🔨 Building SQL Server image...
```

Followed by Docker build output. The base image (`mcr.microsoft.com/mssql/server:2022-latest`) is ~1.5GB so the first build takes a few minutes.

**Verify it worked:**
```bash
docker images | grep sqlserver
```

You should see `sqlserver:latest` in the list.

**If something fails:**
- `no matching manifest for linux/amd64` → Enable "Use Rosetta for x86_64/amd64 emulation" in Docker Desktop settings
- Build hangs → Ensure Docker has at least 4GB memory allocated (Docker Desktop → Settings → Resources)

---

## Step 4: Build the Other Images

**What this does:** Builds the data generator and Streamlit dashboard images.

```bash
make build-datagen
make build-streamlit
```

Or build everything at once:

```bash
make build
```

**Verify:**
```bash
docker images | grep -E "sqlserver|datagen|streamlit"
```

All 3 images should appear.

---

## Step 5: Push Images to Snowflake

**What this does:** Tags each image with your Snowflake registry URL and pushes them. This is what makes the images available to SPCS.

```bash
make push
```

**You should see:**
```
📤 Pushing SQL Server image...
📤 Pushing Data Generator image...
📤 Pushing Streamlit Dashboard image...
✅ All images pushed to Snowflake registry.
```

First push takes a few minutes per image. Subsequent pushes are faster (Docker layer caching).

**Verify it worked:**
```bash
snow spcs image-repository list-images CDC_DEMO.PUBLIC.IMAGES -c $SNOW_CONN
```

You should see all 3 images listed.

**If something fails:**
- `REGISTRY_NOT_SET` → The image repository wasn't found. Re-run `make setup`
- `denied: access forbidden` → Check that your role has WRITE access to the image repository

---

## Step 6: Test Locally First (Optional but Recommended)

**What this does:** Runs all 3 containers on your machine with Docker Compose before deploying to SPCS. Great for catching issues early.

```bash
make local-up
```

**You should see:**
```
🐳 Starting local environment...
⏳ Waiting for SQL Server to be ready...
   Waiting... (1/30)
   Waiting... (2/30)
✅ SQL Server ready!

🎯 Services:
   Streamlit Dashboard: http://localhost:8501
   Adminer (DB viewer): http://localhost:8080
   SQL Server:          localhost:1433
```

Open http://localhost:8501 in your browser. You should see the dashboard with the Setup page showing:
- ✅ SQL Server connected
- ✅ DemoDB exists
- ✅ Change Tracking enabled on all 3 tables

**When you're done testing:**
```bash
make local-down
```

---

## Step 7: Deploy to SPCS

**What this does:** Creates the multi-container service on Snowpark Container Services. All 3 containers (SQL Server, data generator, Streamlit) run in a single service and communicate via localhost.

```bash
make deploy
```

**You should see:**
```
🚀 Deploying service to SPCS...
✅ Service created. Containers starting...
```

The service takes 1-3 minutes to fully start. Monitor progress:

```bash
make status
```

Look for `status: READY` on the service instances. If it shows `PENDING`, wait and check again.

**Check container logs if something seems stuck:**
```bash
make logs CONTAINER=sqlserver
make logs CONTAINER=datagen
make logs CONTAINER=streamlit
```

---

## Step 8: Get the Dashboard URL

**What this does:** Retrieves the public endpoint URL for the Streamlit dashboard running on SPCS.

```bash
make endpoint
```

**You should see:**
```
🌐 Dashboard endpoint:
   dashboard: https://<long-snowflake-url>
```

Open that URL in your browser. You'll authenticate with your Snowflake credentials, then see the same dashboard — now running entirely inside Snowflake.

---

## Step 9: Verify End-to-End

With the dashboard open, check:

1. **Setup page** → All green checks (SQL Server connected, Change Tracking enabled)
2. **Simulator page** → Start the data generator in "steady" mode
3. **Monitor page** → Watch insert/update/delete counters climbing in real-time

The SQL Server is now producing CDC data. You're ready to connect the Openflow SQL Server CDC connector (see `skills/DEPLOY-OPENFLOW-CONNECTOR.md`).

---

## Cleanup

When you're done, tear everything down:

```bash
make clean
```

This drops the service, compute pool, secrets, image repository, warehouse, and database. **This is destructive and cannot be undone.**

---

## Quick Reference

| What you want to do | Command |
|---------------------|---------|
| Full deployment from scratch | `make all` |
| Just create Snowflake objects | `make setup` |
| Build all images | `make build` |
| Push all images | `make push` |
| Deploy to SPCS | `make deploy` |
| Check service health | `make status` |
| Get dashboard URL | `make endpoint` |
| View SQL Server logs | `make logs CONTAINER=sqlserver` |
| View datagen logs | `make logs CONTAINER=datagen` |
| Test locally first | `make local-up` |
| Stop local test | `make local-down` |
| Nuke everything | `make clean` |

---

## Next Steps

Once your SQL Server container is running and producing data:

1. **Deploy the Openflow connector** → Follow `skills/DEPLOY-OPENFLOW-CONNECTOR.md` for the full nipyapi walkthrough
2. **Verify CDC flow** → Data should appear in `CDC_DEMO.PUBLIC.Customers/Products/Orders` within seconds
3. **Demo to customer** → Use the Dashboard's Demo Script page for a guided walkthrough
