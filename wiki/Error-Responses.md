# RDCP Standard Error Responses

This document describes the canonical error response shape and common error codes used by the RDCP SDK, along with examples and testing patterns.

Standard error object shape
- Field semantics
  - error.code: String error code (see RDCP_ERROR_CODES)
  - error.message: Human-readable message suitable for logs/ops; avoid leaking secrets
  - error.protocol: Always 'rdcp/1.0'
  - error.timestamp: ISO-8601 timestamp
  - error.requestId (optional): Correlation ID when available
  - error.details (optional): Structured context (e.g., validation info)

- Example
```json
{
  "error": {
    "code": "RDCP_AUTH_REQUIRED",
    "message": "Authentication required",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "requestId": "req_123",
    "details": { "hint": "Provide Authorization header" }
  }
}
```

Error codes and status mapping
- Defined in code
  - src/validation/errors.ts
    - RDCP_ERROR_CODES: full list of codes
    - ERROR_STATUS_MAP: stable mapping from code to HTTP status
  - Helper creators
    - createRDCPError(code, message)
    - createRDCPErrorWithStatus(code, message)

- Common codes
  - RDCP_AUTH_REQUIRED → 401 Unauthorized
  - RDCP_INVALID_TOKEN → 401 Unauthorized
  - RDCP_TOKEN_EXPIRED → 401 Unauthorized
  - RDCP_FORBIDDEN → 403 Forbidden
  - RDCP_VALIDATION_ERROR → 400 Bad Request
  - RDCP_RATE_LIMITED → 429 Too Many Requests
  - RDCP_NOT_FOUND → 404 Not Found
  - RDCP_INTERNAL_ERROR → 500 Internal Server Error
  - RDCP_UNAVAILABLE → 503 Service Unavailable

Examples
- 401 Unauthorized (missing/invalid auth)
```json
{
  "error": {
    "code": "RDCP_AUTH_REQUIRED",
    "message": "Authentication required: Bearer token required",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

- 403 Forbidden (insufficient scope)
```json
{
  "error": {
    "code": "RDCP_FORBIDDEN",
    "message": "Insufficient scope for tenant tenant-A",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

- 429 Too Many Requests (rate-limited)
```json
{
  "error": {
    "code": "RDCP_RATE_LIMITED",
    "message": "Too many control requests",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

- 400 Validation error (with details)
```json
{
  "error": {
    "code": "RDCP_VALIDATION_ERROR",
    "message": "Request validation failed: action must be one of: enable, disable, toggle, reset",
    "details": { "validation": "action must be one of: enable, disable, toggle, reset" },
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

Test assertion patterns (Supertest)
```js
// 401
expect(res.status).toBe(401)
expect(res.body?.error?.code).toBe('RDCP_AUTH_REQUIRED')

// 403
expect(res.status).toBe(403)
expect(res.body?.error?.code).toBe('RDCP_FORBIDDEN')

// 429
expect(res.status).toBe(429)
expect(res.body?.error?.code).toBe('RDCP_RATE_LIMITED')

// 400 with details
expect(res.status).toBe(400)
expect(res.body?.error?.code).toBe('RDCP_VALIDATION_ERROR')
expect(res.body?.error?.details).toBeTruthy()
```

Recommendations
- Always return protocol and timestamp in errors for operational consistency
- Include requestId when available for correlation
- Avoid warn/error logs for intentional control flow (e.g., hybrid fallback); prefer debug level unless explicitly required

---

Rate limiting details (standard headers + structured error)
- When rate limiting is enabled and a request is limited, adapters set standard draft-7 headers and include Retry-After.
  - Headers (draft-7):
    - RateLimit: e.g. "limit=10, remaining=0, reset=30"
    - RateLimit-Policy: e.g. "10;w=60"
    - RateLimit-Remaining: numeric remaining tokens
    - RateLimit-Reset: epoch seconds when the window resets
    - Retry-After: seconds until retry is permitted (when limited)
  - Legacy headers (if configured): X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Error body includes structured details:
```json
{
  "error": {
    "code": "RDCP_RATE_LIMITED",
    "message": "Control rate limited. Retry after 300ms",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "details": {
      "limit": 10,
      "remaining": 0,
      "reset": 1737072000,           // epoch seconds
      "retryAfterSec": 1,            // optional
      "policy": "10;w=60",          // limit;w=windowSeconds
      "requestId": "a8e6..."        // when available
    }
  }
}
```

Request ID validation
- If clients provide X-RDCP-Request-ID, it must be a UUID. If malformed, the adapters return RDCP_REQUEST_ID_INVALID (400) with details.
```json
{
  "error": {
    "code": "RDCP_REQUEST_ID_INVALID",
    "message": "Invalid X-RDCP-Request-ID format",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "details": { "expected": "uuid", "received": "not-a-uuid" }
  }
}
```

Audit failures and Warning header
- The server can be configured with audit.failureMode:
  - ignore (default): audit sink failures are ignored (logged only)
  - warn: response includes a Warning header
    - Warning: 199 rdcp "audit-write-failed"
  - fail: returns RDCP_AUDIT_WRITE_FAILED (500) with details { sink, reason, requestId? }

Example (audit fail mode):
```json
{
  "error": {
    "code": "RDCP_AUDIT_WRITE_FAILED",
    "message": "Audit sink write failed",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "details": { "sink": "file", "reason": "permission denied" }
  }
}
```
