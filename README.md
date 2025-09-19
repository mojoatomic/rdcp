# RDCP SDK

**Complete JavaScript/TypeScript SDK for implementing Runtime Debug Control Protocol (RDCP) v1.0 compliant endpoints.**

[![npm version](https://badge.fury.io/js/@rdcp%2Fserver.svg)](https://badge.fury.io/js/@rdcp%2Fserver)
[![CI](https://github.com/mojoatomic/rdcp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mojoatomic/rdcp/actions/workflows/ci.yml)
[![Protocol Compliance](https://img.shields.io/badge/RDCP-v1.0%20Compliant-green)](https://github.com/mojoatomic/rdcp/blob/main/PROTOCOL-COMPLIANCE-REPORT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

✅ **Complete RDCP v1.0 Protocol Compliance**  
✅ **All 3 Security Levels** - Basic (API Key), Standard (JWT), Enterprise (mTLS)  
✅ **Multi-Framework Support** - Express, Fastify, Koa, Next.js  
✅ **Client & Server SDKs** - Full bidirectional RDCP implementation  
✅ **Multi-Tenancy Support** - Organization, namespace, and process isolation  
✅ **Zero Configuration** - Works out of the box with sensible defaults  
✅ **TypeScript Support** - Full type definitions included  

---

## Quick Start

### Installation

```bash
npm install @rdcp/server
```

### Express.js Setup (30 seconds)

```javascript
const express = require('express')
const { adapters, auth } = require('@rdcp/server')

const app = express()
app.use(express.json())

// Add RDCP support with built-in authentication
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,  // Built-in API key auth
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    QUERIES: false
  }
})

app.use(rdcpMiddleware)
app.listen(3000)

// ✅ Ready! RDCP endpoints are automatically available:
// GET  /.well-known/rdcp
// GET  /rdcp/v1/discovery 
// POST /rdcp/v1/control
// GET  /rdcp/v1/status
// GET  /rdcp/v1/health
```

**Set your API key:**
```bash
export RDCP_API_KEY="your-secure-32-plus-character-api-key-here"
```

### Test Your Setup

```bash
# Test protocol discovery (no auth required)
curl http://localhost:3000/.well-known/rdcp

# Test authenticated endpoint
curl -H "X-API-Key: your-api-key" http://localhost:3000/rdcp/v1/status

# Control debug categories
curl -X POST -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"action":"enable","categories":["DATABASE"]}' \
     http://localhost:3000/rdcp/v1/control
```

---

## Framework Support

### Express.js

```javascript
const { adapters, auth } = require('@rdcp/server')

app.use(adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
}))
```

### Fastify

```javascript
const { adapters, auth } = require('@rdcp/server')

// As middleware
const rdcpMiddleware = adapters.fastify.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})
fastify.addHook('preHandler', rdcpMiddleware)

// Or as plugin
fastify.register(adapters.fastify.createRDCPPlugin({
  authenticator: auth.validateRDCPAuth
}))
```

### Koa

```javascript
const { adapters, auth } = require('@rdcp/server')

const rdcpMiddleware = adapters.koa.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

app.use(rdcpMiddleware)
```

### Next.js API Routes

```javascript
// pages/api/rdcp/[...rdcp].js
import { adapters, auth } from '@rdcp/server'

const rdcpHandler = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

export default function handler(req, res) {
  return rdcpHandler(req, res, () => {})
}
```

---

## Authentication Levels

### Basic Level (API Key)

**Default and most common setup:**

```javascript
const { auth } = require('@rdcp/server')

// Use built-in API key authentication
const authenticator = auth.validateRDCPAuth

// Or create custom API key auth
const customAuth = async (req) => {
  const apiKey = req.headers['x-api-key']
  return apiKey === process.env.RDCP_API_KEY
}
```

**Environment Setup:**
```bash
# Required: 32+ character API key for security
export RDCP_API_KEY="your-production-ready-32-plus-character-api-key"
```

**Client Usage:**
```bash
curl -H "X-API-Key: your-api-key" /rdcp/v1/status
# OR
curl -H "Authorization: Bearer your-api-key" /rdcp/v1/status
```

### Standard Level (JWT Bearer Tokens)

```javascript
const jwt = require('jsonwebtoken')

const jwtAuthenticator = async (req) => {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Verify RDCP scopes
    return decoded.scopes?.includes('rdcp:control')
  } catch {
    return false
  }
}
```

**Environment Setup:**
```bash
export JWT_SECRET="your-jwt-signing-secret"
export RDCP_AUTH_LEVEL="standard"
```

### Enterprise Level (mTLS + JWT Hybrid)

```javascript
const enterpriseAuth = async (req) => {
  // Validate client certificate
  const cert = req.connection.getPeerCertificate()
  if (!cert || !cert.subject?.CN?.includes('rdcp-client')) {
    return false
  }
  
  // Also validate JWT for additional context
  const token = req.headers['authorization']?.replace('Bearer ', '')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.org_id === extractOrgFromCert(cert)
  } catch {
    return true // Certificate-only auth fallback
  }
}
```

---

## Complete Configuration

### All Middleware Options

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
    multiTenancy: true,
    isolationLevel: 'organization'  // 'global' | 'process' | 'namespace' | 'organization'
  }
})
```

### Multi-Tenancy Headers

```bash
# Tenant-isolated requests
curl -H "X-API-Key: key" \
     -H "X-RDCP-Tenant-ID: customer-123" \
     -H "X-RDCP-Isolation-Level: organization" \
     /rdcp/v1/control
```

---

## Client SDK

**Use the client SDK to consume RDCP endpoints from other services:**

### Installation & Setup

```javascript
const { RDCPClient } = require('@rdcp/server/client')

const client = new RDCPClient({
  baseUrl: 'https://your-rdcp-server.com',
  auth: {
    level: 'basic',
    apiKey: 'your-32-plus-character-api-key'
  },
  timeout: 5000,
  retries: 3
})
```

### Client Methods

```javascript
// Protocol discovery
const discovery = await client.discover()
console.log('RDCP Capabilities:', discovery.capabilities)

// Get debug system info  
const debugInfo = await client.getDebugInfo()
console.log('Available Categories:', debugInfo.categories)

// Control debug categories
const result = await client.enable(['DATABASE', 'API_ROUTES'])
console.log('Changes Applied:', result.changes)

// Convenience methods
await client.disable(['QUERIES'])
await client.toggle(['CACHE'])
await client.reset()  // Disable all

// Status monitoring
const status = await client.getStatus()
console.log('Active Categories:', status.categories)

// Health check
const health = await client.getHealth()
console.log('System Health:', health.status)
```

---

## Documentation

- Error responses and codes: docs/error-responses.md
- Testing helpers and patterns: docs/testing-helpers.md
- Logging configuration (hybrid fallback): docs/logging.md

## API Reference

### RDCP Endpoints (Auto-Generated)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/.well-known/rdcp` | GET | No | Protocol discovery |
| `/rdcp/v1/discovery` | GET | Yes | Debug system discovery |
| `/rdcp/v1/control` | POST | Yes | Runtime debug control |
| `/rdcp/v1/status` | GET | Yes | Current debug status |
| `/rdcp/v1/health` | GET | Yes | System health check |

### Control Request Format

```javascript
// Enable specific categories
POST /rdcp/v1/control
{
  "action": "enable",
  "categories": ["DATABASE", "API_ROUTES"],
  "options": {
    "temporary": false,
    "duration": "1h"
  }
}

// Disable categories
POST /rdcp/v1/control
{
  "action": "disable",
  "categories": ["QUERIES"]
}

// Toggle categories
POST /rdcp/v1/control
{
  "action": "toggle", 
  "categories": ["CACHE"]
}

// Reset all to disabled
POST /rdcp/v1/control
{
  "action": "reset",
  "categories": "*"
}
```

### Standard Response Format

**All RDCP responses include:**

```javascript
// Success Response
{
  "protocol": "rdcp/1.0",           // Always present
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1705234200000",
  // ... endpoint-specific data
}

// Error Response  
{
  "error": {
    "code": "RDCP_AUTH_REQUIRED",
    "message": "Authentication required", 
    "protocol": "rdcp/1.0"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RDCP_AUTH_REQUIRED` | 401 | Authentication required |
| `RDCP_AUTH_ERROR` | 401 | Authentication failed |
| `RDCP_FORBIDDEN` | 403 | Insufficient permissions |
| `RDCP_VALIDATION_ERROR` | 400 | Request validation failed |
| `RDCP_METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `RDCP_NOT_FOUND` | 404 | RDCP endpoint not found |
| `RDCP_INTERNAL_ERROR` | 500 | Internal server error |

---

## Migration Guide

### From Manual RDCP Implementation

**Before (Manual - 50+ lines):**
```javascript
// Manual endpoint implementations
app.get('/.well-known/rdcp', (req, res) => {
  res.json({ protocol: 'rdcp/1.0', endpoints: { /* ... */ } })
})

app.get('/rdcp/v1/discovery', authenticateRDCP, (req, res) => {
  // Manual discovery logic...
})

app.post('/rdcp/v1/control', authenticateRDCP, validateRequest, (req, res) => {
  // Manual control logic...
})

// ... 40+ more lines of boilerplate
```

**After (SDK - 5 lines):**
```javascript
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})
app.use(rdcpMiddleware)
// ✅ Done! All endpoints work automatically
```

---

## Testing

### Run Tests

```bash
# All tests (45+ tests across 5 test suites)
npm test

# With coverage report
npm test -- --coverage

# Specific adapter tests
npm test -- --testNamePattern="express"
npm test -- --testNamePattern="fastify"
npm test -- --testNamePattern="koa"

# Authentication tests
npm test -- --testNamePattern="auth"
```

---

## Environment Variables

### Required

```bash
# API key for Basic authentication (32+ characters required)
RDCP_API_KEY="your-production-ready-32-plus-character-api-key-here"
```

### Optional

```bash
# Authentication level (default: basic)
RDCP_AUTH_LEVEL="basic|standard|enterprise"

# JWT secret for Standard/Enterprise auth
JWT_SECRET="your-jwt-signing-secret"

# Server configuration
PORT=3000
NODE_ENV="development|production"
```

---

## Requirements

### Runtime
- **Node.js**: 16.0.0 or higher
- **Frameworks**: Express 4.18+, Fastify 4.0+, or Koa 2.0+

### Dependencies
- `jsonwebtoken`: JWT authentication support
- `node-fetch`: HTTP client functionality
- `zod`: Request/response validation

---

## License

**MIT License** - see [LICENSE](LICENSE) file for details.