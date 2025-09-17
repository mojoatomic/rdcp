# RDCP Framework Adapters

This directory contains framework-specific adapters for integrating RDCP server functionality with popular Node.js web frameworks.

## Available Adapters

### Express Adapter (`express.js`)
- **Signature**: Standard Express middleware `(req, res, next)`
- **Functions**:
  - `createRDCPMiddleware(options)` - Creates Express middleware
  - `createRDCPRouter(options)` - Creates Express router with RDCP routes
  - `createRDCPErrorHandler()` - Error handler for RDCP-specific errors

### Fastify Adapter (`fastify.js`)
- **Signature**: Fastify preHandler pattern `(request, reply)`
- **Functions**:
  - `createRDCPMiddleware(options)` - Creates Fastify middleware
  - `createRDCPPlugin(options)` - Creates Fastify plugin for registration

### Koa Adapter (`koa.js`)
- **Signature**: Koa async middleware pattern `(ctx, next)`
- **Functions**:
  - `createRDCPMiddleware(options)` - Creates Koa middleware
  - `createRDCPMiddlewareWithErrorBoundary(options)` - With additional error handling

## Common Configuration Options

All adapters accept the same configuration options:

```javascript
{
  authenticator: Function,        // Required: (request) => Promise<boolean>
  debugConfig: Object,           // Debug configuration
  basePath: String,              // Default: '/rdcp/v1'
  performance: Object,           // Performance settings
  tenant: Object                 // Multi-tenancy configuration
}
```

## Usage Examples

### Express Usage
```javascript
const express = require('express')
const { basicApiKeyAuth } = require('../../auth/basic.js')
const { express: expressAdapter } = require('./index.js')

const app = express()
app.use(express.json())

const authenticator = basicApiKeyAuth({
  apiKey: process.env.RDCP_API_KEY
})

const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
  authenticator,
  debugConfig: { categories: ['DATABASE', 'API_ROUTES'], enabled: true }
})

app.use(rdcpMiddleware)
```

### Fastify Usage
```javascript
const fastify = require('fastify')({ logger: true })
const { basicApiKeyAuth } = require('../../auth/basic.js')
const { fastify: fastifyAdapter } = require('./index.js')

const authenticator = (request) => {
  return basicApiKeyAuth({ apiKey: process.env.RDCP_API_KEY })(request)
}

const rdcpPlugin = fastifyAdapter.createRDCPPlugin({
  authenticator,
  debugConfig: { categories: ['CACHE', 'INTEGRATIONS'], enabled: true }
})

await fastify.register(rdcpPlugin)
```

### Koa Usage
```javascript
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const { basicApiKeyAuth } = require('../../auth/basic.js')
const { koa: koaAdapter } = require('./index.js')

const app = new Koa()
app.use(bodyParser())

const authenticator = (ctx) => {
  const requestLike = { headers: ctx.headers, get: (h) => ctx.get(h) }
  return basicApiKeyAuth({ apiKey: process.env.RDCP_API_KEY })(requestLike)
}

const rdcpMiddleware = koaAdapter.createRDCPMiddlewareWithErrorBoundary({
  authenticator,
  debugConfig: { categories: ['AUTH', 'REPORTS'], enabled: true }
})

app.use(rdcpMiddleware)
```

## RDCP Endpoints Handled

All adapters handle these RDCP v1.0 endpoints:

- `/.well-known/rdcp` - Discovery endpoint (no authentication)
- `/rdcp/v1/discovery` - Authenticated discovery
- `/rdcp/v1/control` - Debug control operations (POST only)
- `/rdcp/v1/status` - Current debug status
- `/rdcp/v1/health` - Health check

## Authentication Integration

Adapters work with all RDCP authentication levels:

- **Basic**: API key authentication via `basicApiKeyAuth`
- **Standard**: JWT Bearer tokens via `standardJWTAuth`
- **Enterprise**: mTLS authentication via `enterpriseMTLSAuth`

## Multi-Tenancy Support

All adapters support multi-tenant headers:

- `X-RDCP-Tenant-ID` - Tenant identifier
- `X-RDCP-Isolation-Level` - Isolation level (`global`, `process`, `namespace`, `organization`)

## Error Handling

Each adapter provides consistent RDCP error responses:

```javascript
{
  error: {
    code: 'RDCP_ERROR_CODE',
    message: 'Human-readable message',
    protocol: 'rdcp/1.0'
  }
}
```

## Performance Considerations

- Adapters only process requests to RDCP endpoints
- Authentication is cached per request
- Minimal overhead for non-RDCP requests
- Framework-specific optimizations applied

## File Structure

```
src/server/adapters/
├── index.js          # Exports all adapters
├── express.js        # Express middleware adapter
├── fastify.js        # Fastify plugin/middleware adapter  
├── koa.js           # Koa async middleware adapter
└── README.md        # This documentation
```

## Framework Compatibility

- **Express**: v4.x and v5.x
- **Fastify**: v4.x and v5.x  
- **Koa**: v2.x with async/await support

Each adapter follows framework-specific conventions and best practices while maintaining consistent RDCP protocol compliance.