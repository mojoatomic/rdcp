# RDCP Demo App - Docker Distribution

**Complete RDCP + OpenTelemetry + Jaeger stack in Docker**

This Docker Compose setup provides a fully functional RDCP demonstration with:
- **Jaeger All-in-One** (latest official image from Docker Hub)
- **RDCP Demo App** (downstream service with RDCP endpoints)
- **Upstream Service** (demonstrates trace propagation)
- **Complete observability** with distributed tracing

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 3000, 3001, 4318, 16686 available

### 1. One-Command Setup

```bash
# Clone and start everything
git clone <repo-url>
cd packages/rdcp-demo-app
docker compose up --build
```

### 2. Access Services

- **Jaeger UI**: http://localhost:16686
- **RDCP Demo App**: http://localhost:3000
- **Upstream Service**: http://localhost:3001

### 3. Generate Traces

```bash
# Unauthorized variant (shows 401 auth failures - expected behavior)
curl http://localhost:3001/api/demo/multi-call

# Authorized variant (all requests succeed)
curl http://localhost:3001/api/demo/multi-call-auth

# Simple discovery trace
curl http://localhost:3001/api/demo/rdcp-discovery
```

### 4. View Traces in Jaeger

1. Open http://localhost:16686
2. Select Services: `upstream-service` and `rdcp-demo-app`
3. Click "Find Traces"
4. Click on any trace to see detailed spans

## Architecture

```
┌─────────────────┐    HTTP     ┌─────────────────┐
│ upstream-service│────────────▶│ rdcp-demo-app   │
│ :3001           │◀────────────│ :3000           │
└─────────────────┘             └─────────────────┘
         │                               │
         └──────── Traces ───────────────┘
                      │
            ┌─────────▼─────────┐
            │ Jaeger All-in-One │
            │ :16686 UI         │
            │ :4318 OTLP        │
            └───────────────────┘
```

## What This Demonstrates

### ✅ RDCP Protocol Compliance
- **Discovery endpoint**: `/.well-known/rdcp`
- **Control operations**: `/rdcp/v1/control`
- **Status monitoring**: `/rdcp/v1/status`
- **Health checks**: `/rdcp/v1/health`
- **Authentication**: Basic, Standard, Enterprise levels

### ✅ Distributed Tracing
- **W3C Trace Context** propagation between services
- **Parent-child span relationships** in Jaeger
- **Error tracing** with detailed HTTP status codes
- **Performance monitoring** with request timing

### ✅ Production Patterns
- **Authentication boundaries** (401 errors are expected!)
- **Service health checks** and graceful startup
- **Prometheus metrics** at `/metrics`
- **Structured logging** with correlation IDs

## Expected Behavior

### 🚨 **401 Errors Are Expected!**

The demo includes two test scenarios:

**Unauthorized Multi-Call** (`/api/demo/multi-call`):
- Expected: `[200, 401, 401]` - Shows RDCP security working correctly

**Authorized Multi-Call** (`/api/demo/multi-call-auth`):  
- Expected: `[200, 200, 200]` - Shows authentication success

### Trace Examples

**Successful Authorization**:
```
upstream-service: GET /api/demo/multi-call-auth (7.23ms)
├── GET /.well-known/rdcp → 200 ✅
├── GET /rdcp/v1/health → 200 ✅ (with auth headers)
└── GET /rdcp/v1/status → 200 ✅ (with auth headers)
```

**Security Validation**:
```
upstream-service: GET /api/demo/multi-call (6.27ms)
├── GET /.well-known/rdcp → 200 ✅ (public endpoint)
├── GET /rdcp/v1/health → 401 ✅ (protected, no auth)
└── GET /rdcp/v1/status → 401 ✅ (protected, no auth)
```

## Management Commands

### Build and Start
```bash
# Build and start all services
docker compose up --build

# Start in background
docker compose up -d --build

# View logs
docker compose logs -f
```

### Health Checks
```bash
# Check all services are healthy
docker compose ps

# Check individual service health
curl http://localhost:3001/health
curl http://localhost:3000/.well-known/rdcp
```

### Debugging
```bash
# View service logs
docker compose logs rdcp-demo-app
docker compose logs upstream-service
docker compose logs jaeger

# Restart specific service
docker compose restart rdcp-demo-app
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Remove images and volumes
docker compose down --rmi all --volumes
```

## Environment Variables

### RDCP Authentication
```bash
# Set custom API key (32+ characters required)
export RDCP_API_KEY="your-secure-api-key-minimum-32-chars"
docker compose up
```

### OpenTelemetry Configuration
```bash
# Custom OTLP endpoint (default: http://jaeger:4318)
export OTEL_EXPORTER_OTLP_ENDPOINT="http://your-collector:4318"

# Custom service names
export RDCP_SERVICE_NAME="my-rdcp-app"
export UPSTREAM_SERVICE_NAME="my-upstream"
```

## Troubleshooting

### Services Not Starting
```bash
# Check port conflicts
lsof -i :3000  # rdcp-demo-app
lsof -i :3001  # upstream-service
lsof -i :4318  # Jaeger OTLP
lsof -i :16686 # Jaeger UI

# Check Docker resources
docker system df
docker system prune  # Free up space if needed
```

### No Traces in Jaeger
1. **Wait 30 seconds** after startup for health checks
2. **Generate traces** by calling upstream endpoints
3. **Check service logs**: `docker compose logs -f`
4. **Verify OTLP connection**: Look for "OpenTelemetry started" messages

### 401 Errors in Traces
**This is expected!** The unauthorized variant demonstrates RDCP security working correctly. Use the authorized variant (`/api/demo/multi-call-auth`) to see successful authentication.

## Production Deployment

### Docker Registry Distribution
```bash
# Build and tag for distribution
docker build -t your-registry/rdcp-demo:latest .
docker push your-registry/rdcp-demo:latest

# Update docker-compose.yml
image: your-registry/rdcp-demo:latest
```

### Kubernetes Deployment
```yaml
# Example k8s deployment (not included)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rdcp-demo-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rdcp-demo-app
  template:
    metadata:
      labels:
        app: rdcp-demo-app
    spec:
      containers:
      - name: rdcp-demo-app
        image: your-registry/rdcp-demo:latest
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://jaeger-collector:4318"
```

## Performance

### Resource Usage
- **Jaeger**: ~200MB RAM, minimal CPU
- **RDCP Demo App**: ~50MB RAM, minimal CPU  
- **Upstream Service**: ~50MB RAM, minimal CPU
- **Total**: ~300MB RAM for complete stack

### Scaling
```bash
# Scale upstream service (load balancing)
docker compose up --scale upstream-service=3

# Note: Jaeger and demo app should remain single instance
```

## Integration Testing

### Automated Health Checks
```bash
#!/bin/bash
# wait-for-services.sh
set -e

echo "Waiting for services to be healthy..."

# Wait for Jaeger
until curl -f http://localhost:16686 > /dev/null 2>&1; do
  echo "Waiting for Jaeger..."
  sleep 2
done

# Wait for RDCP Demo App
until curl -f http://localhost:3000/.well-known/rdcp > /dev/null 2>&1; do
  echo "Waiting for RDCP Demo App..."
  sleep 2
done

# Wait for Upstream Service
until curl -f http://localhost:3001/health > /dev/null 2>&1; do
  echo "Waiting for Upstream Service..."
  sleep 2
done

echo "All services healthy! 🎉"
echo "Jaeger UI: http://localhost:16686"
echo "Demo endpoints: http://localhost:3001/api/demo/"
```

### E2E Test Script
```bash
#!/bin/bash
# test-traces.sh
set -e

echo "Testing trace propagation..."

# Test unauthorized variant
echo "Testing unauthorized variant..."
RESULT=$(curl -s http://localhost:3001/api/demo/multi-call | jq '.calls[].status')
echo "Unauthorized results: $RESULT"

# Test authorized variant  
echo "Testing authorized variant..."
RESULT=$(curl -s http://localhost:3001/api/demo/multi-call-auth | jq '.calls[].status')
echo "Authorized results: $RESULT"

echo "✅ Trace propagation tests completed"
echo "View traces at: http://localhost:16686"
```

---

## Related Documentation
- [Trace Propagation Demo](../../wiki/examples/Trace-Propagation-Demo.md)
- [RDCP Demo App](../../wiki/examples/RDCP-Demo-App.md)
- [Authentication Setup](../../wiki/Authentication-Setup.md)