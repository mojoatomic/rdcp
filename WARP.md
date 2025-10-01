# WARP.md - RDCP SDK Project Rules

This file provides development guidelines and rules for the RDCP (Runtime Debug Control Protocol) SDK project.

## Project Overview

**Project**: RDCP SDK  
**Purpose**: JavaScript/TypeScript SDK for implementing and consuming Runtime Debug Control Protocol v1.0  
**Repository**: rdcp-sdk  
**Language**: JavaScript/TypeScript (build tools only - NO `any` types allowed)

## RDCP-Specific Rules (CRITICAL)

### TypeScript Mandate (NEVER VIOLATE)
**CRITICAL**: The RDCP SDK MUST use TypeScript (.ts files) - NEVER suggest converting to JavaScript

**Why TypeScript for the RDCP SDK:**
- **Type Safety for Protocol Compliance** - RDCP has specific JSON schemas for requests/responses. TypeScript ensures implementations match the protocol exactly, preventing runtime errors from malformed data.
- **Developer Experience** - SDK users get autocompletion, compile-time error checking, and IntelliSense for all RDCP interfaces. This directly supports the "30-minute integration" goal.
- **Multi-Framework Support** - When building adapters for Express, Next.js, Fastify, etc., TypeScript provides consistent interfaces across all frameworks while catching framework-specific type mismatches.
- **WARP Compliance** - The WARP.md specifically forbids `any` types and requires strict typing. TypeScript enforces these rules at compile time.
- **Enterprise Adoption** - The RDCP target market includes enterprise and government-ready applications. TypeScript's static analysis aligns with enterprise development standards.
- **Protocol Evolution** - As RDCP evolves (v1.1, v2.0), TypeScript makes it easier to manage breaking changes and maintain backward compatibility through versioned type definitions.

**FORBIDDEN**: Converting .ts files to .js files
**REQUIRED**: All RDCP SDK code must be TypeScript
**ENFORCED**: Hours were spent converting FROM JavaScript TO TypeScript - never reverse this

### JavaScript vs TypeScript Context Boundaries (CRITICAL)
**The confusion is understandable because the RDCP project has multiple contexts where JS vs TS requirements differ:**

**Where JavaScript is Required:**
- Package.json and build configs - These are Node.js runtime files that expect JavaScript
- Documentation examples - The implementation guide uses JS for maximum compatibility across different project types
- Legacy integration examples - Showing how to integrate with existing JavaScript codebases
- Configuration files (jest.config.js, rollup.config.js, etc.)

**Where TypeScript is Required:**
- SDK core implementation - The actual @rdcp/server package needs full type safety
- Protocol type definitions - All RDCP request/response schemas need TypeScript interfaces
- Framework adapters - Express/Next.js/Fastify integrations need proper typing
- Public API surface - Anything users import from the SDK must be typed
- All source files in `src/` directory

**The Core Issue:**
WARP should never convert documentation examples to TypeScript when they should stay as JavaScript examples. The implementation guide's JS examples are intentionally generic - they're meant to be copied into any project type.

**Clear Boundaries:**
- SDK source code (`src/`): **Pure TypeScript**
- Documentation examples (`docs/`, `examples/`): **JavaScript for compatibility**
- Build/config files: **JavaScript (Node.js standard)**
- Type definitions (`.d.ts`): **TypeScript definitions for JS users**

**WARP Rule: Only convert files in `src/` to TypeScript, and leave everything in `docs/`, `examples/`, and config files as JavaScript. The examples are templates, not implementation code.**

**The RDCP spec itself is language-agnostic** - the confusion comes from mixing SDK development (needs TS) with documentation examples (should stay JS for broader compatibility).

### RDCP Protocol Compliance (MANDATORY)
- **ALWAYS** implement exact endpoint specifications from `/docs/rdcp-protocol-specification.md`
- **NEVER** deviate from RDCP v1.0 protocol specification
- **MUST** include `protocol: "rdcp/1.0"` in all responses
- **REQUIRED** endpoints: `/.well-known/rdcp`, `/rdcp/v1/discovery`, `/rdcp/v1/control`, `/rdcp/v1/status`, `/rdcp/v1/health`
- **ENFORCE** standard error codes: `RDCP_AUTH_REQUIRED`, `RDCP_FORBIDDEN`, `RDCP_NOT_FOUND`, `RDCP_VALIDATION_ERROR`, `RDCP_CATEGORY_NOT_FOUND`, `RDCP_RATE_LIMITED`, `RDCP_INTERNAL_ERROR`

### Authentication Security Levels (NO VIOLATIONS)
Implementations MUST declare their security level and support appropriate methods per `/docs/rdcp-protocol-specification.md`:

| Level | Use Case | Required Methods | Features |
|-------|----------|------------------|----------|
| `basic` | Development/Internal | API Key (32+ chars) | Simple shared secrets with constant-time comparison |
| `standard` | Production SaaS | Bearer Token (JWT/OAuth2) | User identity, expiration, scopes validation |
| `enterprise` | Regulated Industries | mTLS + Token | Certificate validation, full audit trail |

**CRITICAL**: All auth methods MUST include these headers:
```http
X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
X-RDCP-Client-ID: <client-identifier>
X-RDCP-Request-ID: <unique-request-id>
```

### SDK Architecture Rules (ENFORCED)
- **Client SDK**: Consume RDCP endpoints from external services
- **Server SDK**: Implement RDCP-compliant endpoints in applications  
- **Auth Adapters**: Pluggable authentication for all security levels
- **Validation**: Schema validation for all requests/responses
- **Utils**: Common utilities shared across client/server

### Debug Category Conventions
```javascript
// Standard debug categories (use these patterns)
const DEBUG_CATEGORIES = {
  DATABASE: 'Database operations and connections',
  API_ROUTES: 'HTTP request/response handling', 
  QUERIES: 'SQL and data query execution',
  REPORTS: 'Report generation and processing',
  CACHE: 'Cache operations and performance',
  AUTH: 'Authentication and authorization',
  INTEGRATIONS: 'Third-party service integrations'
}
```

### Multi-Tenancy Support (RDCP Standard)
When multi-tenancy is supported, implementations MUST accept per `/docs/rdcp-protocol-specification.md`:

```http
X-RDCP-Tenant-ID: <tenant-identifier>
X-RDCP-Isolation-Level: global|process|namespace|organization
X-RDCP-Tenant-Name: <human-readable-name>  # OPTIONAL
```

**ISOLATION LEVELS**:
| Level | Description | Scope |
|-------|-------------|-------|
| `global` | No isolation | All tenants share configuration |
| `process` | Process isolation | Configuration per process |
| `namespace` | Namespace isolation | Configuration per namespace |
| `organization` | Full isolation | Complete tenant separation |

**TENANT RESPONSES**: All responses in multi-tenant mode MUST include:
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

## Essential Development Commands Pattern

Git submodules (initialize/sync after clone and after pulling main):
- .wiki-edit — local working copy of the GitHub Wiki (tracks mojoatomic/rdcp.wiki)
- protocol — rdcp-protocol (language-agnostic spec)

Run these once after clone and whenever submodule pointers change:

```bash
git submodule sync --recursive
git submodule update --init --recursive
```

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Development server in background (for continued conversation - USE THIS)
npm run dev:background

# Full clean (removes node_modules and reinstalls)
npm run dev:full-clean

# Quick cleanup of hanging processes
npm run cleanup

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run lint
```

## Git Commit Standards
```bash
# ALWAYS use single quotes for commit messages (prevents shell issues)
git commit -m 'Add RDCP client authentication'
git commit -m 'Fix protocol discovery endpoint'
git commit -m 'Update validation schemas'

# FORBIDDEN - double quotes cause issues with special characters
git commit -m "Add new feature"  # Don't do this
```

## Testing Commands Pattern
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testNamePattern="rdcp-client"

# Run with coverage
npm test -- --coverage

# Run specific test in watch mode
npm test -- --watch client
```

## RDCP SDK File Length Limits (MANDATORY)
- **Client SDK Files**: **150 lines max**
- **Server Utility Files**: **200 lines max** 
- **Auth Adapter Files**: **100 lines max**
- **Validation Files**: **150 lines max**
- **Example Files**: **200 lines max**
- **Test Files**: **300 lines max**
- **Type Definitions**: **50 lines max**

**No exceptions** - split files if they exceed limits.

## RDCP-Specific Forbidden Actions
- **Custom protocol variations** (stick to RDCP v1.0 specification)
- **Non-standard endpoint paths** (must use `/rdcp/v1/` prefix)
- **Breaking authentication patterns** (must support all three security levels)
- **Custom error codes** (use standard RDCP error codes)
- **Protocol version negotiation** (v1.0 only for now)

## RDCP API Validation (CRITICAL)
- **ALL** RDCP requests MUST be validated against protocol schemas
- **NEVER** accept malformed requests
- **ALWAYS** return standard RDCP error responses
- **REQUIRED**: Validate authentication for control operations
- **MANDATORY**: Include request validation in all server utilities

**Example Validation Pattern**:
```javascript
// Standard RDCP validation
const result = validateControlRequest(requestBody)
if (!result.valid) {
  return createRDCPError('RDCP_VALIDATION_ERROR', result.error)
}
```

## RDCP Response Format Standards (ENFORCED)

**✅ Protocol Discovery Response (/.well-known/rdcp):**
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
    "required": true|false
  }
}
```

**✅ Standard SUCCESS Response Format:**
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  // ... endpoint-specific data
}
```

**✅ Standard ERROR Response Format:**
```json
{
  "error": {
    "code": "RDCP_ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "protocol": "rdcp/1.0"
  }
}
```

## AUTOMATED CONTEXT7 TRIGGERS (MANDATORY FOR RDCP)

**⚠️ CRITICAL: Automatically use Context7 for these RDCP scenarios:**

### RDCP Protocol Development (Always use Context7)
- Any RDCP endpoint implementation
- Authentication adapter development  
- Protocol schema validation
- Multi-tenancy implementation
- Performance metrics integration

### RDCP Integration & Configuration (Always use Context7)
- Framework-specific RDCP implementations
- Auth system integrations (Clerk, Auth0, etc.)
- Debug system configurations
- Multi-tenant header handling

### RDCP Troubleshooting (Always use Context7)
- Authentication failures in RDCP context
- Protocol compliance validation
- Tenant isolation issues
- Performance metric discrepancies
- Debug category enablement problems

## RDCP Endpoint Requirements (MANDATORY)

Per `/docs/rdcp-protocol-specification.md`, all endpoints MUST follow exact specifications:

### Required Endpoints Response Formats:

**GET /.well-known/rdcp** - Protocol Discovery
```json
{
  "protocol": "rdcp/1.0",
  "endpoints": { "discovery": "/rdcp/v1/discovery", "control": "/rdcp/v1/control", "status": "/rdcp/v1/status", "health": "/rdcp/v1/health" },
  "capabilities": { "multiTenancy": true|false, "performanceMetrics": true|false, "temporaryControls": true|false },
  "security": { "level": "basic|standard|enterprise", "methods": ["api-key", "bearer", "mtls"], "required": true|false }
}
```

**GET /rdcp/v1/discovery** - Debug System Discovery
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "categories": [{
    "id": "DATABASE",
    "enabled": true|false,
    "description": "Database operations",
    "tags": ["infrastructure"],
    "metrics": { "callsTotal": 1234, "callsPerSecond": 2.3 }
  }],
  "performance": {
    "overhead": {
      "cpu": { "value": 0.1, "unit": "percent", "measured": true|false },
      "memory": { "value": 1048576, "unit": "bytes", "measured": true|false }
    }
  }
}
```

**POST /rdcp/v1/control** - Runtime Control
```json
{
  "protocol": "rdcp/1.0",
  "requestId": "<request-id>",
  "success": true|false,
  "changes": [{
    "category": "DATABASE",
    "previousState": false,
    "newState": true,
    "effectiveAt": "2025-09-17T10:30:00Z"
  }],
  "audit": {
    "timestamp": "2025-09-17T10:30:00Z",
    "action": "enable",
    "operator": "user@example.com",
    "method": "bearer"
  }
}
```

**GET /rdcp/v1/status** - Status Monitoring
```json
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-17T10:30:00Z",
  "categories": {
    "DATABASE": {
      "enabled": true,
      "metrics": { "callsLastMinute": 123, "callsTotal": 45678, "lastActivity": "2025-09-17T10:29:55Z" }
    }
  }
}
```

**GET /rdcp/v1/health** - Health Check
```json
{
  "protocol": "rdcp/1.0",
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-09-17T10:30:00Z",
  "components": {
    "debugSystem": "operational|degraded|failed",
    "persistence": "operational|degraded|failed"
  }
}
```

## RDCP Security Requirements (NO VIOLATIONS)
- **API Keys**: Minimum 32 characters, constant-time comparison
- **JWT Tokens**: Proper signature validation, expiration checking
- **mTLS**: Certificate validation, subject/issuer verification
- **Rate Limiting**: Control endpoints limited to prevent abuse
- **Audit Trail**: All control operations logged for compliance levels

## RDCP Compliance Levels (PROTOCOL STANDARD)

Per `/docs/rdcp-protocol-specification.md`, implementations MUST declare compliance level:

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

## RDCP Testing Strategy

### Coverage Requirements (RDCP Specific)
- **Authentication flows**: **100% coverage** (all security levels)
- **Protocol endpoints**: **95% coverage**
- **Validation schemas**: **100% coverage**
- **Error handling**: **90% coverage**
- **Client SDK methods**: **85% coverage**

### RDCP Test Structure
- Test each security level independently
- Mock RDCP server responses for client tests
- Validate protocol compliance in integration tests
- Test tenant isolation in multi-tenant scenarios

## RDCP Development Best Practices

### Client SDK Implementation
- Always validate server protocol version
- Handle network failures gracefully
- Provide clear error messages for auth failures
- Support all three authentication methods
- Cache discovery responses appropriately

### Server SDK Implementation  
- Implement all required endpoints
- Support optional endpoints as specified
- Provide pluggable authentication
- Track performance metrics accurately
- Handle tenant context properly

### Authentication Implementation
- Never log sensitive auth data
- Use secure random generation for API keys
- Validate JWT signatures properly
- Handle certificate validation correctly
- Provide clear auth failure messages

## Common Troubleshooting (RDCP Specific)

### Authentication Issues
```bash
# Check API key length
echo $RDCP_API_KEY | wc -c  # Should be 33+ (including newline)

# Test authentication
curl -H "X-API-Key: $RDCP_API_KEY" http://localhost:3000/rdcp/v1/discovery
```

### Protocol Compliance Issues
```bash
# Validate protocol discovery
curl -s http://localhost:3000/.well-known/rdcp | jq '.protocol'
# Expected: "rdcp/1.0"

# Check required endpoints
curl -s http://localhost:3000/.well-known/rdcp | jq '.endpoints'
# Expected: All required endpoints listed
```

### Multi-Tenancy Issues
```bash
# Test tenant context
curl -H "X-RDCP-Tenant-ID: test-tenant" \
     -H "X-API-Key: $RDCP_API_KEY" \
     http://localhost:3000/rdcp/v1/discovery | jq '.tenant'
```

## RDCP SDK Architecture

```
src/
├── client/           # RDCP client SDK
│   ├── index.js      # Main client class
│   ├── discovery.js  # Protocol discovery
│   ├── control.js    # Debug control operations  
│   └── monitoring.js # Status and health monitoring
├── server/           # RDCP server utilities
│   ├── index.js      # Main server utilities
│   ├── endpoints.js  # Endpoint implementations
│   ├── debug.js      # Debug configuration
│   └── metrics.js    # Performance tracking
├── auth/             # Authentication adapters
│   ├── index.js      # Auth adapter factory
│   ├── basic.js      # API key authentication
│   ├── standard.js   # JWT Bearer tokens
│   └── enterprise.js # mTLS authentication
├── validation/       # Request/response validation
│   ├── index.js      # Validation utilities
│   ├── schemas.js    # RDCP schemas
│   └── errors.js     # Standard error responses
└── utils/            # Common utilities
    ├── index.js      # Utility exports
    ├── http.js       # HTTP client utilities
    └── tenant.js     # Multi-tenancy helpers
```

## Performance Considerations (RDCP Specific)
- Debug category checks should be zero-overhead when disabled
- Performance metrics should use minimal resources
- Authentication should use constant-time operations
- Cache discovery responses to reduce network calls
- Tenant isolation should not impact performance

---

## RDCP Protocol References (MANDATORY READING)

**Primary Sources (ALWAYS AUTHORITATIVE):**
- `/docs/rdcp-protocol-specification.md` - Complete RDCP v1.0 Protocol Specification
- `/docs/rdcp-implementation-guide.md` - Step-by-step Implementation Guide

**Implementation Validation:**
```bash
# Test against official protocol requirements
curl -s http://localhost:3000/.well-known/rdcp | jq '.protocol' # Must be "rdcp/1.0"
curl -s http://localhost:3000/rdcp/v1/discovery | jq '.timestamp' # Must be ISO-8601
curl -s http://localhost:3000/rdcp/v1/health | jq '.status' # Must be healthy|degraded|unhealthy
```

**CRITICAL**: Any deviation from `/docs/` specifications breaks RDCP v1.0 compliance.

---

**Implementation Philosophy**: Strict protocol compliance over clever extensions  
**Enhancement Philosophy**: Add features only after protocol compliance  
**Goal**: Production-ready RDCP v1.0 compliant SDK that works across all JavaScript environments  

*This guide ensures RDCP protocol compliance while following WARP development standards.*

## GitHub Wiki Links - Definitive Rules

1. **Root-level pages:** Use `[[Page-Name|Display Text]]`
2. **Subdirectory pages:** Use `[Display Text](subdir/Page-Name)`
3. **Never use:** `[[subdir/Page-Name]]` (doesn't work)
4. **Never use:** `raw.githubusercontent.com` URLs
