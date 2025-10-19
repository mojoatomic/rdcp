# RDCP Conformance Kit (Spec-as-Code)

Purpose
- Execute protocol conformance against any RDCP server via HTTP only
- Auto-select tests by reading `/.well-known/rdcp` (level + capabilities)
- Output JUnit, JSON, and Markdown compliance reports

Initial tasks (M1)
- Tag existing suites by capability/profile
- Extract black-box conformance tests under this folder (no repo internals)
- Add discovery-gating utility to select tests at runtime
- Provide config schema for auth fixtures (api-key, bearer, mTLS) and tenants

Notes
- Keep tests deterministic for TTL/rate-limit (window buffers)
- Prefer structured audit verification via headers/response; fall back to log line JSON format when available
- Map each test to requirement IDs for traceability
