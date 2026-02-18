"""
Page 1: Setup — Multi-Database Connector Readiness
Connects at the SQL Server instance level, discovers all databases,
validates Openflow SQL Server Connector prerequisites, and generates
connector configuration parameters.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import streamlit as st
import pyodbc
import pandas as pd
from components import (
    page_setup, page_header, section_header,
    metric_row, code_block, data_table,
    stat_card_row, donut_chart, gauge_chart, stacked_bar_chart,
    CHART_COLORS,
)

page_setup("Setup — Connector Readiness")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def test_connection(host: str, port: int, user: str, password: str):
    """Connect to the SQL Server instance (master). Returns (conn, error)."""
    try:
        conn_str = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={host},{port};"
            f"Database=master;"
            f"UID={user};"
            f"PWD={password};"
            f"TrustServerCertificate=yes;"
        )
        conn = pyodbc.connect(conn_str, timeout=10)
        return conn, None
    except Exception as e:
        return None, str(e)


def discover_databases(conn):
    """Return list of user databases with Change Tracking status."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            d.name,
            CASE WHEN ct.database_id IS NOT NULL THEN 1 ELSE 0 END AS ct_enabled,
            ct.retention_period,
            ct.retention_period_units_desc,
            ct.is_auto_cleanup_on
        FROM sys.databases d
        LEFT JOIN sys.change_tracking_databases ct
            ON d.database_id = ct.database_id
        WHERE d.database_id > 4
          AND d.state = 0
        ORDER BY d.name
    """)
    rows = cursor.fetchall()
    return [
        {
            "Database": r.name,
            "Change Tracking": bool(r.ct_enabled),
            "Retention": (
                f"{r.retention_period} {(r.retention_period_units_desc or '').capitalize()}"
                if r.ct_enabled else "N/A"
            ),
            "Auto-Cleanup": bool(r.is_auto_cleanup_on) if r.ct_enabled else False,
        }
        for r in rows
    ]


def check_tables_for_db(conn, db_name: str):
    """Switch to db_name and return per-table readiness list."""
    cursor = conn.cursor()
    cursor.execute(f"USE [{db_name}]")
    cursor.execute("""
        SELECT
            t.name                          AS table_name,
            SCHEMA_NAME(t.schema_id)        AS schema_name,
            CASE WHEN pk.object_id IS NOT NULL THEN 1 ELSE 0 END AS has_pk,
            CASE WHEN ct.object_id IS NOT NULL THEN 1 ELSE 0 END AS ct_enabled,
            HAS_PERMS_BY_NAME(
                QUOTENAME(SCHEMA_NAME(t.schema_id)) + '.' + QUOTENAME(t.name),
                'OBJECT', 'SELECT'
            ) AS has_select
        FROM sys.tables t
        LEFT JOIN sys.change_tracking_tables ct
            ON t.object_id = ct.object_id
        LEFT JOIN (
            SELECT DISTINCT parent_object_id AS object_id
            FROM sys.key_constraints WHERE type = 'PK'
        ) pk ON t.object_id = pk.object_id
        WHERE t.is_ms_shipped = 0
        ORDER BY SCHEMA_NAME(t.schema_id), t.name
    """)
    tables = cursor.fetchall()

    results = []
    for row in tables:
        fqn = f"[{row.schema_name}].[{row.table_name}]"
        cursor.execute(f"SELECT COUNT(*) FROM {fqn}")
        count = cursor.fetchone()[0]
        results.append({
            "Schema": row.schema_name,
            "Table": row.table_name,
            "Rows": count,
            "Primary Key": bool(row.has_pk),
            "Change Tracking": bool(row.ct_enabled),
            "SELECT Permission": bool(row.has_select),
        })
    return results


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

page_header(
    "Setup — Connector Readiness",
    "Instance-level prerequisite check for the Openflow SQL Server Connector  "
    "|  Supports multi-database discovery",
)

# ── Section 1: Instance Connection ─────────────────────────────────────────

st.subheader("1. Instance Connection")

for key, env, default in [
    ("setup_host", "SQL_HOST", "sqlserver"),
    ("setup_port", "SQL_PORT", "1433"),
    ("setup_user", "SQL_USER", "sa"),
    ("setup_password", "SQL_PASSWORD", "YourStrongPassw0rd!"),
]:
    if key not in st.session_state:
        st.session_state[key] = os.getenv(env, default)

c1, c2 = st.columns([3, 1])
with c1:
    host = st.text_input("Host", key="setup_host")
    user = st.text_input("Username", key="setup_user")
with c2:
    port = st.text_input("Port", key="setup_port")
    password = st.text_input("Password", key="setup_password", type="password")

if st.button("Test Connection", type="primary", use_container_width=True):
    with st.spinner("Connecting to instance..."):
        conn, err = test_connection(host, int(port), user, password)
    if conn:
        st.session_state["setup_conn"] = conn
        st.session_state["setup_connected"] = True
        ver = conn.cursor().execute("SELECT @@VERSION").fetchone()[0]
        st.session_state["setup_version"] = ver.split("\n")[0]
        st.session_state.pop("setup_db_results", None)
        st.session_state.pop("setup_table_results", None)
        st.session_state.pop("setup_tables_scanned", None)
        st.success("Connected to SQL Server instance")
    else:
        st.session_state["setup_connected"] = False
        st.error(f"Connection failed: {err}")

if st.session_state.get("setup_connected"):
    st.caption(st.session_state.get("setup_version", ""))
    jdbc_url = f"jdbc:sqlserver://{host}:{port};encrypt=false"
    code_block(jdbc_url, language=None)

# ── Gate ───────────────────────────────────────────────────────────────────

if not st.session_state.get("setup_connected"):
    st.info("Connect to SQL Server to begin prerequisite checks.")
    st.stop()

conn = st.session_state["setup_conn"]

# ── Section 2: Database Discovery ──────────────────────────────────────────

section_header("2. Database Discovery")

if "setup_db_results" not in st.session_state:
    st.session_state["setup_db_results"] = discover_databases(conn)

db_results = st.session_state["setup_db_results"]

if not db_results:
    st.warning("No user databases found on this instance.")
    st.stop()

ct_count = sum(1 for d in db_results if d["Change Tracking"])
total_dbs = len(db_results)
ct_disabled = total_dbs - ct_count

# Stat cards + donut side by side
chart_col, table_col = st.columns([1, 2])

with chart_col:
    stat_card_row([
        {"label": "Databases", "value": total_dbs, "icon": "🗄️"},
        {"label": "CT Enabled", "value": ct_count, "icon": "✅"},
        {"label": "CT Disabled", "value": ct_disabled, "icon": "⚠️"},
    ])
    st.markdown("")  # spacing
    donut_chart(
        labels=["CT Enabled", "CT Disabled"],
        values=[ct_count, ct_disabled],
        title="Change Tracking Status",
        colors=[CHART_COLORS["success"], CHART_COLORS["warning"]],
        height=260,
    )

with table_col:
    db_df = pd.DataFrame(db_results)
    display_db_df = db_df.copy()
    display_db_df["Change Tracking"] = display_db_df["Change Tracking"].map(
        {True: "Enabled", False: "Disabled"}
    )
    display_db_df["Auto-Cleanup"] = db_df["Auto-Cleanup"].map({True: "On", False: "Off"})
    data_table(display_db_df)

no_ct = [d["Database"] for d in db_results if not d["Change Tracking"]]
if no_ct:
    with st.expander(f"Enable Change Tracking on {len(no_ct)} database(s)"):
        sql_lines = "\n\n".join(
            f"ALTER DATABASE [{db}]\nSET CHANGE_TRACKING = ON\n"
            f"(CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);"
            for db in no_ct
        )
        code_block(sql_lines, "sql")

# ── Section 3: Table Readiness ─────────────────────────────────────────────

section_header("3. Table Readiness")

ct_databases = [d["Database"] for d in db_results if d["Change Tracking"]]

if not ct_databases:
    st.warning("No databases with Change Tracking enabled. Enable CT first (see above).")
    st.stop()

if st.button("Scan Tables", type="primary", use_container_width=True):
    table_results = {}
    progress = st.progress(0, text="Scanning databases...")
    for i, db_name in enumerate(ct_databases):
        progress.progress(
            (i + 1) / len(ct_databases),
            text=f"Scanning {db_name}... ({i + 1}/{len(ct_databases)})",
        )
        try:
            table_results[db_name] = check_tables_for_db(conn, db_name)
        except Exception as e:
            table_results[db_name] = []
            st.warning(f"Could not scan {db_name}: {e}")
    progress.empty()
    st.session_state["setup_table_results"] = table_results
    st.session_state["setup_tables_scanned"] = True
    conn.cursor().execute("USE [master]")

if not st.session_state.get("setup_tables_scanned"):
    st.info("Click **Scan Tables** to check table prerequisites across all CT-enabled databases.")
    st.stop()

table_results = st.session_state["setup_table_results"]

# Aggregate summary
agg_rows = []
for db_name, tables in table_results.items():
    total = len(tables)
    with_pk = sum(1 for t in tables if t["Primary Key"])
    with_ct = sum(1 for t in tables if t["Change Tracking"])
    with_sel = sum(1 for t in tables if t["SELECT Permission"])
    ready = sum(
        1 for t in tables
        if t["Primary Key"] and t["Change Tracking"] and t["SELECT Permission"]
    )
    agg_rows.append({
        "Database": db_name,
        "Tables": total,
        "With PK": with_pk,
        "With CT": with_ct,
        "With SELECT": with_sel,
        "Ready": ready,
        "Ready_Label": f"{ready}/{total}",
    })

# Overall readiness
total_scanned_all = sum(r["Tables"] for r in agg_rows)
total_ready_all = sum(r["Ready"] for r in agg_rows)
readiness_pct = round(total_ready_all / total_scanned_all * 100) if total_scanned_all else 0

# Gauge + stacked bar + table
gauge_col, bar_col = st.columns([1, 2])

with gauge_col:
    gauge_chart(
        value=readiness_pct,
        title="Overall Readiness",
        max_val=100,
        suffix="%",
        height=240,
    )
    stat_card_row([
        {"label": "Ready", "value": total_ready_all, "icon": "✅"},
        {"label": "Total Tables", "value": total_scanned_all, "icon": "📋"},
    ])

with bar_col:
    db_names_bar = [r["Database"] for r in agg_rows]
    ready_vals = [r["Ready"] for r in agg_rows]
    not_ready_vals = [r["Tables"] - r["Ready"] for r in agg_rows]
    stacked_bar_chart(
        categories=db_names_bar,
        segments={
            "Ready": ready_vals,
            "Not Ready": not_ready_vals,
        },
        title="Per-Database Readiness",
        colors={"Ready": CHART_COLORS["success"], "Not Ready": CHART_COLORS["error"]},
        height=280,
    )

# Summary table
display_agg = pd.DataFrame(agg_rows).drop(columns=["Ready"])
display_agg = display_agg.rename(columns={"Ready_Label": "Ready"})
data_table(display_agg)

# Per-database drill-down
selected_db = st.selectbox(
    "Database detail",
    options=list(table_results.keys()),
    index=0,
)

if selected_db and table_results.get(selected_db):
    detail_df = pd.DataFrame(table_results[selected_db])
    disp = detail_df.copy()
    for col in ["Primary Key", "Change Tracking", "SELECT Permission"]:
        disp[col] = disp[col].map({True: "Pass", False: "Fail"})

    data_table(
        disp,
        column_config={"Rows": st.column_config.NumberColumn(format="%d")},
    )

    failing = [
        t for t in table_results[selected_db]
        if not t["Primary Key"] or not t["Change Tracking"]
    ]
    if failing:
        with st.expander(f"Fix {len(failing)} table(s) in {selected_db}"):
            for t in failing:
                fqn = f"[{t['Schema']}].[{t['Table']}]"
                if not t["Change Tracking"]:
                    code_block(
                        f"USE [{selected_db}];\n"
                        f"ALTER TABLE {fqn}\n"
                        "ENABLE CHANGE_TRACKING\n"
                        "WITH (TRACK_COLUMNS_UPDATED = ON);",
                        "sql",
                    )
                if not t["Primary Key"]:
                    st.markdown(
                        f"`{selected_db}.{t['Schema']}.{t['Table']}` — "
                        "no primary key. Add one before Openflow can replicate this table."
                    )

# ── Section 4: Connector Configuration ─────────────────────────────────────

section_header("4. Connector Configuration")

ready_tables = []
for db_name, tables in table_results.items():
    for t in tables:
        if t["Primary Key"] and t["Change Tracking"] and t["SELECT Permission"]:
            ready_tables.append(
                {"db": db_name, "schema": t["Schema"], "table": t["Table"]}
            )

ready_count = len(ready_tables)

if ready_count == 0:
    st.warning("No tables are fully ready for replication yet.")
    st.stop()

if ready_count == total_scanned_all:
    st.success(f"All {ready_count} tables across {len(table_results)} databases are ready.")
else:
    st.warning(
        f"{ready_count}/{total_scanned_all} tables ready. "
        f"Fix the remaining tables above before deploying."
    )

# ── Snowflake Destination Settings ───────────────────────────────────────

st.markdown("**Snowflake Destination Settings**")

dest_col1, dest_col2 = st.columns(2)
with dest_col1:
    if "setup_dest_db" not in st.session_state:
        st.session_state["setup_dest_db"] = "POC_CDC"
    dest_db = st.text_input("Destination database", key="setup_dest_db")
with dest_col2:
    if "setup_dest_wh" not in st.session_state:
        st.session_state["setup_dest_wh"] = "CDC_DEMO_WH"
    dest_wh = st.text_input("Warehouse", key="setup_dest_wh")

role_col, _ = st.columns(2)
with role_col:
    if "setup_sf_role" not in st.session_state:
        st.session_state["setup_sf_role"] = ""
    sf_role = st.text_input(
        "Snowflake role (optional — leave empty for session default)",
        key="setup_sf_role",
    )

code_block(f"CREATE DATABASE IF NOT EXISTS {dest_db};", "sql")
st.caption("Pre-create the destination database. Openflow auto-creates schemas and tables inside it.")

# ── Per-Database Connector Configs ───────────────────────────────────────

st.markdown("**Per-Database Connector Configs**")
st.caption(
    "One config file per database. Each maps to a separate Openflow SQL Server "
    "CDC connector deployed with `--parameter_context_handling REPLACE` for isolation."
)

configs = {}
for db_name, tables in table_results.items():
    ready = [
        t for t in tables
        if t["Primary Key"] and t["Change Tracking"] and t["SELECT Permission"]
    ]
    if not ready:
        continue

    table_list = ", ".join(f"{t['Schema']}.{t['Table']}" for t in ready)

    config = {
        "SQL Server Connection URL": (
            f"jdbc:sqlserver://<SERVICE_DNS>:1433;"
            f"databaseName={db_name};encrypt=false"
        ),
        "SQL Server Username": user,
        "Included Table Names": table_list,
        "Object Identifier Resolution": "CASE_INSENSITIVE",
        "Destination Database": dest_db,
        "Snowflake Warehouse": dest_wh,
    }
    if sf_role:
        config["Snowflake Role"] = sf_role

    configs[db_name] = config

if not configs:
    st.warning("No databases have tables ready for replication.")
    st.stop()

for db_name, config in configs.items():
    config_json = json.dumps(config, indent=2)
    filename = f"{db_name}-params.json"
    with st.expander(f"**{db_name}** — `{filename}`", expanded=False):
        code_block(config_json, "json", filename)
        st.download_button(
            f"Download {filename}",
            data=config_json,
            file_name=filename,
            mime="application/json",
            use_container_width=True,
            key=f"dl_{db_name}",
        )

# Download all as ZIP
import io
import zipfile

zip_buf = io.BytesIO()
with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
    for db_name, config in configs.items():
        zf.writestr(f"{db_name}-params.json", json.dumps(config, indent=2))
zip_buf.seek(0)

st.download_button(
    "Download All Configs (ZIP)",
    data=zip_buf.getvalue(),
    file_name="openflow-configs.zip",
    mime="application/zip",
    use_container_width=True,
    type="primary",
)

st.caption(
    "**Password omitted** — set separately via: "
    "`nipyapi ci configure_inherited_params --parameters "
    "'{\"SQL Server Password\": \"...\"}' ...`\n\n"
    "**`<SERVICE_DNS>`** — resolve via: "
    "`SELECT SYSTEM$GET_SERVICE_DNS_DOMAIN('CDC_DEMO.PUBLIC');` "
    "then construct: `cdc-demo-service.<result>:1433`"
)

# ── Snowflake Destination Preview ─────────────────────────────────────────

st.markdown("**Snowflake Destination Preview**")
st.caption(f"Openflow will auto-create these schemas and tables inside `{dest_db}`.")
preview_rows = []
for db_name, config in configs.items():
    ready = [
        t for t in table_results[db_name]
        if t["Primary Key"] and t["Change Tracking"] and t["SELECT Permission"]
    ]
    for t in ready:
        preview_rows.append({
            "Source": f"{db_name}.{t['Schema']}.{t['Table']}",
            "Connector": f"{db_name} connector",
            "Destination Schema": t["Schema"].upper(),
            "Destination Table": t["Table"].upper(),
        })
data_table(pd.DataFrame(preview_rows))
