# Basic Usage

This guide shows how to quickly integrate RDCP SDK with your application across all supported frameworks.

## Quick Start (Express)

The fastest way to get RDCP endpoints working:

```javascript
const express = require('express')
const { adapters, auth } = require('@rdcp/server')

const app = express()
app.use(express.json())

// Add RDCP middleware with built-in authentication
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

app.use(rdcpMiddleware)
app.listen(3000)

console.log('✅ RDCP endpoints available at:')
console.log('  GET  /.well-known/rdcp')
console.log('  GET  /rdcp/v1/discovery')
console.log('  POST /rdcp/v1/control')
console.log('  GET  /rdcp/v1/status') 
console.log('  GET  /rdcp/v1/health')
```

## Framework Examples

### Express.js

```javascript
const express = require('express')
const { adapters, auth } = require('@rdcp/server')

const app = express()
app.use(express.json())

// Create RDCP middleware with configuration
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    QUERIES: false,
    REPORTS: true,
    CACHE: false
  }
})

app.use(rdcpMiddleware)

// Your application routes
app.get('/', (req, res) => {
  res.json({ message: 'Express app with RDCP support' })
})

app.listen(3000, () => {
  console.log('Express server with RDCP running on port 3000')
})
```

### Fastify

```javascript
const Fastify = require('fastify')
const { adapters, auth } = require('@rdcp/server')

const fastify = Fastify({ logger: true })

// Register RDCP plugin
await fastify.register(adapters.fastify.createRDCPPlugin({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true
  }
}))

// Your application routes
fastify.get('/', async (request, reply) => {
  return { message: 'Fastify app with RDCP support' }
})

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Fastify server with RDCP running on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

### Koa

```javascript
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const { adapters, auth } = require('@rdcp/server')

const app = new Koa()

// Add body parsing middleware
app.use(bodyParser())

// Add RDCP middleware
const rdcpMiddleware = adapters.koa.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,
    QUERIES: true,
    CACHE: false
  }
})

app.use(rdcpMiddleware)

// Your application middleware
app.use(async (ctx) => {
  if (ctx.path === '/') {
    ctx.body = { message: 'Koa app with RDCP support' }
  }
})

app.listen(3000, () => {
  console.log('Koa server with RDCP running on port 3000')
})
```

### Next.js (App Router)

```javascript
// app/api/rdcp/[...rdcp]/route.js
import { adapters, auth } from '@rdcp/server'

const rdcpHandler = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    REPORTS: false
  }
})

export async function GET(request, { params }) {
  return rdcpHandler(request, new Response(), () => {})
}

export async function POST(request, { params }) {
  return rdcpHandler(request, new Response(), () => {})
}
```

Alternative Next.js setup using individual route files:

```javascript
// app/.well-known/rdcp/route.js
export async function GET() {
  return Response.json({
    protocol: 'rdcp/1.0',
    endpoints: {
      discovery: '/rdcp/v1/discovery',
      control: '/rdcp/v1/control', 
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health'
    },
    capabilities: {
      multiTenancy: false,
      performanceMetrics: true,
      temporaryControls: false,
      auditTrail: false
    },
    security: {
      level: 'basic',
      methods: ['api-key'],
      scopes: ['discovery', 'status', 'control'],
      required: true
    }
  })
}
```

## Environment Configuration

Set your API key before starting:

```bash
export RDCP_API_KEY="your-secure-32-plus-character-api-key-here"
```

Or create a `.env` file:

```bash
# .env
RDCP_API_KEY="your-secure-32-plus-character-api-key-here"
NODE_ENV="development"
```

## Testing Your Setup

### 1. Test Protocol Discovery (No Auth Required)

```bash
curl http://localhost:3000/.well-known/rdcp
```

Expected response:
```json
{
  "protocol": "rdcp/1.0",
  "endpoints": {
    "discovery": "/rdcp/v1/discovery",
    "control": "/rdcp/v1/control",
    "status": "/rdcp/v1/status", 
    "health": "/rdcp/v1/health"
  },
  "capabilities": {
    "multiTenancy": false,
    "performanceMetrics": true,
    "temporaryControls": false,
    "auditTrail": false
  },
  "security": {
    "level": "basic",
    "methods": ["api-key"],
    "scopes": ["discovery", "status", "control"],
    "required": true
  }
}
```

### 2. Test Authenticated Endpoint

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: test-client" \
     http://localhost:3000/rdcp/v1/status
```

### 3. Test Debug Control

```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: test-client" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["DATABASE","API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/control
```

### 4. Test Health Check

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: test-client" \
     http://localhost:3000/rdcp/v1/health
```

## Configuration Options

All framework adapters accept the same configuration options:

```javascript
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  // ✅ REQUIRED: Authentication function
  authenticator: auth.validateRDCPAuth,
  
  // ✅ OPTIONAL: Debug categories (default: all false)
  debugConfig: {
    DATABASE: false,      // Database operations
    API_ROUTES: true,     // HTTP request/response  
    QUERIES: false,       // SQL and data queries
    REPORTS: true,        // Report generation
    CACHE: false,         // Cache operations
    AUTH: false,          // Authentication flows
    INTEGRATIONS: true    // Third-party services
  },
  
  // ✅ OPTIONAL: Custom base path (default: '/rdcp/v1')
  basePath: '/api/debug/v1',
  
  // ✅ OPTIONAL: Performance monitoring
  performance: {
    enableMetrics: true,
    sampleRate: 0.1,
    trackMemory: true
  },
  
  // ✅ OPTIONAL: Multi-tenancy configuration
  tenant: {
    multiTenancy: false,
    isolationLevel: 'global'
  }
})
```

## Debug Categories

The SDK supports these standard debug categories:

| Category | Description | Default |
|----------|-------------|---------|
| `DATABASE` | Database operations and connections | `false` |
| `API_ROUTES` | HTTP request/response handling | `false` |
| `QUERIES` | SQL and data query execution | `false` |
| `REPORTS` | Report generation and processing | `false` |
| `CACHE` | Cache operations and performance | `false` |
| `AUTH` | Authentication and authorization | `false` |
| `INTEGRATIONS` | Third-party service integrations | `false` |

## Error Handling

The SDK returns standard RDCP error responses:

```json
{
  "error": {
    "code": "RDCP_AUTH_REQUIRED",
    "message": "Authentication required",
    "protocol": "rdcp/1.0"
  }
}
```

Standard error codes:
- `RDCP_AUTH_REQUIRED` (401) - Authentication required
- `RDCP_FORBIDDEN` (403) - Insufficient permissions
- `RDCP_VALIDATION_ERROR` (400) - Request validation failed
- `RDCP_NOT_FOUND` (404) - Resource not found
- `RDCP_INTERNAL_ERROR` (500) - Internal server error

## Next Steps

- **[Authentication Setup](Authentication-Setup)** - Configure security levels and multi-tenancy
- **[Express Integration](Basic-Usage#express-js)** - Advanced Express.js configuration
- **[Fastify Integration](Basic-Usage#fastify)** - Advanced Fastify configuration  
- **[Koa Integration](Basic-Usage#koa)** - Advanced Koa configuration
- **[Next.js Integration](Basic-Usage#next-js)** - Advanced Next.js configuration
- **[Client SDK](AI-Agent-Quick-Reference)** - Use the client SDK to consume RDCP endpoints

Also see:
- **[RDCP Demo App](examples/RDCP-Demo-App)** - One-command local demo (in-memory Jaeger)
- **[Trace Propagation Demo](examples/Trace-Propagation-Demo)** - Cross-service tracing
- **[AI Agent Quick Reference](AI-Agent-Quick-Reference)** - Copy/paste integration guide
