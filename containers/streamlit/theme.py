"""
Shared dark theme for all Streamlit pages.
Snowflake-inspired palette with blue accents.
"""

import streamlit as st

# Snowflake dark palette
COLORS = {
    "primary": "#29B5E8",
    "bg": "#0E1117",
    "bg_secondary": "#1B2231",
    "text": "#FAFAFA",
    "text_muted": "#A0A0A0",
}

_CSS = """<style>
    .main {
        background: linear-gradient(180deg, #0E1117 0%, #1B2231 100%);
    }

    .stTabs [aria-selected="true"] {
        color: #29B5E8 !important;
        border-bottom-color: #29B5E8 !important;
    }

    [data-testid="stMetric"] {
        background: rgba(41, 181, 232, 0.08);
        border: 1px solid rgba(41, 181, 232, 0.2);
        border-radius: 8px;
        padding: 12px 16px;
    }

    .stCodeBlock {
        border: 1px solid rgba(41, 181, 232, 0.15);
        border-radius: 8px;
    }
</style>
"""


def apply_theme():
    """Inject custom CSS. Call after st.set_page_config()."""
    st.markdown(_CSS, unsafe_allow_html=True)
