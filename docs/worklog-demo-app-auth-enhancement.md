# Worklog: Demo App Authentication & Security Enhancements

Branch: demo-app/auth-enhancement
Date: 2025-09-19

Overview
- Strengthened authentication across all RDCP security levels (basic, standard, enterprise)
- Added tenant-scoped routes with RBAC for bearer JWT
- Hardened enterprise mTLS validation with environment-driven allowlists
- Adjusted hybrid (mTLS + JWT) behavior and logging
- Expanded e2e test coverage and added developer documentation

What’s completed
1) Tenant-scoped RBAC (bearer-only)
- Routes in demo app:
  - GET /rdcp/v1/tenants/:tenantId/settings → requires read or read:<tenantId>
  - POST /rdcp/v1/tenants/:tenantId/control → requires control or control:<tenantId>
- Extended rate limiting and audit trail to tenant control route
- e2e tests added for tenant-scoped read/control

2) Enterprise mTLS hardening
- Certificate validator reads allowed/trusted values from environment at runtime
- Enforced checks (configurable via env):
  - RDCP_ALLOWED_CERT_SUBJECTS: comma-separated CN allowlist
  - RDCP_TRUSTED_CA_FINGERPRINTS: comma-separated issuer/leaf SHA-256 fingerprints
- Added tests for allowlist and fingerprint enforcement

3) Hybrid authentication adjustments (mTLS + JWT)
- Subject matching: when JWT is present, sub must equal certificate CN
- Fallback behavior: invalid JWT with valid cert continues with cert-only (intentional)
- Logging behavior:
  - Default: fallback logged at debug level only
  - Opt-in warnings via RDCP_WARN_ON_HYBRID_FALLBACK='true' or development env
- Documented in docs/logging.md and docs/testing-helpers.md

4) RDCP header enforcement
- All /rdcp/v1/* endpoints enforce X-RDCP-Auth-Method and X-RDCP-Client-ID (/.well-known/rdcp remains open)
- Fail fast with RDCP_AUTH_REQUIRED (401) when missing/invalid

5) Standardized error responses and testing helpers
- docs/error-responses.md: canonical error shape and code/status mapping
- docs/testing-helpers.md: JWT helpers, tenant and hybrid patterns, mTLS simulation
- README and wiki updated to link these resources

6) New e2e tests (highlights)
- tests/demo-app.auth.e2e.test.js: expanded with control-scope checks for bearer
- tests/demo-app.tenant.e2e.test.js: tenant-scoped read/control flows

Files touched (high-level)
- Source
  - src/auth/certificate-validator.ts (env-driven validation; subject allowlist)
  - src/auth/enterprise.ts (hybrid logging level)
  - src/utils/logger.ts (logging behavior)
  - packages/rdcp-demo-app/src/app.js (tenant routes, RBAC, rate limiting, audit)
- Tests
  - tests/demo-app.auth.e2e.test.js (mTLS/hybrid/headers; control scope)
  - tests/demo-app.tenant.e2e.test.js (tenant RBAC)
- Documentation
  - docs/error-responses.md (NEW)
  - docs/testing-helpers.md (NEW)
  - docs/logging.md (NEW)
  - README.md (links)
  - wiki/Home.md (links)
  - wiki/examples/RDCP-Demo-App.md (auth + notes)

Quick verification
- Run auth/tenant-focused tests
  - npm test -- --testPathPattern=demo-app.auth.e2e
  - npm test -- --testPathPattern=demo-app.tenant.e2e
- Bearer control scope checks (examples)
  - Expect 403 without 'control' scope on POST /rdcp/v1/control
  - Expect 200/405 with 'control' in scopes
- Tenant-specific control checks (examples)
  - Token with control:tenant-A works for tenant-A and is denied for tenant-B
  - Global control scope works for any tenant
- Hybrid fallback logging
  - Default: debug only
  - RDCP_WARN_ON_HYBRID_FALLBACK='true' → warnings enabled
- mTLS hardening
  - Set RDCP_ALLOWED_CERT_SUBJECTS and RDCP_TRUSTED_CA_FINGERPRINTS to verify allowlist/fingerprint enforcement

Remaining tasks (prioritized)
1) Documentation alignment
- Update wiki/examples/RDCP-Demo-App.md Roadmap: move recently completed items from "Next" to "Done" and add new next steps
- Add short section with curl examples for tenant-scoped routes and bearer control scope

2) Temporary controls (TTL)
- Add CLI/script and minimal examples to enable categories temporarily with automatic expiry

3) Multi-tenancy response shape
- Add explicit tenant object in responses when multi-tenant headers are used, per WARP.md standards

4) Negative coverage (auth)
- Additional hybrid negatives (subject mismatch, fingerprint mismatch variants)
- Additional tenant-scoped denial cases

5) Developer UX
- Postman/HTTPie examples for standard flows (optional)

Appendix – commit summary (since origin/demo-app/auth-enhancement)
- e2137db docs(wiki): link error/testing/logging docs; demo app notes on tenant RBAC, mTLS hardening, hybrid logging
- 355bdd5 docs: add error responses, testing helpers, logging env docs; link from README
- 49d153b tests: e2e tenant-scoped read/control RBAC; enforce bearer-only tenant routes
- 016bec5 demo-app: tenant-scoped routes + RBAC helpers; extend rate limit and audit
- 3512a71 auth: hybrid JWT fallback downgraded to debug; env-gated warn
- d5d43ff test(demo-app): harden enterprise mTLS and hybrid auth; add env-driven allowlist/CA fingerprint tests; runtime env reading for validator
