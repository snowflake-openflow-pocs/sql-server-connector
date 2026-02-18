"""
Page 4: Demo Script
Step-by-step walkthrough for Snowflake Sales Engineers
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
import pyodbc
from typing import Optional
from db import get_db_connection
from components import page_setup, page_header, code_block, footer

page_setup("Demo Script")


def show(conn: Optional[pyodbc.Connection]):
    """Render the Demo Script page"""

    page_header("Demo Script", "Step-by-step walkthrough for deploying Openflow and demonstrating CDC")
    
    st.info(
        "📌 **Target Audience:** Snowflake Sales Engineers (SEs) and customers\n\n"
        "**Total Demo Time:** ~15 minutes from cold start, ~5 minutes for warm start"
    )
    
    # =====================================================================
    # Phase 1: Setup & Verification
    # =====================================================================
    with st.expander("**Phase 1️⃣: Setup & Verification** (2-3 min)", expanded=True):
        st.markdown("""
        #### What the audience sees:
        1. **Cold start:** Wait for SQL Server container (~1 minute)
        2. **Setup page:** Verify database health ✅
        3. **Table counts:** Customers (5), Products (10), Orders (5)
        4. **Change Tracking:** Confirmed enabled on all tables ✅
        
        #### SE talking points:
        - "We've deployed a complete SQL Server 2022 environment inside Snowflake SPCS"
        - "Change Tracking is natively enabled on all tables"
        - "No external networking needed — everything is internal to Snowflake"
        - "This is the exact same setup customers can replicate in their accounts"
        
        #### Expected outcomes:
        - ✅ DemoDB exists and is online
        - ✅ Change Tracking enabled
        - ✅ 3 tables (Customers, Products, Orders) ready for sync
        """)
    
    # =====================================================================
    # Phase 2: Data Generation
    # =====================================================================
    with st.expander("**Phase 2️⃣: Start Data Generation** (1 min)"):
        st.markdown("""
        #### What to do:
        1. **Go to Simulator page**
        2. **Select "steady" mode** (10 ops/minute for steady flow)
        3. **Click "Start Generator"** button
        4. **Wait 30 seconds** for data to start flowing
        
        #### What the audience sees:
        - Customer count incrementing (~1-2 new customers)
        - Order count increasing (~3-5 new orders)
        - Order status changes (Pending → Shipped → Delivered)
        
        #### SE talking points:
        - "The data generator simulates realistic e-commerce activity"
        - "We have three modes: steady (10/min), burst (spike testing), mixed (realistic)"
        - "This is happening in real-time inside SQL Server"
        - "All changes are captured by Change Tracking"
        
        #### Data modes explained:
        - **Steady:** 10 operations/minute (one every 6 seconds) — baseline demo
        - **Burst:** 50 operations in 10 seconds, then 50-second pause — spike handling demo
        - **Mixed:** 40% INSERT, 40% UPDATE, 20% DELETE — realistic production pattern
        """)
    
    # =====================================================================
    # Phase 3: Monitor Changes
    # =====================================================================
    with st.expander("**Phase 3️⃣: Monitor Changes in Real-Time** (2 min)"):
        st.markdown("""
        #### What to do:
        1. **Keep data generator running** (should still be in "steady" mode)
        2. **Go to Monitor page** (in another browser tab or same page)
        3. **Watch metrics auto-refresh** every 2 seconds
        4. **Notice the "Recent Changes" table** showing latest orders
        
        #### What the audience sees:
        - Live counters updating every 2 seconds
        - Order status pie chart showing distribution (Pending, Shipped, Delivered)
        - Recent changes table with latest transactions
        - All happening in real-time
        
        #### SE talking points:
        - "These counters are live — pulling directly from SQL Server"
        - "All changes are captured by Change Tracking (CT)"
        - "Now we'll send these changes to Snowflake via Openflow in real-time"
        - "This is sub-30-second latency from SQL Server to Snowflake"
        
        #### Key metrics to call out:
        - Total customers: [current]
        - Total orders: [current]
        - Order status breakdown: Pending, Shipped, Delivered
        """)
    
    # =====================================================================
    # Phase 4: Deploy Openflow Connector
    # =====================================================================
    with st.expander("**Phase 4️⃣: Deploy Openflow SQL Server CDC Connector** (5-10 min)"):
        st.info(
            "**Config files available!** Download per-database connector configs "
            "from the **Setup** page (Section 4). These contain the correct "
            "Openflow parameter names pre-populated from your SQL Server metadata."
        )

        st.markdown("""
        #### Prerequisites:
        - Openflow deployed in your Snowflake SPCS
        - User role with Openflow admin permissions
        - nipyapi CLI available (or UI access)
        - Config files downloaded from Setup page → `configs/` directory

        #### Option A: Via UI (Openflow Web Interface)
        1. Navigate to **Openflow** in your Snowflake account
        2. Click **"Create New Flow"** or **"Import Flow"**
        3. Select **"SQL Server CDC Connector"** from connector registry
        4. **Configure source parameters:**
           - **JDBC URL:** `jdbc:sqlserver://cdc-demo-service.<hash>.svc.spcs.internal:1433;databaseName=DemoDB`
           - **Username:** `sa`
           - **Password:** [from secret]
           - **Tables:** `dbo.Customers, dbo.Products, dbo.Orders`
        5. **Configure destination parameters:**
           - **Database:** `POC_CDC`
           - **Role:** Your Snowflake role
           - **Warehouse:** `CDC_DEMO_WH`
        6. **Upload JDBC Driver:**
           - `mssql-jdbc-12.10.0.jre11.jar`
           - Upload via Assets tab → parameter: `SQL Server JDBC Driver`
        7. **Verify configuration** (dry run)
        8. **Enable controllers**, then **Start flow**

        #### Option B: Via nipyapi CLI (repeat per database)
        """)

        code_block("""\
# 1. Deploy connector (REPLACE for multi-db isolation)
nipyapi --profile <profile> ci deploy_flow \\
  --registry_client ConnectorFlowRegistryClient \\
  --bucket connectors \\
  --flow sqlserver \\
  --parameter_context_handling REPLACE

# 2. Get process group ID from deploy output
PG_ID="<pg-id-from-output>"

# 3. Configure from downloaded config file
nipyapi --profile <profile> ci configure_inherited_params \\
  --process_group_id $PG_ID \\
  --parameters_file configs/DemoDB-params.json

# 4. Set password separately (sensitive)
nipyapi --profile <profile> ci configure_inherited_params \\
  --process_group_id $PG_ID \\
  --parameters '{"SQL Server Password": "<password>"}'

# 5. Upload JDBC driver
nipyapi --profile <profile> ci upload_asset \\
  --url https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.10.0.jre11/mssql-jdbc-12.10.0.jre11.jar \\
  --context_id <source-context-id> \\
  --param_name "SQL Server JDBC Driver"

# 6. Verify, enable, start
nipyapi --profile <profile> ci verify_config --process_group_id $PG_ID --verify_processors false
nipyapi --profile <profile> canvas schedule_all_controllers $PG_ID true
nipyapi --profile <profile> ci verify_config --process_group_id $PG_ID --verify_controllers false
nipyapi --profile <profile> ci start_flow --process_group_id $PG_ID""", "bash")

        st.markdown("""
        #### What happens after deployment:
        - SQL Server connector connects via internal DNS (no EAI needed)
        - Polls Change Tracking tables every ~30 seconds (configurable)
        - Captures all INSERT, UPDATE, DELETE operations
        - Streams data to Snowflake via PutSnowpipeStreaming
        - Creates target tables: `POC_CDC.DBO.CUSTOMERS`, `PRODUCTS`, `ORDERS`
        - **Latency:** < 30 seconds from SQL Server to Snowflake

        #### Expected outcomes:
        - ✅ Openflow connector running (green status)
        - ✅ Data flowing to Snowflake (row counts increasing)
        - ✅ One connector per database, each with isolated parameters
        """)
    
    # =====================================================================
    # Phase 5: Verify End-to-End Sync
    # =====================================================================
    with st.expander("**Phase 5️⃣: Verify End-to-End Sync** (2 min)"):
        st.markdown("""
        #### What to do:
        1. **Keep data generator running** (in "steady" mode)
        2. **Open a Snowflake SQL worksheet** in your account
        3. **Run these queries:**
        
        #### Query 1: Check row counts in Snowflake
        """)
        
        code_block("""\
SELECT COUNT(*) as OrderCount FROM POC_CDC.PUBLIC.ORDERS;
SELECT COUNT(*) as CustomerCount FROM POC_CDC.PUBLIC.CUSTOMERS;""", "sql")
        
        st.markdown("""
        #### Query 2: Check recent orders synced
        """)
        
        code_block("""\
SELECT TOP 10 ORDER_ID, CUSTOMER_ID, PRODUCT_ID, STATUS, ORDER_DATE
FROM POC_CDC.PUBLIC.ORDERS
ORDER BY ORDER_DATE DESC;""", "sql")
        
        st.markdown("""
        #### Query 3: Monitor sync latency
        """)
        
        code_block("""\
-- SQL Server: Latest order date
SELECT MAX(OrderDate) as MaxOrderDate FROM DemoDB.dbo.Orders;

-- Snowflake: Latest synced order date (should be < 30 seconds behind)
SELECT MAX(ORDER_DATE) as MaxSyncedDate FROM POC_CDC.PUBLIC.ORDERS;""", "sql")
        
        st.markdown("""
        #### SE talking points:
        - "Here we're seeing real-time data sync from SQL Server to Snowflake"
        - "The latency is sub-30 seconds — near real-time CDC"
        - "All changes (inserts, updates, deletes) are captured and synced"
        - "This is fully automated via Openflow running inside Snowflake"
        - "No external infrastructure, no tunnels, no networking complexity"
        - "This same setup works with any SQL Server instance (on-prem, cloud, RDS, etc.)"
        
        #### Key metrics to call out:
        - Snowflake order count vs SQL Server count (should match or be < 30s behind)
        - Recent orders in both systems showing same data
        - Zero data loss or duplication
        """)
    
    # =====================================================================
    # Phase 6: Bonus: Spike Testing
    # =====================================================================
    with st.expander("**Phase 6️⃣: BONUS - Spike Testing (Optional, 2 min)**"):
        st.markdown("""
        #### What to do (if time permits):
        1. **Go back to Simulator page**
        2. **Switch mode from "steady" to "burst"**
        3. **Click "Start Generator"** again
        4. **Watch the spike in Openflow metrics:**
           - Connector processes 50 ops in 10 seconds
           - Snowflake receives burst of data
           - Then natural pause for 50 seconds
        
        #### SE talking points:
        - "This is simulating a real-world scenario — sudden spike in transactions"
        - "Openflow handles the surge gracefully — no data loss, no backlog"
        - "In production, you might see this during flash sales, bulk imports, etc."
        - "The connector auto-scales to handle peak loads"
        - "CDC ensures every change is captured, even during spikes"
        """)
    
    # =====================================================================
    # Closing & Talking Points
    # =====================================================================
    st.divider()
    
    with st.expander("**✅ Demo Conclusion & Talking Points**"):
        st.markdown("""
        ### What We've Demonstrated:
        
        1. **Self-contained environment:** SQL Server + data generator + dashboard all in SPCS
        2. **Change Tracking:** Natively enabled and capturing all DML changes
        3. **Real-time data generation:** Multiple modes for different scenarios
        4. **Live monitoring:** Dashboard with auto-refreshing metrics
        5. **Openflow integration:** SQL Server → Snowflake CDC connector
        6. **End-to-end sync:** Data flowing in real-time, sub-30-second latency
        7. **Zero external infrastructure:** Everything inside Snowflake
        
        ### Why This Matters for Your Business:
        
        - **For Data Integration:** Openflow makes SQL Server → Snowflake CDC effortless
        - **For Real-time Analytics:** Near real-time data availability in Snowflake
        - **For Compliance:** Full audit trail of all changes via Change Tracking
        - **For Operations:** No external tools, tunnels, or cloud hosting costs
        - **For Scale:** Handles steady streams, bursts, and complex patterns
        
        ### Next Steps with Customer:
        
        1. **POC in their account:** Clone this repo, deploy to their Snowflake account
        2. **Connect to their data:** Point connector to their SQL Server
        3. **Monitor their workload:** See how Openflow handles their patterns
        4. **Validate latency:** Measure sync time with their actual data volumes
        5. **Plan production deployment:** Determine warehouse sizing, schedule syncs
        
        ### Resource Links:
        
        - **README.md:** Quick start and troubleshooting
        - **DEPLOYMENT-PLAN.md:** Detailed SPCS setup guide
        - **architecture.md:** Technical design rationale
        - **Openflow Docs:** [link to Snowflake docs]
        - **SQL Server CDC:** [link to Microsoft docs]
        """)
    
    st.success(
        "🎉 **Demo Complete!** Questions? Check the README or chat with your Snowflake account team."
    )


show(get_db_connection())
footer()
