#!/usr/bin/env python3
"""
Streamlit Dashboard for SQL Server CDC Demo
Main application entry point
"""

import os
import pyodbc
import logging
import streamlit as st
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Page Configuration
# ============================================================================
st.set_page_config(
    page_title="SQL Server CDC Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================================================
# Session State & Caching
# ============================================================================

@st.cache_resource
def get_db_connection() -> Optional[pyodbc.Connection]:
    """Get or create database connection (cached across reruns)"""
    try:
        sql_host = os.getenv('SQL_HOST', 'sqlserver')
        sql_port = int(os.getenv('SQL_PORT', 1433))
        sql_user = os.getenv('SQL_USER', 'sa')
        sql_password = os.getenv('SQL_PASSWORD', 'YourStrongPassw0rd!')
        sql_database = os.getenv('SQL_DATABASE', 'DemoDB')
        
        connection_string = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={sql_host},{sql_port};"
            f"Database={sql_database};"
            f"UID={sql_user};"
            f"PWD={sql_password};"
            f"TrustServerCertificate=yes;"
        )
        
        conn = pyodbc.connect(connection_string, timeout=10)
        logger.info(f"Connected to SQL Server {sql_host}:{sql_port}/{sql_database}")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return None


# ============================================================================
# Theme Configuration
# ============================================================================
st.markdown("""
<style>
    /* Snowflake-inspired blue theme */
    :root {
        --primary-color: #29B7F0;
        --background-color: #0F1419;
        --secondary-background-color: #1B2231;
        --text-color: #FFFFFF;
        --text-secondary: #A0A0A0;
    }
    
    .main {
        background: linear-gradient(135deg, #0F1419 0%, #1B2231 100%);
        color: #FFFFFF;
    }
    
    .stTabs [data-baseweb="tab-list"] button {
        color: #A0A0A0;
    }
    
    .stTabs [aria-selected="true"] {
        color: #29B7F0 !important;
        border-bottom: 2px solid #29B7F0 !important;
    }
    
    .metric-box {
        background: rgba(41, 183, 240, 0.1);
        border: 1px solid #29B7F0;
        border-radius: 8px;
        padding: 16px;
        margin: 8px 0;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# Header
# ============================================================================

col1, col2, col3 = st.columns([1, 2, 1])

with col1:
    st.image("https://www.svgrepo.com/show/303229/microsoft-sql-server-logo.svg", width=80)

with col2:
    st.title("🗄️ SQL Server CDC Demo Dashboard")
    st.markdown("**Change Data Capture with Snowflake Openflow**")

with col3:
    # Connection status indicator
    conn = get_db_connection()
    if conn:
        st.success("✅ Connected")
    else:
        st.error("❌ Disconnected")

st.divider()

# ============================================================================
# Navigation
# ============================================================================

page_names = [
    "1️⃣ Setup",
    "2️⃣ Simulator",
    "3️⃣ Monitor",
    "4️⃣ Demo Script"
]

selected_page = st.pills(
    "Navigation",
    page_names,
    default=page_names[0],
    key="page_nav"
)

# ============================================================================
# Delegate to page modules
# ============================================================================

# Import page modules dynamically
if "Setup" in selected_page:
    from pages import page_1_setup
    page_1_setup.show(conn)
elif "Simulator" in selected_page:
    from pages import page_2_simulator
    page_2_simulator.show(conn)
elif "Monitor" in selected_page:
    from pages import page_3_monitor
    page_3_monitor.show(conn)
elif "Demo Script" in selected_page:
    from pages import page_4_demo_script
    page_4_demo_script.show(conn)

# ============================================================================
# Footer
# ============================================================================

st.divider()
st.markdown("""
<div style="text-align: center; color: #A0A0A0; font-size: 0.85em; margin-top: 2rem;">
    <p>SQL Server Openflow POC | Change Data Capture Demo</p>
    <p>For support, see README.md or DEPLOYMENT-PLAN.md</p>
</div>
""", unsafe_allow_html=True)
