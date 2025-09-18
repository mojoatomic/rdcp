# Security and Compliance Guidelines for RDCP + OpenTelemetry

This guide covers security and compliance considerations for deploying RDCP with or without OpenTelemetry across environments.

Core Principles
- Minimize sensitive data exposure in logs and traces
- Enforce authentication and authorization consistently across RDCP endpoints
- Maintain auditable trails for all control operations
- Align retention policies with legal and regulatory requirements

Data Protection and Redaction
- Implement data classification and tagging for log/tracing fields
- Redact PII/PHI fields at source using allowlists/denylists
- Apply field-level hashing for identifiers (e.g., userId) when needed
- Ensure TLS in transit for all RDCP and trace export traffic

Retention Policies (by environment)
- Development: 7–14 days
- Staging: 14–30 days
- Production: 30–90 days (per legal/compliance)
- Highly regulated: align with specific frameworks (HIPAA, SOC2, PCI)

Audit Trail Requirements
- Log every control change: who, what, when, where, how
- Include requestId, operator identity, auth method, tenant context
- Store audit logs in immutable storage (WORM/S3 Object Lock) where required

Authentication and Authorization
- Basic: API key (32+ chars), constant-time comparison
- Standard: Bearer (JWT/OAuth2) with scopes and expiration
- Enterprise: mTLS + token (certificate validation, issuer/subject)
- Required headers for all levels:
  - X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
  - X-RDCP-Client-ID: <client-id>
  - X-RDCP-Request-ID: <uuid>

Compliance Considerations
- SOC2: access controls, audit logging, data retention, change management
- GDPR: data minimization, right to erasure (avoid storing raw PII in traces/logs)
- HIPAA: avoid PHI in traces/logs; if required, ensure BAA with vendor and encryption
- PCI-DSS: never log PAN/CVV; tokenize or fully redact payment data

OpenTelemetry-Specific Guidance
- Use attribute allowlists for spans and events
- Avoid high-cardinality PII in tags (e.g., emails, full names)
- Prefer opaque identifiers; store mapping in secure systems
- Configure sampler to avoid excessive sensitive data export

RDCP Control Endpoint Security
- Rate-limit control operations (token bucket; per client/tenant)
- Require strong operator identity (SAML/OIDC) for control actions
- Enforce least-privilege via scopes/roles (enable:category, disable:category)
- Maintain audit log with full context and protocol: "rdcp/1.0"

Multi-Tenancy and Isolation
- Include tenant headers: X-RDCP-Tenant-ID, X-RDCP-Isolation-Level
- Ensure isolation at org/namespace level per policy
- Prevent cross-tenant data leakage by schema separation or filters

Secure Deployment Checklist
- [ ] TLS everywhere (RDCP endpoints and exporters)
- [ ] Secrets via env/secret manager (no plaintext in repos)
- [ ] Rotate API keys/tokens regularly
- [ ] mTLS for enterprise environments
- [ ] Centralized audit logs with retention/immutability
- [ ] Rate limits for control endpoints
- [ ] Attribute allowlists and redaction for traces/logs
- [ ] DLP policies enforced in observability backends

Incident Response
- Document procedures for data exposure via logs/traces
- Automate trace/log scrubbing workflows where supported
- Monitor for forbidden fields in exports (regex rules)

Vendor-Specific Notes: Datadog
- Secrets: Use DATADOG_API_KEY via env/secret manager; never log or echo
- Sites: Set DD_SITE (e.g., datadoghq.com, datadoghq.eu) to route exports correctly
- Agent hardening: Enable only required receivers (HTTP/GRPC) and restrict inbound network
- OTLP via Agent: Prefer Agent path to avoid embedding API keys in apps; use:
  - DD_APM_ENABLED=true
  - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT=0.0.0.0:4318
  - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT=0.0.0.0:4317
- Direct OTLP: If using direct ingestion, set exporter URL to https://otlp.<DD_SITE>/v1/traces with header DD-API-KEY
- Attribute hygiene: Prefer allowlists for http.request/response headers; avoid PII/PHI
- Mapping:
  - OTEL_SERVICE_NAME → DD_SERVICE
  - service.version → version (or DD_VERSION)
  - deployment.environment → env (or DD_ENV)

References
- RDCP WARP.md security requirements
- OpenTelemetry Security Best Practices
- Datadog: OpenTelemetry environment variable support, Collector exporter configuration
