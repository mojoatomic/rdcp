# Runtime Debug Control Protocol (RDCP) Specification v1.0

**Status**: Draft  
**Date**: 2025-09-17  
**Purpose**: Formal protocol specification for runtime debug control across distributed systems

---

## 1. Protocol Overview

### 1.1 Scope
RDCP defines a standardized HTTP-based protocol for controlling debug logging in distributed applications at runtime. This specification is language and framework agnostic.

### 1.2 Conformance Requirements
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Protocol Architecture

### 2.1 Transport
- Protocol: HTTP/1.1 or HTTP/2
- Content-Type: application/json
- Character Encoding: UTF-8

### 2.2 Required Endpoints

Compliant implementations MUST expose these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/rdcp` | GET | Protocol discovery |
| `/rdcp/v1/discovery` | GET | Debug system discovery |
| `/rdcp/v1/control` | POST | Runtime control |
| `/rdcp/v1/status` | GET | Current status |
| `/rdcp/v1/health` | GET | System health |

### 2.3 Optional Endpoints

Implementations MAY expose:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/rdcp/v1/metrics` | GET | Performance metrics |
| `/rdcp/v1/tenants` | GET | Multi-tenant discovery |
| `/rdcp/v1/audit` | GET | Audit trail |

---

## 3. Authentication & Authorization

### 3.1 Security Levels

Implementations MUST declare their security level and support appropriate methods:

| Level | Use Case | Required Methods | Features |
|-------|----------|-----------------|----------|
| `basic` | Development/Internal | API Key | Simple shared secrets |
| `standard` | Production SaaS | Bearer Token (JWT/OAuth2) | User identity, expiration |
| `enterprise` | Regulated Industries | mTLS + Token | Certificate validation, full audit |

### 3.2 Authentication Headers

#### Required Headers (All Levels)
```http
X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
X-RDCP-Client-ID: <client-identifier>
X-RDCP-Request-ID: <unique-request-id>  # For audit trail
```

#### Method-Specific Headers

**Basic (API Key):**
```http
X-RDCP-API-Key: rdcp_[env]_[type]_[random]
X-RDCP-Key-Version: v1  # For key rotation
```

**Standard (Bearer Token):**
```http
Authorization: Bearer <jwt-token>
X-RDCP-Token-Type: jwt | oauth2 | custom
```

**Enterprise (mTLS):**
```http
X-Client-Cert: <certificate-fingerprint>
X-RDCP-Cert-Subject: CN=client.example.com
```

### 3.3 Scopes and Permissions

Implementations MUST support standard scopes:

| Scope | Operations | Description |
|-------|------------|-------------|
| `discovery` | GET endpoints | Read system information |
| `status` | Status/Health | Monitor system state |
| `control` | POST control | Modify debug settings |
| `admin` | All operations | Full access + audit trail |

### 3.4 Authentication Response

#### Success Context
Auth validation MUST provide:
```json
{
  "authenticated": true,
  "method": "bearer",
  "userId": "user@example.com",
  "tenantId": "org_123",
  "scopes": ["discovery", "status", "control"],
  "sessionId": "sess_abc123",
  "expiresAt": "2025-09-17T12:00:00Z"  # If applicable
}
```

#### Failure Response
```json
{
  "error": {
    "code": "RDCP_AUTH_FAILED",
    "message": "Authentication failed",
    "method": "bearer",
    "details": {
      "reason": "token_expired" | "invalid_key" | "insufficient_scopes",
      "requiredScopes": ["control"],
      "providedScopes": ["status"]
    },
    "protocol": "rdcp/1.0"
  }
}
```

Status Codes:
- `401 Unauthorized`: No valid credentials
- `403 Forbidden`: Valid credentials, insufficient permissions

### 3.5 Key Rotation and Management

**API Keys:**
- MUST support multiple active keys
- SHOULD include version in key format
- MUST allow gradual key rotation

**Tokens:**
- MUST validate expiration
- SHOULD support refresh tokens
- MUST validate issuer and audience

### 3.6 Auth Validation Interface

Implementations MUST provide consistent auth validation regardless of method:

```javascript
// Pseudo-code interface (language agnostic)
interface AuthValidationResult {
  valid: boolean
  method: "api-key" | "bearer" | "mtls" | "hybrid"
  userId?: string           // Required for standard/enterprise
  tenantId?: string         // Required if multi-tenant
  scopes: string[]          // Granted permissions
  sessionId?: string        // For audit correlation
  expiresAt?: timestamp     // For time-limited access
  metadata?: {              // Additional context
    clientId: string
    clientVersion: string
    ipAddress: string
  }
}
```

### 3.7 Auth Method Selection

Clients SHOULD select auth method based on deployment:

```javascript
// Client discovers server capabilities
GET /.well-known/rdcp

// Client selects appropriate method
if (environment === "development") {
  use "api-key" with X-RDCP-API-Key header
} else if (environment === "production") {
  use "bearer" with Authorization header
} else if (environment === "regulated") {
  use "mtls" with client certificates
}
```

### 3.8 Audit Requirements

Based on security level:

| Level | Audit Requirements |
|-------|-------------------|
| `basic` | Optional logging |
| `standard` | User identity + actions |
| `enterprise` | Full audit trail with compliance metadata |

---

## 4. Multi-Tenancy

### 4.1 Tenant Context Headers

When multi-tenancy is supported, implementations MUST accept:

```http
X-RDCP-Tenant-ID: <tenant-identifier>
X-RDCP-Isolation-Level: global|process|namespace|organization
X-RDCP-Tenant-Name: <human-readable-name>  # OPTIONAL
```

### 4.2 Isolation Levels

| Level | Description | Scope |
|-------|-------------|-------|
| `global` | No isolation | All tenants share configuration |
| `process` | Process isolation | Configuration per process |
| `namespace` | Namespace isolation | Configuration per namespace |
| `organization` | Full isolation | Complete tenant separation |

### 4.3 Tenant Context in Responses

All responses in multi-tenant mode MUST include:

```json
{
  "protocol": "rdcp/1.0",
  "tenant": {
    "id": "<tenant-id>",
    "isolationLevel": "<level>",
    "scope": "global|tenant-isolated"
  }
}
```

---

## 5. Endpoint Specifications

### 5.1 Protocol Discovery

**Request:**
```http
GET /.well-known/rdcp HTTP/1.1
```

**Response:**
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
    "multiTenancy": true|false,
    "performanceMetrics": true|false,
    "temporaryControls": true|false,
    "auditTrail": true|false
  },
  "security": {
    "level": "basic" | "standard" | "enterprise",
    "methods": ["api-key", "bearer", "mtls"],
    "scopes": ["discovery", "status", "control", "admin"],
    "required": true|false,
    "keyRotation": true|false,
    "tokenRefresh": true|false
  }
}
```

### 5.2 Debug System Discovery

**Request:**
```http
GET /rdcp/v1/discovery HTTP/1.1
X-RDCP-Tenant-ID: <tenant-id>  # If multi-tenant
```

**Response:**
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "categories": [
    {
      "name": "DATABASE",
      "description": "Database operations",
      "enabled": true,
      "temporary": false,
      "metrics": {
        "callsTotal": 1234,
        "callsPerSecond": 2.3
      }
    }
  ],
  "performance": {
    "totalCalls": 45678,
    "callsPerSecond": 2.3,
    "categoryBreakdown": { "DATABASE": 1234 }
  }
}
```

### 5.3 Runtime Control

**Request:**
```json
POST /rdcp/v1/control HTTP/1.1
Content-Type: application/json

{
  "action": "enable|disable|toggle|reset|status",
  "categories": ["DATABASE", "API_ROUTES"]  // or a single string "DATABASE"
  ,
  "options": {
    "temporary": true,
    "duration": "15m",  // number (seconds) or duration string (e.g., "15m")
    "reason": "Investigating issue #1234"
  }
}
```

**Response:**
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "action": "enable",
  "categories": ["DATABASE"],
  "status": "success", // "partial" or "failed"
  "message": "Enabled categories",
  "changes": [
    {
      "category": "DATABASE",
      "previousState": false,
      "newState": true,
      "temporary": true,
      "effectiveAt": "2025-09-17T10:30:00Z",
      "expiresAt": "2025-09-17T10:45:00Z"
    }
  ]
}
```

### 5.4 Status Monitoring

**Request:**
```http
GET /rdcp/v1/status HTTP/1.1
```

**Response:**
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "enabled": true,
  "categories": { "DATABASE": true, "API_ROUTES": false },
  "performance": { "totalCalls": 45678, "callsPerSecond": 2.3 }
}
```

### 5.5 Health Check

**Request:**
```http
GET /rdcp/v1/health HTTP/1.1
```

**Response:**
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "status": "healthy",
  "checks": [
    { "name": "redis", "status": "pass", "duration": "5ms" },
    { "name": "db", "status": "pass", "duration": "8ms" }
  ]
}
```

---

## 6. Error Handling

### 6.1 Standard Error Format

All errors MUST follow:

```json
{
  "error": {
    "code": "RDCP_ERROR_CODE",
    "message": "Human-readable message",
    "details": {},  # OPTIONAL
    "protocol": "rdcp/1.0"
  }
}
```

### 6.2 Standard Error Codes

For the complete, source-of-truth list of protocol error codes and their HTTP mappings, see: docs/error-codes.md

---

## 7. Performance Metrics

### 7.1 Metric Representation

When reporting metrics, implementations MUST use:

```json
{
  "value": <numeric-value>,
  "unit": "<unit-string>",
  "measured": true|false,  # false indicates placeholder
  "timestamp": "2025-09-17T10:30:00Z"
}
```

### 7.2 Standard Units

| Metric | Unit | Example |
|--------|------|---------|
| CPU Usage | `percent` | 0.1 |
| Memory | `bytes` | 1048576 |
| Rate | `per_second` | 2.3 |
| Count | `count` | 1234 |
| Duration | `milliseconds` | 50 |

### 7.3 Placeholder Values

When actual metrics are unavailable:
- Set `"measured": false`
- Provide reasonable estimates
- Document in response that values are estimated

---

## 8. Security Considerations

### 8.1 Transport Security
- Production deployments MUST use HTTPS
- Development MAY use HTTP on localhost only

### 8.2 Authentication
- API keys MUST be at least 32 characters
- Tokens MUST use industry-standard formats (JWT, OAuth2)
- Authentication MUST use constant-time comparison

### 8.3 Rate Limiting
- Implementations SHOULD implement rate limiting
- Control endpoints SHOULD limit to 60 requests/minute
- Status endpoints MAY allow higher rates

### 8.4 Audit Trail
When audit trail is enabled:
- All control operations MUST be logged
- Logs MUST include timestamp, operator, action, reason
- Logs SHOULD be tamper-evident

---

## 9. Compatibility

### 9.1 Version Negotiation

Clients MUST include protocol version:
```http
Accept: application/vnd.rdcp.v1+json
```

Servers MUST respond with:
```http
Content-Type: application/vnd.rdcp.v1+json
```

### 9.2 Backward Compatibility

Future versions:
- MUST maintain backward compatibility for 2 major versions
- MUST use version in URL path (`/rdcp/v2/...`)
- SHOULD provide version negotiation

---

## 10. Extensibility

### 10.1 Custom Categories

Implementations MAY add custom debug categories:
- MUST prefix with `X-` (e.g., `X-CUSTOM-FEATURE`)
- MUST document in discovery endpoint

### 10.2 Vendor Extensions

Vendors MAY extend responses with additional fields:
- MUST prefix with vendor identifier
- MUST NOT break standard clients

Example:
```json
{
  "protocol": "rdcp/1.0",
  "categories": [...],
  "_vendor_secflo": {
    "customField": "value"
  }
}
```

---

## 11. Compliance Levels

### Level 1: Basic
- Implements all required endpoints
- Security level: `basic` (API key authentication)
- Returns proper error codes
- Single-tenant or global configuration
- Optional audit logging

### Level 2: Standard
- All Level 1 requirements
- Security level: `standard` (Bearer tokens with scopes)
- Multi-tenancy support with isolation
- Performance metrics (may use placeholders)
- User identity in audit trail
- Key rotation support

### Level 3: Enterprise
- All Level 2 requirements
- Security level: `enterprise` (mTLS + tokens)
- Real performance metrics (measured, not estimated)
- Temporary controls with automatic expiration
- Rate limiting with configurable thresholds
- Full audit trail with compliance metadata
- Token refresh capability
- Multiple active keys per client

---

## 12. References

- RFC 2119: Key words for use in RFCs
- RFC 7231: HTTP/1.1 Semantics and Content
- RFC 7807: Problem Details for HTTP APIs
- RFC 8259: JSON Data Interchange Format

---

## Appendix A: Implementation Notes

This specification defines the protocol, not the implementation. Implementations:
- MAY use any programming language
- MAY use any storage mechanism
- MAY implement additional features
- MUST maintain protocol compliance for claimed level

---

## Appendix B: Change Log

- v1.0 (2025-09-17): Initial specification

---

## Appendix C: Data Type Definitions

This protocol uses standard JSON primitives (string, number, boolean, object, array) with the following domain-specific constraints.

### Timestamp
- Type: string (RFC 3339 / ISO 8601 in UTC)
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ` (milliseconds are REQUIRED; UTC 'Z' is REQUIRED)
- Example: `"2025-09-17T10:30:00.000Z"`
- Validation: timezone offsets other than `Z` are not permitted

### Duration
- Type: number or string
- Number: integer seconds (e.g., `900`)
- String: `<number><unit>` where unit ∈ `s|m|h|d` (e.g., `"15m"`, `"2h"`, `"30s"`)
- Canonicalization (server responses): prefer string form with the smallest unit that divides evenly (e.g., `900` → `"15m"`)

### CategoryName
- Type: string
- Pattern: `^[A-Z][A-Z0-9_]{0,63}$`
- Length: 1–64
- Case: uppercase with underscores
- Examples: `DATABASE`, `API_ROUTES`, `QUERY_CACHE`

### Identifier (TenantId, ClientId, RequestId)
- Type: string
- Pattern: `^[a-zA-Z0-9._-]{1,255}$`
- Length: 1–255
- Notes:
  - Intended for headers and path params (e.g., `X-RDCP-Tenant-ID`)
  - Must not contain whitespace
  - Use URL-safe characters only

### ErrorCode
- Type: string
- Pattern: `^[A-Z0-9_]{3,64}$`
- Examples: `UNAUTHORIZED`, `TENANT_NOT_FOUND`, `RATE_LIMITED`

### Metric Numbers
Use context-specific types:
- CounterNumber: non-negative; for counts and totals
- RateNumber: non-negative; for per-second and throughput metrics
- GaugeNumber: finite number; may be negative if semantically valid

### CategoryList
- Type: array of CategoryName
- Constraints:
  - `uniqueItems: true` (no duplicates)
  - `minItems: 1`
- Example: `["DATABASE", "API_ROUTES"]`

---

*End of RDCP Protocol Specification v1.0*
