# RDCP Logging Options

Hybrid authentication fallback (mTLS + JWT)
- Behavior
  - If a JWT is provided but invalid, and the client certificate is valid, the system intentionally continues with certificate-only authentication.
  - This is normal operation in hybrid mode and should not be treated as an error by default.

- Log levels
  - Default: Debug level message only
  - Development or explicitly enabled: Warning message with request context

- Configuration
```bash
# Default (recommended): no warnings for hybrid fallback
export NODE_ENV=production

# Enable warnings for debugging (development or explicit opt-in)
export RDCP_WARN_ON_HYBRID_FALLBACK='true'
```

- Message shapes
  - Debug (default):
    - "Hybrid auth: JWT invalid, using certificate only"
  - Warn (development/explicit):
    - "JWT validation failed, continuing with cert-only auth" with fields { route, method, clientId }

Notes
- Keep WARN level for actionable problems only; avoid noisy logs that cause false alarms
- Use DEBUG for expected control flow transitions such as hybrid fallback
