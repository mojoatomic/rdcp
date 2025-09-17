# WARP.md - RDCP SDK Project Rules

This file provides development guidelines and rules for the RDCP (Runtime Debug Control Protocol) SDK project.

## Project Overview

**Project**: RDCP SDK  
**Purpose**: JavaScript/TypeScript SDK for implementing and consuming Runtime Debug Control Protocol v1.0  
**Repository**: rdcp-sdk  
**Language**: JavaScript/TypeScript (build tools only - NO `any` types allowed)

## RDCP-Specific Rules (CRITICAL)

### RDCP Protocol Compliance (MANDATORY)
- **ALWAYS** implement exact endpoint specifications from protocol docs
- **NEVER** deviate from RDCP v1.0 protocol specification
- **MUST** include `protocol: "rdcp/1.0"` in all responses
- **REQUIRED** endpoints: `/.well-known/rdcp`, `/rdcp/v1/discovery`, `/rdcp/v1/control`, `/rdcp/v1/status`, `/rdcp/v1/health`
- **ENFORCE** standard error codes: `RDCP_AUTH_REQUIRED`, `RDCP_FORBIDDEN`, `RDCP_VALIDATION_ERROR`, etc.

### Authentication Security Levels (NO VIOLATIONS)
- **Basic**: API key authentication (32+ character minimum)
- **Standard**: JWT Bearer tokens with scopes validation  
- **Enterprise**: mTLS + token hybrid authentication
- **CRITICAL**: Use constant-time comparison for API keys to prevent timing attacks
- **MANDATORY**: Support all three security levels with adapters

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
- **MUST** support tenant context headers: `X-RDCP-Tenant-ID`, `X-RDCP-Isolation-Level`
- **ISOLATION LEVELS**: `global`, `process`, `namespace`, `organization`
- **TENANT RESPONSES**: Include tenant context in all multi-tenant responses

## Essential Development Commands Pattern

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

**✅ SUCCESS Response Format:**
```javascript
// RDCP standard success response
return {
  protocol: 'rdcp/1.0',
  timestamp: new Date().toISOString(),
  // ... endpoint-specific data
}
```

**✅ ERROR Response Format:**
```javascript
// RDCP standard error response
return {
  error: {
    code: 'RDCP_ERROR_CODE',
    message: 'Human-readable message',
    protocol: 'rdcp/1.0'
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

## RDCP Security Requirements (NO VIOLATIONS)
- **API Keys**: Minimum 32 characters, constant-time comparison
- **JWT Tokens**: Proper signature validation, expiration checking
- **mTLS**: Certificate validation, subject/issuer verification
- **Rate Limiting**: Control endpoints limited to prevent abuse
- **Audit Trail**: All control operations logged for compliance levels

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

**Implementation Philosophy**: Strict protocol compliance over clever extensions  
**Enhancement Philosophy**: Add features only after protocol compliance  
**Goal**: Production-ready RDCP SDK that works across all JavaScript environments  

*This guide ensures RDCP protocol compliance while following WARP development standards.*