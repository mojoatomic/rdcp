# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

Features
- Core: centralize protocol constants in `@rdcp.dev/core` (`PROTOCOL_VERSION`, `RDCP_HEADERS`, `RDCP_PATHS`)
- Core: centralize RDCP protocol error codes and type in `@rdcp.dev/core` (`RDCP_ERROR_CODES`, `RDCPErrorCode`)
- Core: centralize protocol Zod schemas in `@rdcp.dev/core`; `@rdcp.dev/server` re-exports for back-compat
- JWKS client: inflight request deduplication per (url + etag)
- JWKS client: optional persisted cache (file-backed via cachePath) and pluggable store
- JWKS client: background refresh when nearing TTL expiry (refreshThresholdMs)

Docs
- New: docs/protocol-schemas.md — schema reference and usage examples
- Updated: packages/rdcp-core/README.md and docs/core-package-boundaries.md to reflect core protocol scope (constants, error codes, schemas)
- README: document JWKS TTL/ETag behavior, persisted cache, and background refresh usage

Tests
- Add concurrency dedupe test and persisted cache-load test for JWKS client

## [1.2.0] - 2025-09-22

Features
- JWKS endpoints with strong ETag and conditional GET (If-None-Match → 304) for Express, Fastify, Koa
- Configurable Cache-Control; optional Last-Modified and Vary headers
- JwksFetcher helper with ETag revalidation and ttlMs cache override (304 does not extend TTL)
- JWKS utilities: canonicalize/stable stringify + strong SHA-256 base64url ETag
- Filter utilities: filterJwksKeys and findJwkByKid for safe key selection

Examples & Docs
- ts-node demo: examples/jwks-client-cache-demo.ts with how-to run
- Deno/Bun examples in wiki/Examples-Deno-Bun.md
- JWKS wiki updates: JOSE verification snippet, TTL FAQ, and demo run instructions
- README: TTL semantics + backoff and key-filter usage

Tests
- E2E: JWKS endpoints return ETag and 304 when unchanged across adapters
- E2E: Client cache demo exercises ttlMs, 304 revalidation, ETag change after rotation
- Unit: ETag changes when JWKS content changes (post-rotation)

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
