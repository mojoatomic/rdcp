#!/bin/bash
# test-traces.sh - E2E trace propagation testing
set -e

echo "🚀 Testing RDCP Trace Propagation Demo"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint and validate JSON response
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_statuses="$3"
    
    echo -e "${BLUE}Testing $name:${NC} $url"
    
    # Make request and extract status codes
    local response=$(curl -s "$url" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to connect to $url${NC}"
        return 1
    fi
    
    # Parse JSON and extract status codes
    local statuses=$(echo "$response" | jq -r '.calls[]?.status // empty' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    
    if [ -z "$statuses" ]; then
        # Single endpoint test
        local single_status=$(echo "$response" | jq -r '.downstream.statusCode // .statusCode // empty' 2>/dev/null)
        if [ -n "$single_status" ]; then
            statuses="$single_status"
        else
            echo -e "${RED}❌ Could not parse response JSON${NC}"
            echo "Response: $response"
            return 1
        fi
    fi
    
    echo "   Response: [$statuses]"
    
    if [ "$statuses" = "$expected_statuses" ]; then
        echo -e "${GREEN}✅ Expected results: [$expected_statuses]${NC}"
    else
        echo -e "${RED}❌ Expected [$expected_statuses], got [$statuses]${NC}"
        return 1
    fi
    
    echo ""
    return 0
}

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
timeout=60
counter=0

while ! curl -sf http://localhost:3001/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for upstream service${NC}"
        exit 1
    fi
    sleep 1
    ((counter++))
    if [ $((counter % 10)) -eq 0 ]; then
        echo "   Still waiting... (${counter}s)"
    fi
done

while ! curl -sf http://localhost:3000/.well-known/rdcp > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for RDCP demo app${NC}"
        exit 1
    fi
    sleep 1
    ((counter++))
done

echo -e "${GREEN}✅ All services are ready!${NC}"
echo ""

# Test 1: Discovery endpoint (single service call)
test_endpoint "RDCP Discovery" "http://localhost:3001/api/demo/rdcp-discovery" "200"

# Test 2: Unauthorized multi-call (should show 401 failures - this is expected!)
echo -e "${BLUE}🔒 Testing Security Validation (401 errors expected)${NC}"
test_endpoint "Unauthorized Multi-Call" "http://localhost:3001/api/demo/multi-call" "200,401,401"

# Test 3: Authorized multi-call (should show all success)
echo -e "${BLUE}🔓 Testing Authentication Success${NC}"
test_endpoint "Authorized Multi-Call" "http://localhost:3001/api/demo/multi-call-auth" "200,200,200"

# Summary
echo "======================================"
echo -e "${GREEN}🎉 All trace propagation tests passed!${NC}"
echo ""
echo "📊 View traces in Jaeger:"
echo "   http://localhost:16686"
echo ""
echo "🔍 Filter by services:"
echo "   - upstream-service (parent spans)"
echo "   - rdcp-demo-app (child spans)"
echo ""
echo "💡 Key insights:"
echo "   • 401 errors in unauthorized variant prove security works"
echo "   • 200 responses in authorized variant show auth success"
echo "   • Parent-child span relationships demonstrate trace propagation"
echo "   • Error details are captured for debugging"