# SQL Server CDC Connector Deployment Runbook - SPCS

This runbook provides step-by-step instructions for deploying the Openflow SQL Server CDC connector on SPCS, **starting from scratch** — including runtime creation. The scenario:

- SQL Server 2022 running as an SPCS service in the same Snowflake account
- JDBC URL: `jdbc:sqlserver://cdc-demo-service.<hash>.svc.spcs.internal:1433;databaseName=DemoDB;encrypt=false`
- Database has Change Tracking enabled on tables: Customers, Products, Orders
- SA credentials stored in a Snowflake secret
- Destination database: CDC_DEMO
- Primary tool: nipyapi CLI (for NiFi operations), Snowflake UI (for infrastructure)

**Important Notes:**
- Use exact commands as shown (substitute `<profile>` with your nipyapi profile name)
- Commands must be executed in order - do not skip steps
- All nipyapi commands include `--profile <profile>` placeholder

---

## 0. Openflow Infrastructure Setup

### 0.1 Verify Openflow Data Plane

```bash
# Check if Openflow is deployed on the account
snow sql -c <CONNECTION> -q "SHOW OPENFLOW DATA PLANE INTEGRATIONS;" --format json

# Extract DATA_PLANE_ID and EVENT_TABLE
snow sql -c <CONNECTION> -q "DESCRIBE INTEGRATION <data_plane_name>;" --format json
```

If no data plane integration exists, Openflow needs to be enabled on the account first (contact your account team).

### 0.2 Create Runtime

> ⚠️ **Runtime creation is the ONE step that requires the Openflow Control Plane UI** — Snowflake does not expose a CLI or SQL command for this. Everything else in this runbook is fully programmatic.

1. Open the Openflow Control Plane URL (found in the data plane integration details)
2. Create Runtime:
   - **Name:** `SQL_SERVER_CONNECTOR_DEMO`
   - **Size:** Medium (minimum for CDC connectors per Snowflake docs)
   - **Nodes:** Single-node
3. Wait for status **RUNNING** (2-5 minutes)

### 0.3 Discover Runtime Programmatically

Once the runtime exists, everything switches to CLI:

```bash
# Find all runtimes
snow sql -c <CONNECTION> -q "SHOW OPENFLOW RUNTIME INTEGRATIONS;" --format json

# For each runtime, extract from OAUTH_REDIRECT_URI:
# - Host: the domain before the runtime path
# - Runtime key: the path segment before /login/oauth2/...
# - NiFi API URL: https://{host}/{runtime_key}/nifi-api
```

### 0.4 Discover Runtime Role (SPCS)

```bash
# Find the runtime role — look for roles with USAGE grant on the runtime integration
snow sql -c <CONNECTION> -q "SHOW GRANTS ON INTEGRATION <runtime_integration>;" --format json

# Verify the role has correct grants
snow sql -c <CONNECTION> -q "SHOW GRANTS TO ROLE <runtime_role>;" --format json
```

### 0.5 Set Up nipyapi Profile

```bash
# Install nipyapi (v1.2.0+ required for --profile and bulletins)
pip install 'nipyapi[cli]>=1.5.0'

# Create profile using Snowflake PAT from snow CLI config
# Profile connects to: https://{host}/{runtime_key}/nifi-api
# Auth: PAT extracted from ~/.snowflake/connections.toml
```

Write profile to `~/.nipyapi/profiles.yml`. Verify connectivity:

```bash
nipyapi --profile <profile> system get_nifi_version_info
```

### 0.6 Network Access — NOT Needed

Since both SQL Server and Openflow run on SPCS in the same Snowflake account, they communicate via **internal SPCS DNS**. No External Access Integration (EAI) is required.

The JDBC URL uses the internal service DNS:
```
jdbc:sqlserver://cdc-demo-service.<hash>.svc.spcs.internal:1433;databaseName=DemoDB;encrypt=false
```

To find the `<hash>` for your schema:
```sql
SELECT SYSTEM$GET_SERVICE_DNS_DOMAIN('<database>.<schema>');
```

> **Note:** If the SQL Server were external to Snowflake, you would need to create a Network Rule + EAI and attach it to the runtime via the Control Plane UI.

---

## 1. Pre-flight Checks

Verify the environment before starting deployment:

```bash
# Verify nipyapi profile is configured and runtime is accessible
nipyapi --profile <profile> system get_nifi_version_info

# List existing flows to confirm canvas is accessible
nipyapi --profile <profile> ci list_flows

# Check for existing SQL Server CDC deployments
nipyapi --profile <profile> ci list_flows | jq -r '.process_groups[].name' | grep -i sqlserver || echo "No existing SQL Server flows found"
```

Expected output: NiFi version info and flow list (may be empty).

## 2. Network Setup

Since both the SQL Server service and Openflow runtime are running on SPCS in the same Snowflake account, **NO External Access Integration (EAI) is needed**. 

**Why:** SPCS services communicate internally within the same account using internal DNS and networking. The JDBC URL uses the internal service name `cdc-demo-service.<hash>.svc.spcs.internal`, which is directly accessible from the Openflow runtime pod without requiring external network rules.

**Verification:** If network tests were desired, the internal host would resolve and connect without EAI configuration.

## 3. Deploy SQL Server CDC Connector from Registry

Deploy the connector flow from the Snowflake Connector Registry:

```bash
# List available connectors to confirm sqlserver is available
nipyapi --profile <profile> ci list_registry_flows --registry_client ConnectorFlowRegistryClient --bucket connectors | jq -r '.flows[] | select(.name == "sqlserver") | .name'

# Deploy the SQL Server CDC connector
nipyapi --profile <profile> ci deploy_flow --registry_client ConnectorFlowRegistryClient --bucket connectors --flow sqlserver
```

Expected output: Deployment success with process_group_id. Record the `<pg-id>` for subsequent commands.

## 4. Parameter Inspection and Configuration

Configure parameters in the correct order. First, inspect the parameter context hierarchy:

```bash
# Get the process group ID from the deployment output
PG_ID="<pg-id>"

# Inspect parameter contexts bound to the process group
nipyapi --profile <profile> parameters get_parameter_context_hierarchy "$PG_ID" true false
```

This shows the hierarchy: Ingestion Parameters (bound to PG) inherits from Source Parameters and Destination Parameters.

Configure parameters using inheritance-aware commands:

```bash
# Configure Source Parameters (SQL Server connection)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "SQL Server Connection URL": "jdbc:sqlserver://cdc-demo-service.<hash>.svc.spcs.internal:1433;databaseName=DemoDB;encrypt=false",
  "SQL Server Username": "sa",
  "SQL Server Password": "<REDACTED>"
}' --dry_run

# Execute the source parameter configuration (remove --dry_run)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "SQL Server Connection URL": "jdbc:sqlserver://cdc-demo-service.<hash>.svc.spcs.internal:1433;databaseName=DemoDB;encrypt=false",
  "SQL Server Username": "sa",
  "SQL Server Password": "<REDACTED>"
}'

# Configure Destination Parameters (Snowflake)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "Destination Database": "CDC_DEMO",
  "Snowflake Authentication Strategy": "SNOWFLAKE_SESSION_TOKEN",
  "Snowflake Role": "<your-role-with-privileges>",
  "Snowflake Warehouse": "<your-warehouse>"
}' --dry_run

# Execute the destination parameter configuration (remove --dry_run)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "Destination Database": "CDC_DEMO",
  "Snowflake Authentication Strategy": "SNOWFLAKE_SESSION_TOKEN",
  "Snowflake Role": "<your-role-with-privileges>",
  "Snowflake Warehouse": "<your-warehouse>"
}'

# Configure Ingestion Parameters (tables and settings)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "Included Table Names": "Customers,Products,Orders",
  "Object Identifier Resolution": "CASE_INSENSITIVE"
}' --dry_run

# Execute the ingestion parameter configuration (remove --dry_run)
nipyapi --profile <profile> ci configure_inherited_params --process_group_id "$PG_ID" --parameters '{
  "Included Table Names": "Customers,Products,Orders",
  "Object Identifier Resolution": "CASE_INSENSITIVE"
}'
```

**Parameter Notes:**
- `Object Identifier Resolution`: Set to `CASE_INSENSITIVE` for Snowflake compatibility (allows unquoted table names like `CUSTOMERS` instead of `"customers"`)
- Sensitive values like passwords are marked `<REDACTED>` - replace with actual values
- Collect Snowflake Role and Warehouse from user if not specified

## 5. JDBC Driver Upload

Upload the Microsoft SQL Server JDBC driver:

```bash
# Upload the driver JAR to the Source Parameters context
nipyapi --profile <profile> ci upload_asset --url "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.10.0.jre11/mssql-jdbc-12.10.0.jre11.jar" --context_id "<source-context-id>" --param_name "SQL Server JDBC Driver"
```

**Note:** Replace `<source-context-id>` with the actual Source Parameters context ID from the hierarchy inspection in step 4.

## 6. Object Identifier Resolution Choice

Already configured as `CASE_INSENSITIVE` in step 4.

**Recommendation:** `CASE_INSENSITIVE` is preferred for Snowflake destinations as it:
- Creates uppercase schema/table names (e.g., `CDC_DEMO.CUSTOMERS`)
- Allows unquoted SQL queries
- Matches Snowflake's default naming conventions

**Warning:** This setting cannot be changed after initial replication starts without a full reset.

## 7. Controller Service Verification and Enablement

Verify controller configuration before enabling:

```bash
# Verify controllers (should pass after parameter configuration)
nipyapi --profile <profile> ci verify_config --process_group_id "$PG_ID" --verify_processors false
```

Expected: No failures.

Enable controller services:

```bash
# Enable all controllers in the process group
nipyapi --profile <profile> canvas schedule_all_controllers "$PG_ID" true
```

Check for enablement success and any bulletins:

```bash
# Check controller states
nipyapi --profile <profile> ci get_status --process_group_id "$PG_ID"

# Check for bulletins if errors > 0
nipyapi --profile <profile> bulletins get_bulletin_board --pg_id "$PG_ID"
```

## 8. Processor Verification

Verify processor configuration after controllers are enabled:

```bash
# Verify processors (controllers must be enabled first)
nipyapi --profile <profile> ci verify_config --process_group_id "$PG_ID" --verify_controllers false
```

Expected: No failures.

## 9. Starting the Flow

Start the flow:

```bash
# Start the entire process group
nipyapi --profile <profile> ci start_flow --process_group_id "$PG_ID"
```

Verify the flow is running:

```bash
# Check status
nipyapi --profile <profile> ci get_status --process_group_id "$PG_ID"
```

Expected: `running_processors > 0`, `bulletin_errors = 0`.

## 10. Validation

Validate data is flowing:

### Check Flow Status

```bash
nipyapi --profile <profile> ci get_status --process_group_id "$PG_ID"
```

### Check Bulletins

```bash
nipyapi --profile <profile> bulletins get_bulletin_board --pg_id "$PG_ID"
```

### Validate Target Objects in Snowflake

Query Snowflake to confirm schemas and tables were created:

```sql
-- Check schema exists
SHOW SCHEMAS IN DATABASE CDC_DEMO;

-- Check tables exist
SHOW TABLES IN SCHEMA CDC_DEMO.PUBLIC;  -- Adjust schema name as needed

-- Validate rows are appearing (run multiple times to see increasing counts)
SELECT COUNT(*) FROM CDC_DEMO.PUBLIC.CUSTOMERS;
SELECT COUNT(*) FROM CDC_DEMO.PUBLIC.PRODUCTS;
SELECT COUNT(*) FROM CDC_DEMO.PUBLIC.ORDERS;
```

### Monitor CDC Table State

Check replication status for each table:

```bash
# Find the TableStateService controller ID
nipyapi --profile <profile> canvas list_all_controllers "$PG_ID" | jq '.[] | select(.component.type | contains("TableState")) | .id'

# Get table state
nipyapi --profile <profile> canvas get_controller_state "<table-state-service-id>"
```

Look for status values: `NEW` → `SNAPSHOT_REPLICATION` → `INCREMENTAL_REPLICATION`

## 11. Troubleshooting Common Issues

### Controllers Fail to Enable

**Symptom:** Controllers show `ENABLING` then fail.

**Check:** Bulletins for database connection errors.

**Fix:** Verify JDBC URL, credentials, and driver upload.

### Processors Show Invalid

**Symptom:** `invalid_processors > 0`

**Check:** Re-run processor verification and check results.

**Fix:** Ensure controllers are enabled and parameters are correct.

### No Data in Snowflake

**Symptom:** Tables created but no rows.

**Check:** CDC table state shows `FAILED` or stuck in `NEW`.

**Fix:** Check SQL Server Change Tracking is enabled on tables.

### Connection Errors

**Symptom:** `UnknownHostException` or timeout.

**Check:** Network connectivity (though unlikely on SPCS internal).

**Fix:** Verify JDBC URL format and internal DNS resolution.

### Authentication Failures

**Symptom:** Bulletin errors about login.

**Fix:** Verify SA credentials in Snowflake secret are correct.

### Case Sensitivity Issues

**Symptom:** Tables not found in queries.

**Fix:** If `Object Identifier Resolution` was set to `CASE_SENSITIVE`, use quoted identifiers: `SELECT * FROM "cdc_demo"."customers"`

## 12. Cleanup/Teardown Steps

To remove the connector:

```bash
# Stop the flow
nipyapi --profile <profile> ci stop_flow --process_group_id "$PG_ID" --disable_controllers

# Delete the process group (safe delete preserves parameter contexts)
nipyapi --profile <profile> ci cleanup --process_group_id "$PG_ID"

# Optionally delete parameter contexts if not shared
# First inspect what's bound
nipyapi --profile <profile> parameters list_all_parameter_contexts | jq '.[] | select(.component.name | contains("SQL Server")) | {name: .component.name, bound: .component.bound_process_groups | length}'

# Delete orphaned contexts (bound_process_groups = 0)
# Note: Requires Python API for deletion
```

**Warning:** Do not delete parameter contexts if they might be used by other flows.

---

**Completion Notes:**
- Monitor initial snapshot completion (may take time for large tables)
- Change Tracking must be enabled on source tables
- Ensure Snowflake role has CREATE privileges on CDC_DEMO database
- Test incremental changes after initial load completes