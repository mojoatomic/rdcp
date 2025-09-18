# Operational Production Guide

This guide provides actionable patterns for running RDCP (with or without OpenTelemetry) in production at scale.

Key Topics
- Authentication at scale
- Rate limiting and backoff strategies
- Multi-tenancy configuration and isolation
- Kubernetes deployment and probes
- Service mesh (Istio/Linkerd) trace context propagation
- Multi-environment configuration management

Authentication at Scale
- Use centralized identity (OIDC/SAML) for operator actions on control endpoints
- API keys for service-to-service authentication; rotate quarterly
- Validate JWTs with audience/scope checks for Standard security level
- mTLS for Enterprise: validate subject/issuer, pin CAs, short-lived certs

Rate Limiting
- Control endpoints: strict quotas (e.g., 60 req/min per client/tenant)
- Burst protection: token bucket with jittered backoff on 429
- Observability exporters: batch exports with retry + exponential backoff

Retries and Idempotency
- Make control operations idempotent with requestId
- Use 409 Conflict for double-apply attempts; return prior state
- Client retry policy: 3 attempts, exponential backoff (100ms, 300ms, 900ms)

Multi-Tenancy Configuration
- Headers: X-RDCP-Tenant-ID, X-RDCP-Isolation-Level, X-RDCP-Tenant-Name (optional)
- Isolation levels: global, process, namespace, organization
- Persist tenant configuration separately; enforce schema/namespace boundaries
- Include tenant info in all responses per RDCP WARP.md

Kubernetes Deployment Patterns
- Probes: /rdcp/v1/health for liveness/readiness
- Resources: set requests/limits; budget ~100MB extra memory for RDCP+OTel
- Rolling updates: maxUnavailable=0, maxSurge=1 for zero-downtime
- Secrets: mount via Secret/CSI; never commit keys; rotate with annotations

Service Mesh Integration
- Ensure B3/W3C TraceContext headers are propagated through mesh
- Istio: enable Envoy tracing; configure sampling to match OTel
- Linkerd: configure header propagation via service profile
- Validate trace continuity across services with e2e tests

Multi-Environment Configuration
- Dev: sampling=100%, debug categories=['api','database','cache']
- Staging: sampling=10%, categories=['api','database']
- Prod: sampling=1%, categories=['api'] by default
- Use config maps or env vars; avoid code redeploys for toggles

Operational Runbook
- On-call checks: RDCP health endpoints, exporter queue depth, error rates
- Incident playbooks: disable heavy categories, raise sampling temporarily
- Post-incident: export trace IDs, correlate with RDCP audit logs

Metrics to Monitor
- RDCP: queue depth, debug processing latency, correlation rate
- OTel: export queue size, dropped spans, exporter errors
- App: p50/p95/p99 latency, CPU, memory, GC pauses

SLO Examples
- Availability: 99.9% for /rdcp/v1/* endpoints
- Control latency: p95 < 200ms
- Trace correlation: > 95% for debug calls under sampled traces

Change Management
- Gated rollouts for new categories; feature flags
- Version RDCP responses; validate protocol='rdcp/1.0'
- Record all changes in audit log with operator identity and method

Checklist
- [ ] Health and readiness probes configured
- [ ] Sampling tuned per environment
- [ ] Categories constrained in production
- [ ] Secrets rotated and audited
- [ ] Rate limits enforced
- [ ] Audit trail enabled and centralized
- [ ] Mesh header propagation verified

