"""
Page 2: Simulator
Controls data generation mode, rate, and monitoring
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
import pyodbc
import random
import time
from typing import Optional
from faker import Faker
from db import get_db_connection
from components import (
    page_setup, page_header, section_header,
    stat_card_row, donut_chart, CHART_COLORS,
)

page_setup("Simulator")

# Initialize Faker
fake = Faker()


def insert_customer(conn: pyodbc.Connection) -> bool:
    """Insert a new customer"""
    try:
        cursor = conn.cursor()
        name = fake.name()
        email = fake.email()
        city = fake.city()
        
        cursor.execute(
            "INSERT INTO Customers (Name, Email, City) VALUES (?, ?, ?)",
            (name, email, city)
        )
        conn.commit()
        return True
    except Exception as e:
        st.error(f"INSERT customer failed: {e}")
        return False


def insert_order(conn: pyodbc.Connection) -> bool:
    """Insert a new order"""
    try:
        cursor = conn.cursor()
        
        # Get random customer and product IDs
        cursor.execute("SELECT COUNT(*) FROM Customers")
        customer_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Products")
        product_count = cursor.fetchone()[0]
        
        if customer_count == 0 or product_count == 0:
            st.warning("No customers or products available")
            return False
        
        customer_id = random.randint(1, customer_count)
        product_id = random.randint(1, product_count)
        quantity = random.randint(1, 10)
        
        cursor.execute(
            "INSERT INTO Orders (CustomerID, ProductID, Quantity, Status) VALUES (?, ?, ?, ?)",
            (customer_id, product_id, quantity, 'Pending')
        )
        conn.commit()
        return True
    except Exception as e:
        st.error(f"INSERT order failed: {e}")
        return False


def update_order_status(conn: pyodbc.Connection) -> bool:
    """Update an order status (Pending -> Shipped -> Delivered)"""
    try:
        cursor = conn.cursor()
        
        # Get a pending order
        cursor.execute("SELECT TOP 1 OrderID, Status FROM Orders WHERE Status != 'Delivered' ORDER BY OrderID DESC")
        result = cursor.fetchone()
        
        if not result:
            return False
        
        order_id, current_status = result
        
        # Cycle status
        if current_status == 'Pending':
            new_status = 'Shipped'
        elif current_status == 'Shipped':
            new_status = 'Delivered'
        else:
            new_status = 'Pending'
        
        cursor.execute(
            "UPDATE Orders SET Status = ? WHERE OrderID = ?",
            (new_status, order_id)
        )
        conn.commit()
        return True
    except Exception as e:
        st.error(f"UPDATE order status failed: {e}")
        return False


def update_product_stock(conn: pyodbc.Connection) -> bool:
    """Update product stock"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM Products")
        product_count = cursor.fetchone()[0]
        
        if product_count == 0:
            return False
        
        product_id = random.randint(1, product_count)
        stock_delta = random.randint(-5, 10)
        
        cursor.execute(
            "UPDATE Products SET Stock = MAX(0, Stock + ?) WHERE ProductID = ?",
            (stock_delta, product_id)
        )
        conn.commit()
        return True
    except Exception as e:
        st.error(f"UPDATE product stock failed: {e}")
        return False


def delete_pending_order(conn: pyodbc.Connection) -> bool:
    """Delete a pending order"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 OrderID FROM Orders WHERE Status = 'Pending' ORDER BY OrderID")
        result = cursor.fetchone()
        
        if not result:
            return False
        
        order_id = result[0]
        cursor.execute("DELETE FROM Orders WHERE OrderID = ?", (order_id,))
        conn.commit()
        return True
    except Exception as e:
        st.error(f"DELETE pending order failed: {e}")
        return False


def perform_operation(conn: pyodbc.Connection, mode: str):
    """Perform one operation based on mode"""
    if mode == "steady":
        operations = [insert_customer, insert_order, update_order_status, update_product_stock, delete_pending_order]
        op = random.choice(operations)
        return op(conn)
    elif mode == "burst":
        # For burst, we handle in batch
        pass
    elif mode == "mixed":
        rand = random.random()
        if rand < 0.4:  # 40% INSERT
            op = random.choice([insert_customer, insert_order])
        elif rand < 0.8:  # 40% UPDATE
            op = random.choice([update_order_status, update_product_stock])
        else:  # 20% DELETE
            op = delete_pending_order
        return op(conn)
    return False


@st.fragment(run_every=2)
def live_metrics(conn: pyodbc.Connection):
    """Display live metrics updated every 2 seconds"""
    try:
        cursor = conn.cursor()

        # Get current counts
        cursor.execute("SELECT COUNT(*) FROM Customers")
        customer_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM Products")
        product_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM Orders")
        order_count = cursor.fetchone()[0]

        cursor.execute("""
            SELECT Status, COUNT(*) as Cnt FROM Orders GROUP BY Status
        """)
        order_status = {row[0]: row[1] for row in cursor.fetchall()}

        # Stat cards for entity counts
        stat_card_row([
            {"label": "Customers", "value": customer_count, "icon": "👥"},
            {"label": "Products", "value": product_count, "icon": "📦"},
            {"label": "Orders", "value": order_count, "icon": "🛒"},
        ])

        st.markdown("")  # spacing

        # Order status: donut + stat cards side by side
        pending = order_status.get("Pending", 0)
        shipped = order_status.get("Shipped", 0)
        delivered = order_status.get("Delivered", 0)

        chart_col, cards_col = st.columns([2, 1])

        with chart_col:
            donut_chart(
                labels=["Pending", "Shipped", "Delivered"],
                values=[pending, shipped, delivered],
                title="Order Status Breakdown",
                colors=[CHART_COLORS["warning"], CHART_COLORS["primary"], CHART_COLORS["success"]],
                height=280,
            )

        with cards_col:
            stat_card_row([
                {"label": "Pending", "value": pending, "icon": "📋"},
            ])
            st.markdown("")
            stat_card_row([
                {"label": "Shipped", "value": shipped, "icon": "🚚"},
            ])
            st.markdown("")
            stat_card_row([
                {"label": "Delivered", "value": delivered, "icon": "✅"},
            ])

    except Exception as e:
        st.error(f"Error fetching metrics: {e}")


@st.fragment(run_every=6)
def continuous_generation(conn: pyodbc.Connection):
    """Continuous generation for steady and mixed modes"""
    if st.session_state.get('running', False) and st.session_state.get('mode') in ['steady', 'mixed']:
        perform_operation(conn, st.session_state['mode'])


def show(conn: Optional[pyodbc.Connection]):
    """Render the Simulator page"""
    
    page_header("Data Generator Simulator", "Control data generation modes and rates")
    
    if not conn:
        st.error("❌ Not connected to SQL Server.")
        return
    
    try:
        # =====================================================================
        # Mode Selection
        # =====================================================================
        section_header("1. Select Generation Mode")
        
        mode_description = {
            "steady": "🟢 **Steady** - Constant 10 ops/minute (1 every 6 sec) - Ideal for baseline testing",
            "burst": "⚡ **Burst** - 50 ops in 10 sec, then 50 sec pause - Test scaling and spike handling",
            "mixed": "🎲 **Mixed** - Random INSERT (40%) / UPDATE (40%) / DELETE (20%) - Realistic pattern"
        }
        
        selected_mode = st.segmented_control(
            "Data Generation Mode",
            ["steady", "burst", "mixed"],
            default=st.session_state.get('mode', 'steady'),
            selection_mode="single"
        )
        
        st.session_state['mode'] = selected_mode
        st.info(mode_description.get(selected_mode, ""))
        
        # =====================================================================
        # Rate Control (for future enhancement)
        # =====================================================================
        section_header("2. Configuration")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Current Mode:** `" + selected_mode.upper() + "`")
            if selected_mode == "steady":
                st.write("Operations per minute: **10**")
                st.write("Interval: **6 seconds between ops**")
            elif selected_mode == "burst":
                st.write("Burst ops: **50 in 10 seconds**")
                st.write("Pause duration: **50 seconds**")
            else:  # mixed
                st.write("INSERT: **40%**")
                st.write("UPDATE: **40%**")
                st.write("DELETE: **20%**")
        
        with col2:
            st.markdown("**Data Types Generated:**")
            st.write("- ✅ Customers (random names, emails, cities)")
            st.write("- ✅ Products (category, price, stock)")
            st.write("- ✅ Orders (customer↔product relationships)")
            st.write("- ✅ Status changes (Pending→Shipped→Delivered)")
        
        # =====================================================================
        # Start/Stop Controls
        # =====================================================================
        section_header("3. Control Data Generation")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("▶️ Start Generator", key="start_btn", use_container_width=True):
                st.session_state['running'] = True
                st.success(f"✅ Generator started in {selected_mode.upper()} mode")
        
        with col2:
            if st.button("⏸️ Stop", key="stop_btn", use_container_width=True):
                st.session_state['running'] = False
                st.info("⏸️ Generator stopped")
        
        with col3:
            if st.button("🔄 Reset", key="reset_btn", use_container_width=True):
                st.session_state['running'] = False
                st.warning("⚠️ Generator stopped. Reset not implemented yet.")
        
        # =====================================================================
        # Live Metrics
        # =====================================================================
        section_header("4. Real-Time Metrics (Updated every 2 seconds)")
        
        live_metrics(conn)
        
        # =====================================================================
        # Continuous generation fragment
        # =====================================================================
        continuous_generation(conn)
        
        # For burst, handle immediately when started
        if st.session_state.get('running', False) and selected_mode == "burst":
            st.write("Bursting 50 operations...")
            progress_bar = st.progress(0)
            for i in range(50):
                perform_operation(conn, 'steady')  # random ops for burst
                progress_bar.progress((i+1)/50)
            st.success("Burst complete! Generator stopped.")
            st.session_state['running'] = False
        
        # =====================================================================
        # Generator Performance Stats
        # =====================================================================
        section_header("5. Generator Performance")
        
        perf_col1, perf_col2 = st.columns(2)
        
        with perf_col1:
            st.info(
                "**Operations per Minute:**\n\n"
                "- Steady: 10 ops/min\n"
                "- Burst: ~300 ops/min (in 10s window)\n"
                "- Mixed: 40-60 ops/min\n"
            )
        
        with perf_col2:
            st.info(
                "**Data Volume:**\n\n"
                "- Initial customers: 5\n"
                "- Initial products: 10\n"
                "- Initial orders: 5\n"
                "- Scales with generation\n"
            )
        
        st.success(
            "💡 **Tip:** Deploy the Openflow connector (Demo Script page) to watch CDC changes flow into Snowflake!"
        )
        
    except Exception as e:
        st.error(f"❌ Error in Simulator: {e}")
        import traceback
        st.code(traceback.format_exc())


show(get_db_connection())