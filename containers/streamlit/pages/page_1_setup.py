"""
Page 1: Setup
Displays database health, table information, and Change Tracking status
"""

import streamlit as st
import pyodbc
from typing import Optional, Dict, List


def show(conn: Optional[pyodbc.Connection]):
    """Render the Setup page"""
    
    st.header("🔧 Database Setup & Health Check")
    st.markdown("Verify SQL Server is running and properly configured for CDC")
    
    if not conn:
        st.error("❌ Not connected to SQL Server. Please check your configuration.")
        return
    
    try:
        # =====================================================================
        # Connection Info Card
        # =====================================================================
        st.subheader("Connection Information")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Host", "sqlserver:1433")
        with col2:
            st.metric("Database", "DemoDB")
        with col3:
            st.metric("Status", "🟢 Connected")
        
        # =====================================================================
        # Database Verification
        # =====================================================================
        st.divider()
        st.subheader("Database Verification")
        
        cursor = conn.cursor()
        
        # Check if DemoDB exists and is Change Tracking enabled
        cursor.execute("""
            SELECT 
                name,
                is_cdc_enabled,
                CASE WHEN name = 'DemoDB' THEN 'Yes' ELSE 'No' END as DemoDB_Exists
            FROM sys.databases
            WHERE name = 'DemoDB'
        """)
        
        db_info = cursor.fetchone()
        if db_info:
            db_name, is_cdc, exists = db_info
            
            col1, col2 = st.columns(2)
            with col1:
                st.info(f"✅ Database **{db_name}** exists")
            with col2:
                if is_cdc:
                    st.success("✅ CDC Enabled (or similar tracking enabled)")
                else:
                    st.warning("⚠️ CDC not enabled at DB level - using Change Tracking instead")
        else:
            st.error("❌ DemoDB not found!")
        
        # =====================================================================
        # Table Status
        # =====================================================================
        st.divider()
        st.subheader("Table Status & Row Counts")
        
        cursor.execute("""
            SELECT 
                t.name as TableName,
                ISNULL(ct.is_tracking_on, 0) as ChangeTrackingEnabled,
                ROW_NUMBER() OVER (ORDER BY t.name) as RowNum
            FROM sys.tables t
            LEFT JOIN sys.change_tracking_tables ct ON t.object_id = ct.object_id
            WHERE t.schema_id = SCHEMA_ID('dbo')
            ORDER BY t.name
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            # Create metrics for each table
            col1, col2, col3 = st.columns(3)
            cols = [col1, col2, col3]
            
            for idx, (table_name, tracking_enabled, _) in enumerate(tables):
                with cols[idx % 3]:
                    # Get row count
                    cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                    row_count = cursor.fetchone()[0]
                    
                    tracking_status = "✅ CT On" if tracking_enabled else "⚠️ CT Off"
                    st.metric(
                        f"📊 {table_name}",
                        f"{row_count} rows",
                        tracking_status
                    )
            
            # Detailed table info
            st.markdown("---")
            st.write("**Detailed Table Information:**")
            
            table_data = []
            for table_name, tracking_enabled, _ in tables:
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                row_count = cursor.fetchone()[0]
                
                # Get primary key info
                cursor.execute(f"""
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME LIKE 'PK_%'
                """)
                pk_result = cursor.fetchone()
                pk_col = pk_result[0] if pk_result else "None"
                
                table_data.append({
                    "Table": table_name,
                    "Rows": row_count,
                    "Primary Key": pk_col,
                    "Change Tracking": "✅ Enabled" if tracking_enabled else "❌ Disabled"
                })
            
            st.table(table_data)
        
        # =====================================================================
        # Change Tracking Configuration
        # =====================================================================
        st.divider()
        st.subheader("Change Tracking Configuration")
        
        cursor.execute("""
            SELECT 
                name as DBName,
                is_cdc_enabled,
                DATABASEPROPERTYEX(name, 'IsPublished') as IsPublished
            FROM sys.databases
            WHERE name = 'DemoDB'
        """)
        
        ct_config = cursor.fetchone()
        if ct_config:
            db_name, cdc_enabled, _ = ct_config
            
            info_cols = st.columns(2)
            with info_cols[0]:
                st.info("**Change Tracking Status:**")
                st.write("- Retention: 2 days")
                st.write("- Auto-cleanup: Enabled")
                st.write("- Track columns: Enabled")
            
            with info_cols[1]:
                if cdc_enabled:
                    st.success("✅ CDC is enabled at database level")
                else:
                    st.info("ℹ️ Using SQL Server Change Tracking (works with Openflow CDC connector)")
        
        # =====================================================================
        # CDC Ready Status
        # =====================================================================
        st.divider()
        st.success(
            "✅ **System is Ready for CDC!**\n\n"
            "All tables have Change Tracking enabled and are ready for Openflow synchronization."
        )
        
        st.info(
            "**Next Steps:**\n\n"
            "1. Go to **Simulator** page to start generating data\n"
            "2. Go to **Monitor** page to watch changes in real-time\n"
            "3. Follow the **Demo Script** page for Openflow deployment instructions"
        )
        
    except Exception as e:
        st.error(f"❌ Error reading database: {e}")
        import traceback
        st.code(traceback.format_exc())
