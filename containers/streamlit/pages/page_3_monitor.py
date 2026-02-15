"""
Page 3: Monitor
Real-time monitoring of Change Tracking metrics and data changes
"""

import streamlit as st
import pyodbc
import pandas as pd
import plotly.graph_objects as go
from typing import Optional, Dict, List
from datetime import datetime


def show(conn: Optional[pyodbc.Connection]):
    """Render the Monitor page"""
    
    st.header("📊 Real-Time Monitoring")
    st.markdown("Live Change Tracking metrics and recent changes")
    
    if not conn:
        st.error("❌ Not connected to SQL Server.")
        return
    
    try:
        cursor = conn.cursor()
        
        # =====================================================================
        # Auto-refresh fragment (updates every 2 seconds)
        # =====================================================================
        
        @st.fragment(run_every=2)
        def refresh_metrics():
            """Auto-refreshing metrics fragment"""
            
            # Get table counts
            cursor.execute("SELECT COUNT(*) FROM Customers")
            customer_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM Products")
            product_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM Orders")
            order_count = cursor.fetchone()[0]
            
            # Display live counters
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    "👥 Customers",
                    customer_count,
                    delta="+1" if customer_count > 5 else None,
                    delta_color="off"
                )
            
            with col2:
                st.metric(
                    "📦 Products",
                    product_count,
                    "10" if product_count == 10 else "variable",
                    delta_color="off"
                )
            
            with col3:
                st.metric(
                    "🛒 Orders",
                    order_count,
                    delta=f"+{order_count - 5}" if order_count > 5 else None,
                    delta_color="off"
                )
            
            with col4:
                st.metric(
                    "🔄 Last Updated",
                    datetime.now().strftime("%H:%M:%S"),
                    delta_color="off"
                )
        
        refresh_metrics()
        
        # =====================================================================
        # Change Tracking Summary
        # =====================================================================
        st.divider()
        st.subheader("Change Tracking Summary")
        
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN Status = 'Pending' THEN 1 END) as Pending,
                COUNT(CASE WHEN Status = 'Shipped' THEN 1 END) as Shipped,
                COUNT(CASE WHEN Status = 'Delivered' THEN 1 END) as Delivered
            FROM Orders
        """)
        
        result = cursor.fetchone()
        if result:
            pending, shipped, delivered = result
            
            # Create a pie chart
            fig = go.Figure(data=[
                go.Pie(
                    labels=['Pending', 'Shipped', 'Delivered'],
                    values=[pending, shipped, delivered],
                    marker=dict(colors=['#FF9999', '#66B2FF', '#99FF99']),
                    hovertemplate='<b>%{label}</b><br>Orders: %{value}<extra></extra>'
                )
            ])
            
            fig.update_layout(
                title="Order Status Distribution",
                height=400,
                template="plotly_dark"
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        # =====================================================================
        # Recent Changes Table
        # =====================================================================
        st.divider()
        st.subheader("Recent Changes (Last 20 rows)")
        
        # Get recent orders
        cursor.execute("""
            SELECT TOP 20
                OrderID,
                (SELECT Name FROM Customers WHERE CustomerID = Orders.CustomerID) as Customer,
                (SELECT Name FROM Products WHERE ProductID = Orders.ProductID) as Product,
                Quantity,
                Status,
                OrderDate
            FROM Orders
            ORDER BY OrderID DESC
        """)
        
        orders = cursor.fetchall()
        if orders:
            order_data = []
            for row in orders:
                order_data.append({
                    "Order ID": row[0],
                    "Customer": row[1],
                    "Product": row[2],
                    "Qty": row[3],
                    "Status": row[4],
                    "Date": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else "N/A"
                })
            
            st.dataframe(
                pd.DataFrame(order_data),
                use_container_width=True,
                hide_index=True
            )
        
        # =====================================================================
        # Change Rate Metrics
        # =====================================================================
        st.divider()
        st.subheader("Change Rate Trends")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.info(
                "**Inserts per minute:**\n\n"
                "Tracks new customer/order creation rate"
            )
        
        with col2:
            st.info(
                "**Updates per minute:**\n\n"
                "Tracks status changes and stock modifications"
            )
        
        with col3:
            st.info(
                "**Deletes per minute:**\n\n"
                "Tracks order cancellations"
            )
        
        # =====================================================================
        # SQL Server Change Tracking Tables
        # =====================================================================
        st.divider()
        st.subheader("Change Tracking Status")
        
        cursor.execute("""
            SELECT 
                t.name as TableName,
                CASE WHEN ct.is_tracking_on = 1 THEN 'Enabled' ELSE 'Disabled' END as TrackingStatus,
                CASE WHEN ISNULL(ct.min_valid_version, 0) > 0 THEN 'Active' ELSE 'Not Active' END as Status
            FROM sys.tables t
            LEFT JOIN sys.change_tracking_tables ct ON t.object_id = ct.object_id
            WHERE t.schema_id = SCHEMA_ID('dbo')
            ORDER BY t.name
        """)
        
        ct_status = []
        for row in cursor.fetchall():
            ct_status.append({
                "Table": row[0],
                "Tracking": row[1],
                "Status": row[2]
            })
        
        if ct_status:
            st.table(pd.DataFrame(ct_status))
        
        st.info(
            "💡 **Note:** Snowflake Openflow connector polls these Change Tracking tables "
            "to capture all DML changes (INSERT, UPDATE, DELETE) and sync them to Snowflake."
        )
        
    except Exception as e:
        st.error(f"❌ Error in Monitor: {e}")
        import traceback
        st.code(traceback.format_exc())
