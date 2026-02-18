#!/usr/bin/env python3
"""
Streamlit Dashboard for SQL Server CDC Demo
Main application entry point (landing page)
"""

import logging
from db import get_db_connection
from components import page_setup, connection_badge, footer, stat_card_row
import streamlit as st

logging.basicConfig(level=logging.INFO)

page_setup("SQL Server CDC Dashboard", "📊")

# ── Header ────────────────────────────────────────────────────────────────

col1, col2, col3 = st.columns([1, 2, 1])

with col1:
    st.image("https://www.svgrepo.com/show/303229/microsoft-sql-server-logo.svg", width=80)

with col2:
    st.title("SQL Server CDC Demo Dashboard")
    st.markdown("**Change Data Capture with Snowflake Openflow**")

with col3:
    conn = get_db_connection()
    connection_badge(conn is not None)

st.divider()

# Quick stats when connected
if conn:
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM Customers")
        customers = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Products")
        products = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Orders")
        orders = cursor.fetchone()[0]

        stat_card_row([
            {"label": "Customers", "value": customers, "icon": "👥"},
            {"label": "Products", "value": products, "icon": "📦"},
            {"label": "Orders", "value": orders, "icon": "🛒"},
            {"label": "Database", "value": "DemoDB", "icon": "🗄️"},
        ])
        st.markdown("")
    except Exception:
        pass  # silently skip if tables don't exist yet

st.info(
    "**Getting Started:**\n\n"
    "1. Go to **Setup** to verify database health and Change Tracking\n"
    "2. Go to **Simulator** to start generating data\n"
    "3. Follow the **Demo Script** for Openflow deployment instructions"
)

footer()
