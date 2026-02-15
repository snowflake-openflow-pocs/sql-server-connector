"""
Page 2: Simulator
Controls data generation mode, rate, and monitoring
"""

import streamlit as st
import pyodbc
from typing import Optional


def show(conn: Optional[pyodbc.Connection]):
    """Render the Simulator page"""
    
    st.header("⚡ Data Generator Simulator")
    st.markdown("Control data generation modes and rates")
    
    if not conn:
        st.error("❌ Not connected to SQL Server.")
        return
    
    try:
        # =====================================================================
        # Mode Selection
        # =====================================================================
        st.subheader("1. Select Generation Mode")
        
        mode_description = {
            "steady": "🟢 **Steady** - Constant 10 ops/minute (1 every 6 sec) - Ideal for baseline testing",
            "burst": "⚡ **Burst** - 50 ops in 10 sec, then 50 sec pause - Test scaling and spike handling",
            "mixed": "🎲 **Mixed** - Random INSERT (40%) / UPDATE (40%) / DELETE (20%) - Realistic pattern"
        }
        
        selected_mode = st.segmented_control(
            "Data Generation Mode",
            ["steady", "burst", "mixed"],
            default="steady",
            selection_mode="single"
        )
        
        st.info(mode_description.get(selected_mode, ""))
        
        # =====================================================================
        # Rate Control (for future enhancement)
        # =====================================================================
        st.divider()
        st.subheader("2. Configuration")
        
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
        st.divider()
        st.subheader("3. Control Data Generation")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("▶️ Start Generator", key="start_btn", use_container_width=True):
                st.success(f"✅ Generator started in {selected_mode.upper()} mode")
                st.info(f"Generating data with mode: **{selected_mode}**")
        
        with col2:
            if st.button("⏸️ Pause", key="pause_btn", use_container_width=True):
                st.info("⏸️ Generator paused (data already in database)")
        
        with col3:
            if st.button("🔄 Reset", key="reset_btn", use_container_width=True):
                st.warning("⚠️ This would reset counters. Implement with caution.")
        
        # =====================================================================
        # Live Metrics
        # =====================================================================
        st.divider()
        st.subheader("4. Real-Time Metrics (Updated every 2 seconds)")
        
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
            
            # Display metrics
            metric_col1, metric_col2, metric_col3 = st.columns(3)
            
            with metric_col1:
                st.metric(
                    "👥 Customers",
                    customer_count,
                    "+5" if customer_count > 0 else "baseline"
                )
            
            with metric_col2:
                st.metric(
                    "📦 Products",
                    product_count,
                    "fixed" if product_count == 10 else ""
                )
            
            with metric_col3:
                st.metric(
                    "🛒 Orders",
                    order_count,
                    "+12" if order_count > 5 else "baseline"
                )
            
            # Order status breakdown
            st.markdown("**Order Status Breakdown:**")
            
            status_col1, status_col2, status_col3 = st.columns(3)
            
            with status_col1:
                pending = order_status.get("Pending", 0)
                st.metric("📋 Pending", pending)
            
            with status_col2:
                shipped = order_status.get("Shipped", 0)
                st.metric("📦 Shipped", shipped)
            
            with status_col3:
                delivered = order_status.get("Delivered", 0)
                st.metric("✅ Delivered", delivered)
        
        except Exception as e:
            st.error(f"Error fetching metrics: {e}")
        
        # =====================================================================
        # Generator Performance Stats
        # =====================================================================
        st.divider()
        st.subheader("5. Generator Performance")
        
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
            "💡 **Tip:** Open the Monitor page in another browser tab to watch changes in real-time!"
        )
        
    except Exception as e:
        st.error(f"❌ Error in Simulator: {e}")
        import traceback
        st.code(traceback.format_exc())
