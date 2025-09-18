#!/bin/bash
# start-demo.sh - One-command RDCP demo startup
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting RDCP Trace Propagation Demo${NC}"
echo "========================================"
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Check port availability
echo "🔍 Checking port availability..."
for port in 3000 3001 4318 16686; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. Please stop the service using this port.${NC}"
        echo "   To see what's using port $port: lsof -i :$port"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required ports are available${NC}"
echo ""

# Start services
echo "🐳 Building and starting Docker services..."
echo "This may take a few minutes on first run..."
echo ""

# Use docker compose if available, fallback to docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Start services
$DOCKER_COMPOSE up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for services with timeout
timeout=120  # 2 minutes
counter=0

# Check Jaeger
while ! curl -sf http://localhost:16686 > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for Jaeger UI${NC}"
        echo "Check logs: $DOCKER_COMPOSE logs jaeger"
        exit 1
    fi
    sleep 2
    ((counter+=2))
    if [ $((counter % 20)) -eq 0 ]; then
        echo "   Still waiting for Jaeger... (${counter}s)"
    fi
done

# Check RDCP Demo App
while ! curl -sf http://localhost:3000/.well-known/rdcp > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for RDCP Demo App${NC}"
        echo "Check logs: $DOCKER_COMPOSE logs rdcp-demo-app"
        exit 1
    fi
    sleep 2
    ((counter+=2))
done

# Check Upstream Service
while ! curl -sf http://localhost:3001/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for Upstream Service${NC}"
        echo "Check logs: $DOCKER_COMPOSE logs upstream-service"
        exit 1
    fi
    sleep 2
    ((counter+=2))
done

echo -e "${GREEN}✅ All services are healthy and ready!${NC}"
echo ""

# Service information
echo "🎉 RDCP Demo is running!"
echo "======================="
echo ""
echo -e "${BLUE}📊 Access Points:${NC}"
echo "   Jaeger UI:       http://localhost:16686"
echo "   RDCP Demo App:   http://localhost:3000" 
echo "   Upstream Service: http://localhost:3001"
echo "   Prometheus:      http://localhost:3000/metrics"
echo ""

echo -e "${BLUE}🧪 Test Commands:${NC}"
echo "   # Authorized (expect 200,200,200)"
echo "   curl http://localhost:3001/api/demo/multi-call-auth | jq '.calls[].status'"
echo ""
echo "   # Unauthorized (expect 200,401,401 - shows security working!)"
echo "   curl http://localhost:3001/api/demo/multi-call | jq '.calls[].status'"
echo ""
echo "   # Discovery (expect single 200)"
echo "   curl http://localhost:3001/api/demo/rdcp-discovery | jq '.downstream.statusCode'"
echo ""

echo -e "${BLUE}🔧 Management:${NC}"
echo "   View logs:    $DOCKER_COMPOSE logs -f"
echo "   Stop demo:    $DOCKER_COMPOSE down"
echo "   Run tests:    ./scripts/test-traces.sh"
echo ""

echo -e "${GREEN}💡 Next Steps:${NC}"
echo "1. Open Jaeger UI: http://localhost:16686"
echo "2. Run test commands above to generate traces"
echo "3. In Jaeger, select services: upstream-service, rdcp-demo-app"
echo "4. Click 'Find Traces' to see distributed tracing in action!"
echo ""
echo -e "${YELLOW}Note: 401 errors in traces are expected - they demonstrate RDCP security working correctly!${NC}"