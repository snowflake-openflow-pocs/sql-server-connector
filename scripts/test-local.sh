#!/bin/bash

# test-local.sh
# Start docker-compose with health check wait
# Waits for SQL Server to be ready before reporting success

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SQL Server POC - Local Docker Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
fi

# Start services
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}Waiting for SQL Server to be healthy (~60 seconds)...${NC}"

# Wait for SQL Server health check
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    # Check if sqlserver container health status is healthy
    HEALTH_STATUS=$(docker-compose ps sqlserver --format='{{json .}}' | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    if [ "$HEALTH_STATUS" = "running" ]; then
        # Double-check with a direct SQL query
        if docker-compose exec -T sqlserver /opt/mssql-tools/bin/sqlcmd \
            -S localhost -U sa -P "$(grep SA_PASSWORD .env | cut -d= -f2)" \
            -Q "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✓ SQL Server is healthy and ready!${NC}"
            break
        fi
    fi
    
    echo -ne "\rWaiting... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}✗ SQL Server did not become healthy after $MAX_ATTEMPTS seconds${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check SQL Server logs: docker-compose logs sqlserver"
    echo "  2. Ensure port 1433 is available: lsof -i :1433"
    echo "  3. Ensure Docker Desktop has 4GB+ memory allocated"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All services are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Display connection information
SA_PASSWORD=$(grep SA_PASSWORD .env | cut -d= -f2)

echo "Connection Information:"
echo "  Host: localhost"
echo "  Port: 1433"
echo "  Database: DemoDB"
echo "  User: sa"
echo "  Password: $SA_PASSWORD"
echo ""

echo "Available endpoints:"
echo "  • SQL Server: localhost:1433"
echo "  • Streamlit Dashboard: http://localhost:8501"
echo ""

echo "Next steps:"
echo "  1. Open Streamlit dashboard in your browser:"
echo "     open http://localhost:8501"
echo ""
echo "  2. Go to Setup page to verify database is healthy"
echo ""
echo "  3. Go to Simulator page to start data generation"
echo ""
echo "  4. Go to Monitor page to watch changes in real-time"
echo ""

echo "Useful commands:"
echo "  • View logs: docker-compose logs -f <service>"
echo "  • Stop services: docker-compose down"
echo "  • Cleanup volumes: docker-compose down -v"
echo "  • View containers: docker-compose ps"
echo ""

# Optional: Open Streamlit in browser
if command -v open &> /dev/null; then
    read -p "Open Streamlit dashboard now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sleep 2  # Give Streamlit a moment to start
        open http://localhost:8501
    fi
fi
