# Enterprise: Rate Limiting and Persistent Audit (Design Draft)

Status: Draft
Epic: #11
Related: #12 (Rate limiting), #13 (Persistent audit trail)

Goals
- Provide first-class, configurable rate limiting (per-endpoint and per-tenant)
- Provide persistent, structured audit logging with retention and optional tamper-evidence
- Keep disabled-mode overhead near zero

Header Semantics
- X-RateLimit-* (default): X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After
- Standard (optional, draft-7): RateLimit: "limit=<n>, remaining=<n>, reset=<sec>", RateLimit-Policy: "<n>;w=<sec>"

Config Examples
```ts
const middleware = createRDCPMiddleware({
  authenticator,
  capabilities: {
    rateLimit: {
      enabled: true,
      headers: true,
      headersMode: 'draft-7', // or 'x'
      defaultRule: { windowMs: 60000, maxRequests: 120 },
      perEndpoint: { control: { windowMs: 10000, maxRequests: 10 } },
      perTenant: { 'tenant-A': { windowMs: 60000, maxRequests: 30 } }
    },
    audit: {
      enabled: true,
      sink: 'file',
      file: { path: 'rdcp-audit.log', maxBytes: 5 * 1024 * 1024, maxFiles: 5 },
      sampleRate: 0.5,
    },
  }
})
```

Scope (MVP)
- Rate limiting
  - Config surface: global defaults; per-endpoint overrides; per-tenant overrides
  - Algorithm: token bucket or sliding window (deterministic, low overhead)
  - Headers: standard X-RateLimit-* when enabled
  - Error: RDCP_RATE_LIMITED (429) with protocol-compliant error body
  - Tenant isolation: limits tracked per-tenant when tenant context present
  - Observability: counters for total and limited requests
- Persistent audit
  - Sink: file-based append-only (default) + pluggable interface
  - Record: timestamp, action, categories, tenantId, auth method, clientId, statusCode, requestId, optional hashPrev
  - Retention: rotation by size/time; pruning policy
  - Security: optional hash chaining; redact hooks for PII/sensitive fields
  - Sampling: configurable sampling for high-volume deployments

Acceptance Criteria
- Limits enforced per-endpoint and per-tenant; correct burst/steady-state behavior
- Standard headers present when enabled; absent when disabled
- Audit writes durable across rotation boundaries
- Optional hash chaining validates continuity when enabled
- Redaction hooks demonstrated by tests; no sensitive fields leak by default
- Zero/near-zero overhead when features disabled

Testing Plan
- Unit tests: limiter core, header emission, audit record shape, rotation, hash chain
- Integration tests: 429 thresholds, tenant isolation, concurrent flows, durability
- Negative tests: invalid configs, rotation edge cases, redaction policy mistakes

Docs
- Configuration reference with examples
- Operational runbook: sizing, tuning, rotation, sampling, troubleshooting

Implementation Notes
- Start with in-memory limiter; consider pluggable store interface
- Use append-only file sink with rotation helpers; expose interface for external SIEMs
- Ensure no breaking changes; features opt-in via capabilities/options
