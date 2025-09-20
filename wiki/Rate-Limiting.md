# Rate Limiting

This page documents the RDCP SDK's rate limiting capability, including configuration, standard headers (draft-7), and structured error details.

## Overview

- Supports per-endpoint and per-tenant token-bucket limits.
- Emits standard RateLimit draft-7 headers when enabled (or legacy X-RateLimit-* headers when configured).
- Returns RDCP_RATE_LIMITED (429) with structured error details when a request is limited.
- Adapters (Express, Fastify, Koa) behave identically and clean up per-request rate events in a finally block.

## Configuration

Enable and configure rate limiting via RDCPServer options in your adapter setup.

```ts path=null start=null
import express from 'express'
import { adapters, auth } from '@rdcp/server'

const app = express()
app.use(express.json())

app.use(
  adapters.express.createRDCPMiddleware({
    authenticator: auth.validateRDCPAuth,
    capabilities: {
      rateLimit: {
        enabled: true,
        headers: true,            // emit standard RateLimit headers
        headersMode: 'draft-7',   // 'draft-7' | 'x'
        defaultRule: { windowMs: 60000, maxRequests: 120 },
        perEndpoint: {            // optional endpoint-specific rules
          control: { windowMs: 10000, maxRequests: 10 },
          status: { windowMs: 500, maxRequests: 5 },
        },
        perTenant: {              // optional tenant-specific rules
          'tenant-A': { windowMs: 60000, maxRequests: 30 },
        },
      },
    },
  })
)

app.listen(3000)
```

Notes:
- headers: true enables header emission. headersMode selects between standard draft-7 and legacy X-RateLimit-*.
- The token-bucket limiter refills continuously over the window, enforcing an average rate.

## Standard Headers (draft-7)

When headers are enabled in 'draft-7' mode, responses include:
- RateLimit: e.g. "limit=10, remaining=7, reset=30"
- RateLimit-Policy: e.g. "10;w=60"
- RateLimit-Remaining: numeric remaining tokens
- RateLimit-Reset: epoch seconds when the window resets
- Retry-After: seconds until retry is permitted (when the request was limited)

Legacy mode ('x') uses:
- X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, plus Retry-After on limited responses.

Example (viewing headers on discovery):
```bash path=null start=null
curl -i \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H 'Authorization: Bearer dev-key-change-in-production-min-32-chars' \
  http://localhost:3000/.well-known/rdcp | grep -i 'ratelimit\|retry-after'
```

## Structured Error Details (RDCP_RATE_LIMITED)

When a request is rate limited, the server returns 429 with:
```json path=null start=null
{
  "error": {
    "code": "RDCP_RATE_LIMITED",
    "message": "Control rate limited. Retry after 300ms",
    "protocol": "rdcp/1.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "details": {
      "limit": 10,
      "remaining": 0,
      "reset": 1737072000,
      "retryAfterSec": 1,
      "policy": "10;w=60",
      "requestId": "b8e6f..."  
    }
  }
}
```

Field meanings:
- limit: configured token capacity in the window.
- remaining: tokens remaining after the current request attempt (0 when limited).
- reset: epoch seconds for when the limiter is considered reset.
- retryAfterSec: seconds to wait before retrying (optional, present on limited responses).
- policy: human-readable policy string "<limit>;w=<windowSeconds>".
- requestId: correlation id, present when available.

## Cross-adapter Behavior

- Express, Fastify, and Koa adapters:
  - Emit identical RateLimit headers when enabled (per headersMode).
  - Return the same RDCP_RATE_LIMITED structure.
  - Always echo a correlation id as X-Request-Id in responses. If clients supply X-RDCP-Request-ID (UUID), it is echoed; otherwise a UUID is generated. Invalid IDs return RDCP_REQUEST_ID_INVALID (400).
  - Clean up per-request rate limiter state in a finally block to prevent leaks on all code paths.

## Quick Tests

- Successful request with headers:
```bash path=null start=null
curl -i \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: test-client' \
  -H 'Authorization: Bearer dev-key-change-in-production-min-32-chars' \
  http://localhost:3000/.well-known/rdcp
```

- Force a 429 on control (tight threshold):
```bash path=null start=null
export RATE_LIMIT_CONTROL_MAX=1
export RATE_LIMIT_CONTROL_WINDOW_MS=2000
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: rl-test' \
  -H 'Authorization: Bearer dev-key-change-in-production-min-32-chars' \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/control
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: rl-test' \
  -H 'Authorization: Bearer dev-key-change-in-production-min-32-chars' \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/control
```

See also:
- Error-Responses.md (RDCP_RATE_LIMITED details)
- Basic-Usage.md (capabilities configuration)
- Monitoring & Metrics (Monitoring.md) — /status measured metrics and Prometheus /metrics
