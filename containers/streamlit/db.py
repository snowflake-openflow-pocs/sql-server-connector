"""Shared database connection for all pages"""

import os
import logging
import pyodbc
import streamlit as st
from typing import Optional

logger = logging.getLogger(__name__)


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
