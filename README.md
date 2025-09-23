# RDCP SDK - Operational Infrastructure Control (OIC)

First-of-its-kind JavaScript/TypeScript SDK implementing the Runtime Debug Control Protocol (RDCP) for operational infrastructure control.

[![npm version](https://badge.fury.io/js/@rdcp.dev%2Fserver.svg)](https://badge.fury.io/js/@rdcp.dev%2Fserver)
[![CI](https://github.com/mojoatomic/rdcp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mojoatomic/rdcp/actions/workflows/ci.yml)
[![Protocol Compliance](https://img.shields.io/badge/RDCP-v1.0%20Compliant-green)](https://github.com/mojoatomic/rdcp/blob/main/PROTOCOL-COMPLIANCE-REPORT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Infrastructure Gap

Production incidents demand immediate operational changes—enabling debug logging, adjusting trace levels, or modifying runtime behavior. Traditional infrastructure forces a binary choice:

- Deploy new code/configuration → risk introducing bugs during incidents
- Use vendor-specific interfaces → limited to monitoring platform capabilities

RDCP represents a third approach: standardized HTTP endpoints for runtime operational control.

### The Technical Gap

Existing infrastructure falls into categories that don't address immediate operational control:

- Configuration management (Ansible, Chef) requires deployments
- Observability platforms (DataDog, New Relic) provide monitoring but limited operational control
- Service meshes manage traffic routing but not application behavior

None provide standardized protocols for immediate runtime operational changes.

### What Makes This Different

RDCP operates at the application control plane level—between the application and its operational environment. It's not configuration (static) or monitoring (passive) but active operational control that happens immediately without deployment cycles.

### The Protocol Approach

Rather than requiring integration with specific platforms, RDCP defines standard HTTP endpoints that any system can implement. This creates interoperability where operational control tools can work across different applications without vendor lock-in.

---

## Operational Infrastructure Control (OIC)

RDCP is the first implementation of a new infrastructure category: Operational Infrastructure Control (OIC).

- Not configuration management (requires deployments)
- Not monitoring platforms (limited operational control)
- Not service mesh (handles traffic, not application behavior)

Instead: a distinct infrastructure layer providing immediate operational control over application behavior through standardized protocols.

### Enterprise Requirements Drive Complexity

Authentication tiers, tenant isolation, and audit features exist because operational control in production involves compliance requirements, multi-customer isolation, and security concerns that simple debugging tools don't address.

### The Technical Innovation

```bash
# Instead of deploying code changes
# (risky during incidents)

# Send HTTP requests to running systems
curl -X POST /rdcp/v1/control \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["DATABASE"],"temporary":"5m"}'
```

Debug output activates immediately, provides operational visibility, then automatically disables after 5 minutes.

---

## Enterprise Infrastructure Features

### Multi-Tier Authentication

- Basic: API key authentication for internal systems
- Standard: JWT with scope-based authorization for SaaS platforms
- Enterprise: mTLS certificate validation with optional JWT context

See Authentication Setup: https://github.com/mojoatomic/rdcp/wiki/Authentication-Setup

### Multi-Tenant Operational Isolation

Complete separation of operational state per customer. Customer A's changes cannot affect Customer B's behavior.

```bash
curl -X POST /rdcp/v1/control \
  -H "X-RDCP-Tenant-ID: customer-123" \
  -H "Authorization: Bearer $JWT_WITH_TENANT_SCOPE" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["API_ROUTES"],"temporary":"30m"}'
```

### Production-Grade Reliability

- Token bucket rate limiting prevents operational abuse (standard RateLimit headers)
- TTL automatic cleanup prevents debug categories staying enabled
- Comprehensive audit trails meet regulatory compliance requirements
- JWKS infrastructure with strong ETag and 304 revalidation

---

## Framework Integration

### Express.js

```javascript
const express = require('express')
const { adapters, auth } = require('@rdcp.dev/server')

const app = express()
app.use(express.json())

// Enterprise-grade operational control in 3 lines
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})
app.use(rdcpMiddleware)

app.listen(3000)
```

Operational endpoints are immediately available:
- GET `/.well-known/rdcp` — Protocol discovery
- POST `/rdcp/v1/control` — Runtime operational control
- GET `/rdcp/v1/status` — Current operational state
- GET `/rdcp/v1/health` — Health checks

### Multi-Framework Support

Consistent behavior across Express, Fastify, and Koa

```javascript
// Fastify
fastify.register(adapters.fastify.createRDCPPlugin({
  authenticator: auth.validateRDCPAuth
}))

// Koa
app.use(adapters.koa.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
}))
```

---

## Enterprise Authentication

### JWT with Tenant-Scoped Authorization (example)

```javascript
const jwt = require('jsonwebtoken')

const jwtAuthenticator = async (req) => {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Global operational control
    if (decoded.scopes?.includes('control')) return true

    // Tenant-specific operational control
    const tenantId = req.headers['x-rdcp-tenant-id']
    return decoded.scopes?.includes(`control:${tenantId}`)
  } catch {
    return false
  }
}
```

### mTLS Certificate Validation (example)

```javascript
const enterpriseAuth = async (req) => {
  const cert = req.connection.getPeerCertificate()
  const allowed = process.env.RDCP_ALLOWED_CERT_SUBJECTS?.split(',') || []
  return allowed.some(subject => cert.subject?.CN?.includes(subject))
}
```

### JWKS Infrastructure

```javascript
const { createJwksFetcher } = require('@rdcp.dev/server')

// Enterprise JWKS client with caching and rotation support
const jwksFetcher = createJwksFetcher({ ttlMs: 30000 })
const result = await jwksFetcher.fetch('https://idp.example.com/.well-known/jwks.json')

// Automatic ETag-based revalidation and key rotation handling
console.log(`Keys: ${result.jwks.keys.length}, From Cache: ${result.fromCache}`)
```

> OpenTelemetry plugin (optional)
>
> - npm: [@rdcp.dev/otel-plugin](https://www.npmjs.com/package/@rdcp.dev/otel-plugin)
> - Docs: [OpenTelemetry Integration](https://github.com/mojoatomic/rdcp/wiki/OpenTelemetry-Integration-Roadmap)

---

## Operational Control Examples

### Incident Response Workflow

```bash
# 1. Incident detected - need database query visibility
curl -X POST /rdcp/v1/control \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["DATABASE","QUERIES"],"temporary":"15m"}'

# 2. Debug output immediately available in logs
# Application now logs all database queries for 15 minutes

# 3. Root cause identified - disable to prevent log noise
curl -X POST /rdcp/v1/control \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"disable","categories":["DATABASE","QUERIES"]}'
```

### Customer-Specific Debugging

```bash
curl -X POST /rdcp/v1/tenants/customer-123/control \
  -H "Authorization: Bearer $TENANT_SCOPED_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["API_ROUTES"],"temporary":"30m"}'
```

### Audit Trail Verification

```bash
# All operational changes automatically logged for compliance
curl -H "Authorization: Bearer $JWT_TOKEN" /rdcp/v1/audit
```

---

## Installation and Setup

### Install

```bash
npm install @rdcp.dev/server
```

### Environment Configuration

```bash
# Required: 32+ character API key for production security
export RDCP_API_KEY="your-production-ready-32-plus-character-api-key"

# Optional: JWT configuration for Standard/Enterprise levels
export JWT_SECRET="your-jwt-signing-secret"
export JWT_ISSUER="your-organization"
export JWT_AUDIENCE="rdcp-services"

# Optional: mTLS configuration for Enterprise level
export RDCP_TRUSTED_CA_FINGERPRINTS="sha256:abcd1234..."
export RDCP_ALLOWED_CERT_SUBJECTS="rdcp-client,ops-team"
```

### Complete Configuration

```javascript
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  // Authentication (required)
  authenticator: auth.validateRDCPAuth,

  // Debug categories (optional)
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    QUERIES: false,
    REPORTS: false,
    CACHE: false
  },

  // Enterprise capabilities (optional)
  capabilities: {
    // Multi-tenant isolation
    multiTenant: {
      enabled: true,
      isolation: 'organization'
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
      headers: true
    },

    // Audit logging
    audit: {
      enabled: true,
      sink: 'file',
      sampling: 1.0,
      redaction: ['password', 'token']
    },

    // TTL automatic cleanup
    ttl: {
      enabled: true,
      maxDuration: '1h',
      defaultDuration: '15m'
    }
  }
})
```

---

## Protocol Endpoints

### Discovery and Status

```bash
# Protocol discovery (no authentication required)
GET /.well-known/rdcp

# System status and active debug categories
GET /rdcp/v1/status

# Health check for load balancers
GET /rdcp/v1/health
```

### Operational Control

```bash
# Enable debug categories
POST /rdcp/v1/control
{
  "action": "enable",
  "categories": ["DATABASE", "API_ROUTES"],
  "options": {
    "temporary": true,
    "duration": "30m"
  }
}

# Disable debug categories
POST /rdcp/v1/control
{
  "action": "disable",
  "categories": ["QUERIES"]
}

# Reset all categories to disabled
POST /rdcp/v1/control
{
  "action": "reset"
}
```

### Multi-Tenant Operations

```bash
# Tenant-specific operational control
GET /rdcp/v1/tenants/{tenantId}/status
POST /rdcp/v1/tenants/{tenantId}/control
```

---

## Client SDK

Consume RDCP endpoints from other services:

```javascript
const { RDCPClient } = require('@rdcp.dev/server/client')

const client = new RDCPClient({
  baseUrl: 'https://your-service.com',
  auth: { type: 'jwt', token: 'your-jwt-token' }
})

await client.enable(['DATABASE', 'API_ROUTES'])
await client.disable(['QUERIES'])
await client.status()
```

---

## Enterprise Deployment

### Kubernetes Integration (example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rdcp-enabled-service
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: RDCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: rdcp-secrets
              key: api-key
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: rdcp-secrets
              key: jwt-secret
```

### Load Balancer Health Checks

```bash
GET /rdcp/v1/health
```

---

## Protocol Compliance

RDCP v1.0 specification compliance validated through 220+ automated tests:

- Authentication across all security levels
- Multi-tenant isolation validation
- Rate limiting and audit trail testing
- Error handling and protocol response formats
- Cross-framework compatibility

See Protocol Compliance Report: https://github.com/mojoatomic/rdcp/blob/main/PROTOCOL-COMPLIANCE-REPORT.md

---

## Why Operational Control Infrastructure Matters

- For Infrastructure Teams: Immediate operational changes without deployment risk
- For SaaS Platforms: Customer-specific debugging without affecting other tenants
- For Compliance: Complete audit trails of operational changes
- For Incidents: Debug visibility in seconds, not deployment cycles

This represents new infrastructure capability—not an incremental improvement to existing tools.

---

## Requirements

- Node.js >= 18
- Express 4.18+, Fastify 4.x+, Koa 2.x

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Documentation

- Installation: https://github.com/mojoatomic/rdcp/wiki/Installation
- Basic Usage: https://github.com/mojoatomic/rdcp/wiki/Basic-Usage
- Authentication Setup: https://github.com/mojoatomic/rdcp/wiki/Authentication-Setup
- JWKS Integration: https://github.com/mojoatomic/rdcp/wiki/JWKS
- Rate Limiting: https://github.com/mojoatomic/rdcp/wiki/Rate-Limiting
- API Reference: https://github.com/mojoatomic/rdcp/wiki/API-Reference
- OpenTelemetry Plugin: https://github.com/mojoatomic/rdcp/wiki/OpenTelemetry-Integration-Roadmap
