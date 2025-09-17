# Authentication Setup

The RDCP SDK supports all 3 security levels defined in the RDCP v1.0 protocol specification: Basic, Standard, and Enterprise.

## Security Levels Overview

| Level | Use Case | Authentication Method | Features |
|-------|----------|----------------------|----------|
| **Basic** | Development/Internal | API Key (32+ chars) | Simple shared secrets, constant-time comparison |
| **Standard** | Production SaaS | Bearer Token (JWT/OAuth2) | User identity, expiration, scopes validation |
| **Enterprise** | Regulated Industries | mTLS + Token | Certificate validation, full audit trail |

## Level 1: Basic (API Key Authentication)

**Default setup** - Works out of the box with environment variable configuration.

### Environment Setup

```bash
# Required: API key must be 32+ characters for security
export RDCP_API_KEY="your-secure-32-plus-character-api-key-here"

# Optional: Set auth level (defaults to basic)
export RDCP_AUTH_LEVEL="basic"
```

### Implementation

```javascript
const { adapters, auth } = require('@rdcp/server')

// Use built-in API key authentication
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth  // Uses basic auth by default
})
```

### Custom API Key Authentication

```javascript
const { adapters } = require('@rdcp/server')
const crypto = require('crypto')

const customAuth = async (req) => {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '')
  
  if (!apiKey || apiKey.length < 32) {
    return false
  }
  
  // Your API key validation logic
  const expectedKey = process.env.RDCP_API_KEY
  
  try {
    // Constant-time comparison for security
    return crypto.timingSafeEqual(
      Buffer.from(expectedKey),
      Buffer.from(apiKey)
    )
  } catch {
    return false
  }
}

const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: customAuth
})
```

### Client Usage

```bash
# Using X-API-Key header (recommended)
curl -H "X-API-Key: your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: admin-console" \
     http://localhost:3000/rdcp/v1/status

# Using Authorization header
curl -H "Authorization: Bearer your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: admin-console" \
     http://localhost:3000/rdcp/v1/status
```

## Level 2: Standard (JWT Bearer Token)

**Production SaaS** setup with user identity and scopes validation.

### Environment Setup

```bash
# Set authentication level
export RDCP_AUTH_LEVEL="standard"

# JWT signing secret
export JWT_SECRET="your-jwt-signing-secret-here"
```

### Implementation

```javascript
const { adapters } = require('@rdcp/server')
const jwt = require('jsonwebtoken')

const jwtAuthenticator = async (req) => {
  const authHeader = req.headers['authorization']
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing Bearer token'
    }
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Validate RDCP scopes
    const hasRDCPScope = decoded.scopes?.includes('rdcp:control') || 
                         decoded.scopes?.includes('rdcp:admin')
    
    if (!hasRDCPScope) {
      return {
        valid: false,
        error: 'Insufficient RDCP scopes'
      }
    }
    
    return {
      valid: true,
      method: 'bearer',
      userId: decoded.sub || decoded.email,
      tenantId: decoded.org_id || decoded.tenant,
      scopes: decoded.scopes,
      sessionId: decoded.session_id,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    }
  }
}

const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: jwtAuthenticator
})
```

### JWT Token Format

Your JWT tokens should include these claims:

```json
{
  "sub": "user@example.com",
  "org_id": "org_123",
  "scopes": ["rdcp:discovery", "rdcp:status", "rdcp:control"],
  "session_id": "sess_abc123",
  "exp": 1672531200,
  "iat": 1672527600
}
```

### Client Usage

```bash
# Generate or obtain JWT token
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use with RDCP endpoints
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "X-RDCP-Auth-Method: bearer" \
     -H "X-RDCP-Client-ID: webapp-v1.2" \
     http://localhost:3000/rdcp/v1/control
```

## Level 3: Enterprise (mTLS + JWT Hybrid)

**Regulated industries** setup with certificate validation and full audit trail.

### Environment Setup

```bash
# Set authentication level
export RDCP_AUTH_LEVEL="enterprise"

# JWT secret for hybrid mode
export JWT_SECRET="your-jwt-signing-secret-here"
```

### Implementation

```javascript
const { adapters } = require('@rdcp/server')
const { X509Certificate } = require('crypto')
const jwt = require('jsonwebtoken')

const enterpriseAuth = async (req) => {
  // Extract client certificate
  const certHeader = req.headers['x-client-cert']
  const certSubject = req.headers['x-rdcp-cert-subject']
  
  if (!certHeader) {
    return {
      valid: false,
      error: 'Client certificate required'
    }
  }
  
  try {
    // Validate certificate
    const cert = new X509Certificate(Buffer.from(certHeader, 'base64'))
    
    // Check certificate validity
    const now = new Date()
    const validFrom = new Date(cert.validFrom)
    const validTo = new Date(cert.validTo)
    
    if (now < validFrom || now > validTo) {
      return {
        valid: false,
        error: 'Certificate expired or not yet valid'
      }
    }
    
    // Extract identity from certificate
    const subject = cert.subject
    const cn = subject.match(/CN=([^,]+)/)?.[1]
    
    // Optional: Also validate JWT for additional context
    const authHeader = req.headers['authorization']
    let tokenContext = {}
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        tokenContext = {
          userId: decoded.sub,
          scopes: decoded.scopes,
          tenantId: decoded.org_id
        }
      } catch {
        // JWT validation failed, continue with cert-only auth
      }
    }
    
    return {
      valid: true,
      method: 'mtls',
      userId: tokenContext.userId || cn,
      tenantId: tokenContext.tenantId || extractTenantFromCN(cn),
      scopes: tokenContext.scopes || ['admin'],
      sessionId: cert.fingerprint,
      metadata: {
        certSubject: cert.subject,
        certIssuer: cert.issuer,
        certFingerprint: cert.fingerprint
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    }
  }
}

function extractTenantFromCN(cn) {
  // Example: CN=client.tenant123.example.com
  const match = cn?.match(/\.([^.]+)\.example\.com$/)
  return match?.[1] || 'default'
}

const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: enterpriseAuth
})
```

### Certificate Setup

Client certificates should follow this naming pattern:

```
Subject: CN=client.tenant123.example.com, O=Example Corp, C=US
Issuer: CN=Example Corp CA, O=Example Corp, C=US
```

### Client Usage

```bash
# Using client certificate + optional JWT
curl --cert client.pem \
     --key client-key.pem \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "X-RDCP-Auth-Method: mtls" \
     -H "X-RDCP-Client-ID: enterprise-client" \
     http://localhost:3000/rdcp/v1/control
```

## Multi-Tenancy Support

All authentication levels support multi-tenancy through standard RDCP headers.

### Required Headers for Multi-Tenant Requests

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: admin-console" \
     -H "X-RDCP-Tenant-ID: org_123" \
     -H "X-RDCP-Isolation-Level: organization" \
     -H "X-RDCP-Tenant-Name: Acme Corp" \
     http://localhost:3000/rdcp/v1/control
```

### Tenant Extraction Examples

#### From JWT Token

```javascript
const jwtTenantAuth = async (req) => {
  const authResult = await validateJWT(req)
  
  if (authResult.valid) {
    // Set tenant headers from JWT payload
    req.headers['x-rdcp-tenant-id'] = authResult.tenantId
    req.headers['x-rdcp-isolation-level'] = 'organization'
    req.headers['x-rdcp-tenant-name'] = authResult.orgName
  }
  
  return authResult
}
```

#### From API Key Metadata

```javascript
const API_KEY_METADATA = {
  'tenant-a-api-key-32chars': {
    tenantId: 'tenant_a',
    tenantName: 'Tenant A Corp',
    isolationLevel: 'organization'
  }
}

const apiKeyTenantAuth = async (req) => {
  const apiKey = extractApiKey(req)
  const metadata = API_KEY_METADATA[apiKey]
  
  if (metadata) {
    // Set tenant headers from API key metadata
    req.headers['x-rdcp-tenant-id'] = metadata.tenantId
    req.headers['x-rdcp-isolation-level'] = metadata.isolationLevel
    req.headers['x-rdcp-tenant-name'] = metadata.tenantName
    return true
  }
  
  return false
}
```

## Required Headers

All RDCP requests must include these headers per the protocol specification:

```http
X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
X-RDCP-Client-ID: <client-identifier>
X-RDCP-Request-ID: <unique-request-id>  # Optional but recommended
```

## Error Responses

Authentication failures return standard RDCP error format:

### Authentication Required (401)

```json
{
  "error": {
    "code": "RDCP_AUTH_REQUIRED",
    "message": "Authentication required",
    "protocol": "rdcp/1.0"
  }
}
```

### Authentication Failed (401)

```json
{
  "error": {
    "code": "RDCP_AUTH_FAILED",
    "message": "Authentication failed",
    "method": "bearer",
    "details": {
      "reason": "token_expired",
      "requiredScopes": ["control"],
      "providedScopes": ["status"]
    },
    "protocol": "rdcp/1.0"
  }
}
```

### Insufficient Permissions (403)

```json
{
  "error": {
    "code": "RDCP_FORBIDDEN",
    "message": "Insufficient permissions",
    "protocol": "rdcp/1.0"
  }
}
```

## Security Best Practices

### API Key Security

- ✅ Use minimum 32-character keys
- ✅ Store keys in environment variables, not code
- ✅ Use constant-time comparison to prevent timing attacks
- ✅ Rotate keys regularly
- ✅ Use HTTPS in production

### JWT Security

- ✅ Validate token signatures
- ✅ Check token expiration
- ✅ Validate required scopes
- ✅ Use strong signing secrets
- ✅ Implement token refresh if needed

### mTLS Security

- ✅ Validate certificate validity periods
- ✅ Check certificate subject/issuer
- ✅ Verify certificate chain
- ✅ Use proper certificate storage
- ✅ Monitor certificate expiration

## Testing Authentication

### Test Script

```javascript
// test-auth.js
const { auth } = require('@rdcp/server')

// Mock request with headers
const testRequest = {
  headers: {
    'x-api-key': process.env.RDCP_API_KEY,
    'x-rdcp-auth-method': 'api-key',
    'x-rdcp-client-id': 'test-client'
  }
}

const result = auth.validateRDCPAuth(testRequest)
console.log('Auth result:', result)
```

### Command Line Testing

```bash
# Test basic auth
export RDCP_API_KEY="test-key-32-characters-minimum-length"
curl -H "X-API-Key: $RDCP_API_KEY" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: test-client" \
     http://localhost:3000/rdcp/v1/status

# Test missing auth
curl http://localhost:3000/rdcp/v1/status

# Test invalid auth
curl -H "X-API-Key: short" \
     -H "X-RDCP-Auth-Method: api-key" \
     -H "X-RDCP-Client-ID: test-client" \
     http://localhost:3000/rdcp/v1/status
```

## Next Steps

- **[Multi-Tenancy](Multi-Tenancy)** - Advanced tenant isolation and context management
- **[Client SDK](Client-SDK)** - Use the client SDK with authentication
- **[Express Integration](Express-Integration)** - Framework-specific authentication setup
- **[API Reference](API-Reference)** - Complete endpoint and authentication documentation