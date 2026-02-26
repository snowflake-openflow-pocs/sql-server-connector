import os
import json
import asyncio
import pymssql
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SQL_HOST = os.getenv("SQL_HOST", "localhost")
SQL_PORT = int(os.getenv("SQL_PORT", "1433"))
SQL_USER = os.getenv("SQL_USER", "sa")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "")


def get_conn(database: str):
    return pymssql.connect(
        server=SQL_HOST,
        port=SQL_PORT,
        user=SQL_USER,
        password=SQL_PASSWORD,
        database=database,
    )


def get_stats():
    result = {}
    
    try:
        conn = get_conn("RetailAnalyticsDB")
        cursor = conn.cursor()
        counts = {}
        for table in ["Distributors", "Products", "SalesTransactions", "AuditLog"]:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cursor.fetchone()[0]
        result["RetailAnalyticsDB"] = counts
        conn.close()
    except Exception as e:
        result["RetailAnalyticsDB"] = {"error": str(e)}
    
    try:
        conn = get_conn("ConfigDB")
        cursor = conn.cursor()
        counts = {}
        for table in ["Customers", "Categories", "ReportingPeriods"]:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cursor.fetchone()[0]
        result["ConfigDB"] = counts
        conn.close()
    except Exception as e:
        result["ConfigDB"] = {"error": str(e)}
    
    return result


async def stats_generator():
    """Yields SSE events when database stats change."""
    last_stats = {}
    while True:
        try:
            current = get_stats()
            if current != last_stats:
                last_stats = current.copy()
                yield f"data: {json.dumps(current)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        await asyncio.sleep(0.5)


@app.get("/events")
async def sse_endpoint():
    return StreamingResponse(
        stats_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
def health():
    return {"status": "ok"}
