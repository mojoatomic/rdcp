# Migration Guide

This guide shows how to migrate from manual RDCP endpoint implementation to the RDCP SDK, reducing code complexity and ensuring protocol compliance.

## Why Migrate to the SDK?

### Before: Manual Implementation (50+ lines)

```javascript
// Manual RDCP implementation - error-prone and verbose
app.get('/.well-known/rdcp', (req, res) => {
  res.json({
    protocol: 'rdcp/1.0',
    endpoints: {
      discovery: '/rdcp/v1/discovery',
      control: '/rdcp/v1/control',
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health'
    },
    capabilities: { /* ... */ },
    security: { /* ... */ }
  })
})

app.get('/rdcp/v1/discovery', authenticateRDCP, (req, res) => {
  // Manual discovery logic...
  const categories = Object.keys(DEBUG_CONFIG).map(id => ({
    id,
    enabled: DEBUG_CONFIG[id],
    description: `Debug logging for ${id}`,
    // Missing: proper metrics, timestamps, protocol compliance
  }))
  res.json({ protocol: 'rdcp/1.0', categories })
})

app.post('/rdcp/v1/control', authenticateRDCP, validateRequest, (req, res) => {
  // Manual control logic with validation, error handling, audit trail...
  // 40+ more lines of boilerplate code
})

// ... 3 more endpoints with similar complexity
```

### After: SDK Implementation (5 lines)

```javascript
// SDK implementation - protocol compliant and maintainable
const { adapters, auth } = require('@rdcp/server')

const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})
app.use(rdcpMiddleware)

// ✅ All 5 RDCP endpoints work automatically with full protocol compliance
```

## Migration Process

### Step 1: Install the SDK

```bash
npm install @rdcp/server
```

### Step 2: Identify Your Current Implementation

Look for these patterns in your existing code:

```javascript
// Protocol discovery endpoint
app.get('/.well-known/rdcp', ...)

// RDCP v1 endpoints
app.get('/rdcp/v1/discovery', ...)
app.post('/rdcp/v1/control', ...)
app.get('/rdcp/v1/status', ...)
app.get('/rdcp/v1/health', ...)

// Custom authentication middleware
function authenticateRDCP(req, res, next) { ... }

// Debug configuration object
const DEBUG_CONFIG = { ... }
```

### Step 3: Preserve Your Configuration

Extract your debug configuration and authentication logic:

```javascript
// Before migration - identify these patterns
const DEBUG_CONFIG = {
  DATABASE: false,
  API_ROUTES: true,
  QUERIES: false,
  REPORTS: true,
  CACHE: false
}

function authenticateRDCP(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (apiKey === process.env.RDCP_API_KEY) {
    next()
  } else {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
```

### Step 4: Remove Manual Endpoints

Remove all manual RDCP endpoint implementations:

```javascript
// REMOVE these manual implementations
app.get('/.well-known/rdcp', ...) // Remove
app.get('/rdcp/v1/discovery', ...) // Remove  
app.post('/rdcp/v1/control', ...) // Remove
app.get('/rdcp/v1/status', ...) // Remove
app.get('/rdcp/v1/health', ...) // Remove
```

### Step 5: Add SDK Middleware

Replace all manual endpoints with SDK middleware:

```javascript
const { adapters, auth } = require('@rdcp/server')

// Use your existing debug configuration
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth, // Or your custom auth function
  debugConfig: DEBUG_CONFIG // Your existing configuration
})

app.use(rdcpMiddleware)
```

## Framework-Specific Migrations

### Express.js Migration

**Before (Manual):**
```javascript
const express = require('express')
const app = express()

// Manual RDCP endpoints
app.get('/.well-known/rdcp', (req, res) => {
  res.json({ protocol: 'rdcp/1.0', /* ... */ })
})

app.get('/rdcp/v1/discovery', authenticateRDCP, (req, res) => {
  // Manual implementation
})

app.post('/rdcp/v1/control', authenticateRDCP, (req, res) => {
  // Manual implementation  
})

// ... more manual endpoints
```

**After (SDK):**
```javascript
const express = require('express')
const { adapters, auth } = require('@rdcp/server')

const app = express()
app.use(express.json())

// Replace all manual endpoints with SDK middleware
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    QUERIES: false
  }
})

app.use(rdcpMiddleware)
```

### Fastify Migration

**Before (Manual):**
```javascript
const fastify = Fastify()

fastify.get('/.well-known/rdcp', async (request, reply) => {
  return { protocol: 'rdcp/1.0', /* ... */ }
})

fastify.addHook('preHandler', authenticateRDCP)
fastify.get('/rdcp/v1/discovery', async (request, reply) => {
  // Manual implementation
})

// ... more manual endpoints
```

**After (SDK):**
```javascript
const Fastify = require('fastify')
const { adapters, auth } = require('@rdcp/server')

const fastify = Fastify()

// Replace manual endpoints with SDK plugin
await fastify.register(adapters.fastify.createRDCPPlugin({
  authenticator: auth.validateRDCPAuth
}))
```

### Koa Migration

**Before (Manual):**
```javascript
const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

router.get('/.well-known/rdcp', async (ctx) => {
  ctx.body = { protocol: 'rdcp/1.0', /* ... */ }
})

router.get('/rdcp/v1/discovery', authenticateRDCP, async (ctx) => {
  // Manual implementation
})

// ... more manual endpoints
app.use(router.routes())
```

**After (SDK):**
```javascript
const Koa = require('koa')
const { adapters, auth } = require('@rdcp/server')

const app = new Koa()

// Replace manual routes with SDK middleware
const rdcpMiddleware = adapters.koa.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

app.use(rdcpMiddleware)
```

### Next.js Migration

**Before (Manual - Pages Router):**
```javascript
// pages/api/.well-known/rdcp.js
export default function handler(req, res) {
  res.json({ protocol: 'rdcp/1.0', /* ... */ })
}

// pages/api/rdcp/v1/discovery.js  
export default function handler(req, res) {
  // Manual authentication
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // Manual implementation
}

// ... 3 more endpoint files
```

**After (SDK - App Router):**
```javascript
// app/api/rdcp/[...rdcp]/route.js
import { adapters, auth } from '@rdcp/server'

const rdcpHandler = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

export async function GET(request) {
  return rdcpHandler(request, new Response(), () => {})
}

export async function POST(request) {
  return rdcpHandler(request, new Response(), () => {})
}

// ✅ One file replaces 5 manual endpoint files
```

## Authentication Migration

### Basic API Key Migration

**Before (Manual Auth):**
```javascript
function authenticateRDCP(req, res, next) {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '')
  
  if (!apiKey || apiKey !== process.env.RDCP_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized'
    })
  }
  
  next()
}
```

**After (SDK Auth):**
```javascript
const { auth } = require('@rdcp/server')

// Use built-in authentication (supports the same headers)
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

// Environment variable remains the same
// RDCP_API_KEY="your-api-key-here"
```

### Custom Authentication Migration

**Before (Custom Auth):**
```javascript
function customAuth(req, res, next) {
  // Your custom authentication logic
  const apiKey = extractApiKey(req)
  if (validateApiKey(apiKey)) {
    next()
  } else {
    res.status(401).json({ error: 'Auth failed' })
  }
}
```

**After (Custom Auth with SDK):**
```javascript
// Keep your custom logic, integrate with SDK
const customAuthenticator = async (req) => {
  const apiKey = extractApiKey(req)
  return validateApiKey(apiKey)
}

const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: customAuthenticator
})
```

## Debug Configuration Migration

### Simple Configuration Migration

**Before:**
```javascript
const DEBUG_CONFIG = {
  DATABASE: false,
  API_ROUTES: true,
  QUERIES: false
}

// Manual debug functions
function debugDatabase(message) {
  if (DEBUG_CONFIG.DATABASE) {
    console.log(`[DB] ${message}`)
  }
}
```

**After:**
```javascript
// Configuration structure remains the same
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,  // Same structure
    API_ROUTES: true,
    QUERIES: false
  }
})

// Your debug functions continue to work unchanged
```

### Advanced Configuration Migration

**Before (Complex Config):**
```javascript
const DEBUG_CONFIG = {
  DATABASE: { enabled: false, level: 'info' },
  API_ROUTES: { enabled: true, level: 'debug' },
  CACHE: { enabled: false, level: 'warn' }
}
```

**After (Simplified):**
```javascript
// SDK uses boolean values for simplicity and protocol compliance
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  debugConfig: {
    DATABASE: false,     // Convert complex config to boolean
    API_ROUTES: true,
    CACHE: false
  }
})

// If you need complex configuration, handle it in your debug functions
function debugDatabase(message, level = 'info') {
  if (DEBUG_CONFIG.DATABASE && shouldLog(level)) {
    console.log(`[DB:${level}] ${message}`)
  }
}
```

## Error Handling Migration

### Basic Error Migration

**Before (Custom Errors):**
```javascript
app.post('/rdcp/v1/control', (req, res) => {
  try {
    // Validation logic
    if (!req.body.action) {
      return res.status(400).json({ error: 'Missing action' })
    }
    // Control logic
  } catch (error) {
    res.status(500).json({ error: 'Internal error' })
  }
})
```

**After (Protocol-Compliant Errors):**
```javascript
// SDK automatically provides RDCP-compliant error responses
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

// Errors now follow RDCP protocol format:
// {
//   "error": {
//     "code": "RDCP_VALIDATION_ERROR",
//     "message": "Request validation failed",
//     "protocol": "rdcp/1.0"
//   }
// }
```

## Multi-Tenancy Migration

### Adding Multi-Tenancy

**Before (Single Tenant):**
```javascript
const DEBUG_CONFIG = {
  DATABASE: false,
  API_ROUTES: true
}
```

**After (Multi-Tenant Ready):**
```javascript
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  tenant: {
    multiTenancy: true,
    isolationLevel: 'organization'
  }
})

// Multi-tenant requests work automatically:
// curl -H "X-RDCP-Tenant-ID: org_123" \
//      -H "X-API-Key: key" \
//      http://localhost:3000/rdcp/v1/control
```

## Testing Migration

### Before (Manual Testing)

```javascript
// Test each endpoint manually
describe('RDCP Endpoints', () => {
  test('discovery endpoint', async () => {
    const response = await request(app).get('/rdcp/v1/discovery')
    expect(response.body.protocol).toBe('rdcp/1.0')
    // ... manual assertion for each field
  })
  
  test('control endpoint', async () => {
    const response = await request(app)
      .post('/rdcp/v1/control')
      .set('x-api-key', API_KEY)
      .send({ action: 'enable', categories: ['DATABASE'] })
    // ... manual assertions
  })
})
```

### After (SDK Testing)

```javascript
// SDK is fully tested - focus on your business logic
describe('RDCP Integration', () => {
  test('RDCP endpoints work', async () => {
    const response = await request(app).get('/.well-known/rdcp')
    expect(response.body.protocol).toBe('rdcp/1.0')
    // SDK handles protocol compliance automatically
  })
  
  test('debug categories control', async () => {
    // Test your specific debug configuration
    const response = await request(app)
      .post('/rdcp/v1/control')
      .set('x-api-key', process.env.RDCP_API_KEY)
      .set('x-rdcp-auth-method', 'api-key')
      .set('x-rdcp-client-id', 'test-client')
      .send({ action: 'enable', categories: ['DATABASE'] })
    
    expect(response.body.changes).toHaveLength(1)
  })
})
```

## Validation After Migration

### 1. Protocol Discovery Test

```bash
curl http://localhost:3000/.well-known/rdcp
```

Expected: Same JSON structure as before, but with guaranteed protocol compliance.

### 2. Authentication Test

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: test-client" \
     http://localhost:3000/rdcp/v1/status
```

Expected: Same authentication behavior, but with proper RDCP headers required.

### 3. Control Test

```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: test-client" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["DATABASE"]}' \
  http://localhost:3000/rdcp/v1/control
```

Expected: Same functionality with enhanced response format and audit trail.

## Benefits After Migration

### ✅ Reduced Code Complexity
- **Before**: 50+ lines of manual endpoint code
- **After**: 5 lines of SDK integration

### ✅ Protocol Compliance
- **Before**: Custom JSON responses (may not be compliant)
- **After**: Guaranteed RDCP v1.0 protocol compliance

### ✅ Enhanced Security
- **Before**: Basic authentication with potential security gaps
- **After**: All 3 RDCP security levels supported with best practices

### ✅ Better Error Handling
- **Before**: Custom error formats
- **After**: Standard RDCP error codes and responses

### ✅ Multi-Tenancy Support
- **Before**: Single tenant only
- **After**: Standard multi-tenancy with tenant isolation

### ✅ Testing Improvements
- **Before**: Manual testing of each endpoint
- **After**: SDK is fully tested, focus on business logic

### ✅ Future-Proof
- **Before**: Manual updates required for protocol changes
- **After**: SDK updates handle protocol evolution

## Common Migration Issues

### Issue 1: Custom Response Format

**Problem**: Your manual implementation returns custom response formats.

**Solution**: The SDK returns protocol-compliant responses. Update your client code to use standard RDCP response format.

### Issue 2: Different Authentication Headers

**Problem**: You were using custom authentication headers.

**Solution**: Update clients to use standard RDCP headers:
- `X-RDCP-Auth-Method`
- `X-RDCP-Client-ID`  
- `X-RDCP-Request-ID` (optional)

### Issue 3: Complex Debug Configuration

**Problem**: You have complex debug configuration beyond boolean values.

**Solution**: Simplify to boolean values for RDCP compliance, handle complexity in your debug functions.

### Issue 4: Custom Endpoints

**Problem**: You have additional custom debug endpoints beyond RDCP standard.

**Solution**: Keep custom endpoints alongside RDCP SDK middleware - they don't conflict.

## Migration Checklist

- [ ] Install `@rdcp/server` SDK
- [ ] Identify all manual RDCP endpoint implementations
- [ ] Extract debug configuration and authentication logic
- [ ] Remove manual endpoint implementations
- [ ] Add SDK middleware with configuration
- [ ] Update client code to use required RDCP headers
- [ ] Test all endpoints with protocol-compliant requests
- [ ] Update tests to focus on business logic vs protocol compliance
- [ ] Verify error handling works with new error format
- [ ] Test multi-tenancy if enabled
- [ ] Update documentation to reference SDK endpoints

## Need Help?

- **[Authentication Setup](Authentication-Setup)** - Configure security levels
- **[Basic Usage](Basic-Usage)** - Framework integration examples
- **[Client SDK](AI-Agent-Quick-Reference)** - Update client applications
- **[API Reference](../docs/rdcp-implementation-guide.md)** - Complete endpoint documentation
