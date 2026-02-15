#!/bin/bash

# Startup script for SQL Server container
# Waits for SQL Server to be ready, then executes init.sql

set -e

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &
SQLSERVER_PID=$!

# Wait for SQL Server to be ready (max 60 seconds)
echo "Waiting for SQL Server to start..."
for i in {1..60}; do
    if /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -Q "SELECT 1" &> /dev/null; then
        echo "SQL Server is ready!"
        break
    fi
    echo "Waiting... ($i/60)"
    sleep 1
done

# Check if SQL Server is actually ready
if ! /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -Q "SELECT 1" &> /dev/null; then
    echo "ERROR: SQL Server did not start in time"
    kill $SQLSERVER_PID || true
    exit 1
fi

# Run initialization script
echo "Running initialization script..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -i /var/opt/mssql/init.sql

echo "Initialization complete!"

# Keep container running
wait $SQLSERVER_PID
