# RFC: discovery.ui (optional UI metadata)

Goal: allow servers to publish optional, backward‑compatible UI hints that a headless admin‑ui builder can consume to produce a richer Admin UI. When `ui` is absent, the builder degrades gracefully to a generic UI.

Non‑goals: do not duplicate protocol semantics; do not leak secrets; do not introduce required runtime dependencies.

Schema (illustrative v1)
```json path=null start=null
{
  "version": "1.0",
  "categoryDescriptions": {
    "DATABASE": "SQL query logging"
  },
  "groups": [
    { "id": "logging", "label": "Logging & Tracing", "categories": ["DATABASE", "API_ROUTES"] }
  ],
  "constraints": {
    "ttl": { "min": "30s", "max": "15m", "default": "2m" }
  },
  "preferredAuth": "bearer",
  "multiTenant": true
}
```

Contract
- Placed under discovery: `{ protocol, endpoints, capabilities, security, ui? }`
- `ui` is optional and versioned (`ui.version`)
- No secrets; only presentation hints and constraints the client cannot infer

Builder mapping (P0)
- categories → ToggleGroup
- constraints.ttl → DurationInput
- capabilities (tenants present) → TenantSelect
- StatusPanel + SubmitBar always present
- groups (if provided) partition ToggleGroup by category assignment; default to a single group if absent

Versioning
- Independent `ui.version` to evolve metadata without changing protocol version
- Clients may warn/ignore on unknown versions or fields

Degradation
- When `ui` is absent, render a generic UI: one group with all categories, basic status + submit

Security
- No auth/key material in `ui`
- Only capability‑level hints that are already safe to expose via discovery

Next steps
- Add a typed JSON schema to @rdcp.dev/core for `ui` (optional export)
- Add headless mapping tests in @rdcp.dev/admin-ui
- Consider framework renderers (react) as a follow‑up
