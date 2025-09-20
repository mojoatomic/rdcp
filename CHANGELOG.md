# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-09-20

Features
- Rate limiting: structured RDCP_RATE_LIMITED error details (limit, remaining, reset epoch, retryAfterSec, policy, requestId)
- Standard RateLimit headers (draft-7) across adapters; Retry-After on limited responses; legacy X-RateLimit-* optional
- Audit failure behavior: failureMode 'warn' adds Warning: 199 rdcp "audit-write-failed"; 'fail' returns RDCP_AUDIT_WRITE_FAILED (500)
- Request correlation: adapters echo X-Request-Id on all RDCP responses; generate a new UUID when X-RDCP-Request-ID is absent

Hardening
- Strict validation of X-RDCP-Request-ID (must be UUID); invalid returns RDCP_REQUEST_ID_INVALID (400)
- Centralized error-to-HTTP status mapping in adapters
- Rate limiter event cleanup moved to finally blocks in all adapters to prevent leaks

Docs & Tests
- New wiki/Rate-Limiting.md; updated Home.md, Error-Responses.md, Basic-Usage.md, Authentication-Setup.md, Testing-Helpers.md
- Cross-adapter e2e tests for X-Request-Id echo/validation and RateLimit headers; demo app e2e tests for warning header behavior

## [1.0.0] - 2025-09-17
- Initial stable release with Express, Fastify, Koa adapters; authentication (basic/standard/enterprise); protocol endpoints; TypeScript support.
