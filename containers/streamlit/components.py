"""
Reusable UI components for all Streamlit pages.
Import what you need: from components import page_setup, section_header, ...
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from theme import apply_theme, COLORS


def page_setup(title: str = "SQL Server CDC Dashboard", icon: str = "📊"):
    """First call on every page. Sets wide layout + dark theme."""
    st.set_page_config(
        page_title=title,
        page_icon=icon,
        layout="wide",
        initial_sidebar_state="expanded",
    )
    apply_theme()


def page_header(title: str, subtitle: str = ""):
    """Page title + optional caption."""
    st.header(title)
    if subtitle:
        st.caption(subtitle)


def section_header(title: str):
    """Divider + subheader for numbered sections."""
    st.divider()
    st.subheader(title)


def metric_row(metrics: list[tuple]):
    """N metrics in equal columns. metrics = [(label, value), ...]"""
    cols = st.columns(len(metrics))
    for col, (label, value) in zip(cols, metrics):
        col.metric(label, value)


def code_block(code: str, language: str = "sql", download_name: str | None = None):
    """Code block with optional download button."""
    st.code(code, language=language)
    if download_name:
        mime = "application/json" if download_name.endswith(".json") else "text/plain"
        st.download_button(
            f"Download {download_name}",
            data=code,
            file_name=download_name,
            mime=mime,
            use_container_width=True,
        )


def data_table(df: pd.DataFrame, **kwargs):
    """Styled dataframe — wide, no index."""
    st.dataframe(df, use_container_width=True, hide_index=True, **kwargs)


def connection_badge(connected: bool):
    """Green/red connection status."""
    if connected:
        st.success("Connected")
    else:
        st.error("Disconnected")


def footer():
    """Standard app footer."""
    st.divider()
    st.caption("SQL Server Openflow POC | Change Data Capture Demo")


# ---------------------------------------------------------------------------
# Plotly Chart Helpers (dark-theme aware, interactive)
# ---------------------------------------------------------------------------

# Shared chart palette
CHART_COLORS = {
    "primary": "#29B5E8",
    "success": "#00D26A",
    "warning": "#FFC107",
    "error": "#FF4B4B",
    "muted": "#4A5568",
    "purple": "#A78BFA",
    "orange": "#FB923C",
    "pink": "#F472B6",
}

_PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(color=COLORS["text"], family="sans-serif"),
    margin=dict(l=20, r=20, t=40, b=20),
)


def donut_chart(
    labels: list[str],
    values: list[int | float],
    title: str = "",
    colors: list[str] | None = None,
    height: int = 300,
):
    """Interactive donut chart. Hover shows label + value + %."""
    if colors is None:
        palette = list(CHART_COLORS.values())
        colors = [palette[i % len(palette)] for i in range(len(labels))]

    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.55,
            marker=dict(colors=colors, line=dict(color=COLORS["bg"], width=2)),
            textinfo="label+value",
            textfont=dict(size=12),
            hovertemplate="<b>%{label}</b><br>Count: %{value}<br>Share: %{percent}<extra></extra>",
        )
    )
    fig.update_layout(
        **_PLOTLY_LAYOUT,
        title=dict(text=title, font=dict(size=14)),
        height=height,
        showlegend=True,
        legend=dict(
            orientation="h", yanchor="bottom", y=-0.15, xanchor="center", x=0.5,
            font=dict(size=11),
        ),
    )
    st.plotly_chart(fig, use_container_width=True)


def gauge_chart(
    value: int | float,
    title: str = "",
    max_val: int | float = 100,
    suffix: str = "%",
    height: int = 250,
):
    """Radial gauge — green/yellow/red bands. Hover shows exact value."""
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value,
            number=dict(suffix=suffix, font=dict(size=28)),
            title=dict(text=title, font=dict(size=14)),
            gauge=dict(
                axis=dict(range=[0, max_val], tickcolor=COLORS["text_muted"]),
                bar=dict(color=CHART_COLORS["primary"]),
                bgcolor=COLORS["bg_secondary"],
                borderwidth=0,
                steps=[
                    dict(range=[0, max_val * 0.5], color="rgba(255,75,75,0.15)"),
                    dict(range=[max_val * 0.5, max_val * 0.8], color="rgba(255,193,7,0.15)"),
                    dict(range=[max_val * 0.8, max_val], color="rgba(0,210,106,0.15)"),
                ],
                threshold=dict(
                    line=dict(color=CHART_COLORS["success"], width=3),
                    thickness=0.8,
                    value=max_val,
                ),
            ),
        )
    )
    fig.update_layout(**_PLOTLY_LAYOUT, height=height)
    st.plotly_chart(fig, use_container_width=True)


def stacked_bar_chart(
    categories: list[str],
    segments: dict[str, list[int | float]],
    title: str = "",
    colors: dict[str, str] | None = None,
    height: int = 300,
    orientation: str = "h",
):
    """Stacked bar chart. segments = {"Ready": [3,2], "Not Ready": [1,0]} etc."""
    palette = list(CHART_COLORS.values())
    fig = go.Figure()
    for i, (seg_name, seg_values) in enumerate(segments.items()):
        color = (colors or {}).get(seg_name, palette[i % len(palette)])
        if orientation == "h":
            fig.add_trace(go.Bar(
                y=categories, x=seg_values, name=seg_name, orientation="h",
                marker=dict(color=color, line=dict(color=COLORS["bg"], width=1)),
                hovertemplate=f"<b>%{{y}}</b><br>{seg_name}: %{{x}}<extra></extra>",
            ))
        else:
            fig.add_trace(go.Bar(
                x=categories, y=seg_values, name=seg_name,
                marker=dict(color=color, line=dict(color=COLORS["bg"], width=1)),
                hovertemplate=f"<b>%{{x}}</b><br>{seg_name}: %{{y}}<extra></extra>",
            ))
    fig.update_layout(
        **_PLOTLY_LAYOUT,
        barmode="stack",
        title=dict(text=title, font=dict(size=14)),
        height=height,
        legend=dict(
            orientation="h", yanchor="bottom", y=-0.25, xanchor="center", x=0.5,
            font=dict(size=11),
        ),
        xaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
        yaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
    )
    st.plotly_chart(fig, use_container_width=True)


def stat_card(label: str, value, icon: str = "", delta: str = ""):
    """HTML stat card with hover glow effect."""
    delta_html = f'<div style="font-size:0.75rem;color:{CHART_COLORS["success"]};margin-top:2px">{delta}</div>' if delta else ""
    html = f"""
    <div style="
        background: rgba(41,181,232,0.06);
        border: 1px solid rgba(41,181,232,0.18);
        border-radius: 10px;
        padding: 18px 20px;
        text-align: center;
        transition: all 0.2s ease;
        cursor: default;
    " onmouseover="this.style.borderColor='rgba(41,181,232,0.5)';this.style.boxShadow='0 0 18px rgba(41,181,232,0.15)'"
       onmouseout="this.style.borderColor='rgba(41,181,232,0.18)';this.style.boxShadow='none'">
        <div style="font-size:1.8rem;margin-bottom:2px">{icon}</div>
        <div style="font-size:1.6rem;font-weight:700;color:{COLORS['text']}">{value}</div>
        <div style="font-size:0.8rem;color:{COLORS['text_muted']};margin-top:4px">{label}</div>
        {delta_html}
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def stat_card_row(cards: list[dict]):
    """Row of stat cards. cards = [{"label": ..., "value": ..., "icon": ...}, ...]"""
    cols = st.columns(len(cards))
    for col, card in zip(cols, cards):
        with col:
            stat_card(
                label=card.get("label", ""),
                value=card.get("value", ""),
                icon=card.get("icon", ""),
                delta=card.get("delta", ""),
            )
