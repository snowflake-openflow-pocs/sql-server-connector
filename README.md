# SQL Server Openflow POC

A self-contained SQL Server CDC demo environment running inside Snowflake SPCS. Deploy a SQL Server 2022 instance with Change Tracking enabled, a data generator, and a Streamlit dashboard to test the Openflow SQL Server connector.

## Quick Start

### Prerequisites
- Snowflake account with SPCS enabled
- `snow` CLI installed and configured
- Docker (for local testing only)

### Deploy to SPCS

1. **Clone the repo**
   ```bash
   git clone <repo-url> && cd sql-server-openflow-poc
   ```

2. **Set your Snowflake connection**
   ```bash
   snow connection test -c <your-connection>
   ```

3. **Create infrastructure**
   ```bash
   snow sql -c <conn> -f setup/01-create-objects.sql    # DB, warehouse, image repo, compute pool, secrets
   snow sql -c <conn> -f setup/02-create-service.sql     # Deploy service
   ```

4. **Push images (one-time)**
   ```bash
   ./scripts/push-images.sh <registry-url>
   ```

5. **Wait for service to start (~2 min)**
   ```bash
   snow sql -c <conn> -q "DESCRIBE SERVICE cdc_demo_service"
   ```

6. **Open dashboard**
   - Get the public endpoint URL from `DESCRIBE SERVICE` output
   - Open in browser

7. **Deploy Openflow connector**
   - Follow steps in dashboard's "Demo Script" page

8. **Cleanup when done**
   ```bash
   snow sql -c <conn> -f setup/99-cleanup.sql
   ```

## Local Testing (Docker Compose)

For development or local testing without SPCS:

```bash
docker-compose up --build
```

- SQL Server: `localhost:1433`
- Streamlit Dashboard: `localhost:8501`
- Adminer (DB GUI): `localhost:8080`

## Architecture

- **SQL Server**: Containerized SQL Server 2022 with DemoDB (Customers, Products, Orders) and Change Tracking enabled
- **Data Generator**: Python script using Faker to simulate INSERT/UPDATE/DELETE operations
- **Streamlit Dashboard**: Multi-page app for setup verification, simulator control, monitoring, and demo walkthrough

See [architecture.md](architecture.md) and [DEPLOYMENT-PLAN.md](DEPLOYMENT-PLAN.md) for details.

## Troubleshooting

- **Service not starting**: Check `SYSTEM$GET_SERVICE_LOGS('cdc_demo_service')`
- **No data in Snowflake**: Verify Openflow connector configuration and JDBC URL
- **Dashboard not loading**: Ensure public endpoint is accessible and OAuth is configured

## License

Internal Snowflake POC