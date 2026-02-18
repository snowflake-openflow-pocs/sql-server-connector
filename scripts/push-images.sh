#!/bin/bash

# push-images.sh
# Build and push Docker images to Snowflake registry
# Usage: ./scripts/push-images.sh <registry-url>
# Example: ./scripts/push-images.sh us-east1-docker.pkg.dev/my-project/snowflake-abc123

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Registry URL is required${NC}"
    echo ""
    echo "Usage: $0 <registry-url>"
    echo ""
    echo "Example:"
    echo "  $0 us-east1-docker.pkg.dev/my-project/snowflake-abc123"
    echo ""
    echo "To find your registry URL:"
    echo "  1. In Snowflake, run: DESCRIBE IMAGE REPOSITORY CDC_DEMO.PUBLIC.IMAGES"
    echo "  2. Copy the 'repository_url' value (without the image name)"
    exit 1
fi

REGISTRY_URL=$1

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SQL Server Openflow POC - Image Builder${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Registry URL: ${GREEN}$REGISTRY_URL${NC}"
echo ""

# ============================================================================
# Build Images
# ============================================================================

echo -e "${YELLOW}[1/2] Building SQL Server image...${NC}"
docker build \
    -t "${REGISTRY_URL}/sqlserver:latest" \
    -f containers/sqlserver/Dockerfile \
    containers/sqlserver/

echo -e "${GREEN}✓ SQL Server image built${NC}"
echo ""

echo -e "${YELLOW}[2/2] Building Streamlit image...${NC}"
docker build \
    -t "${REGISTRY_URL}/streamlit:latest" \
    -f containers/streamlit/Dockerfile \
    containers/streamlit/

echo -e "${GREEN}✓ Streamlit image built${NC}"
echo ""

# ============================================================================
# Push Images to Registry
# ============================================================================

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Pushing images to Snowflake registry...${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}[1/2] Pushing SQL Server image...${NC}"
docker push "${REGISTRY_URL}/sqlserver:latest"
echo -e "${GREEN}✓ SQL Server image pushed${NC}"
echo ""

echo -e "${YELLOW}[2/2] Pushing Streamlit image...${NC}"
docker push "${REGISTRY_URL}/streamlit:latest"
echo -e "${GREEN}✓ Streamlit image pushed${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All images pushed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Update setup/02-create-service.sql with your registry URL:"
echo "   Replace <YOUR_REGISTRY_URL> with: ${REGISTRY_URL}"
echo ""
echo "2. Deploy the service:"
echo "   snow sql -c <connection> -f setup/02-create-service.sql"
echo ""
echo "3. Verify the service is running:"
echo "   snow sql -c <connection> -q \"DESCRIBE SERVICE CDC_DEMO.PUBLIC.CDC_DEMO_SERVICE\""
echo ""
echo "4. Access the Streamlit dashboard:"
echo "   Check the public endpoint from: SELECT SYSTEM\$LIST_ENDPOINTS(...)"
echo ""
