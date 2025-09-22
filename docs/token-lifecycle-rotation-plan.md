# Token Lifecycle & Key Rotation — Design Plan (Context7-aligned)

Status: Draft (Incremental delivery)
Owner: RDCP SDK Core
Scope: Server core + Express/Fastify/Koa adapters + Demo app

## Goals
- First-class token lifecycle with safe rotation for:
  - JWT (Standard security level) with `kid`-based verification and JWKS exposure
  - Opaque API keys (Basic security level) with hashed-at-rest storage
- Rotation policy with grace windows, metrics, and complete audit
- Pluggable verification/signing strategy (keeps today’s `jsonwebtoken`, allows `jose` for JWKS & advanced crypto)
- No raw secrets in logs or at rest (only identifiers and hashes)

## Non-goals (for this increment)
- Distributed KMS integration (can be added later)
- UI/portal for key management (admin CLI/endpoints only)

## Context7 alignment and references
We follow Context7 best practices by using established JOSE guidance:
- JOSE (panva/jose) for JWKS and rotation mechanics
  - createRemoteJWKSet for JWKS consumption
  - jwksCache for stable cache between invocations

References:
- /panva/jose → docs: createRemoteJWKSet, JWKS cache usage

## Architecture overview
- Keyring abstraction (in-memory for now):
  - active: set of current signing keys (JWT) and current API key hashes
  - previous: bounded set of prior keys/hashes with retirementAt timestamps (grace window)
  - kid: every signing key has an immutable key id; JWTs are signed with kid in header
  - policies: algorithms allowed, grace window duration, rotation cadence

- JWT flow (Standard security):
  - Sign: select active signing key, set `kid`, sign with allowed alg (default RS256)
  - Verify: resolve by `kid`; if missing, attempt alg + key metadata (configurable), otherwise reject
  - JWKS: expose public keys at `/.well-known/jwks.json` with cache headers; omit private material
  - Rotation: add new key → move previous active into `previous` with retirementAt → after grace, drop

- API Key flow (Basic security):
  - Issue: generate opaque key with recognizable prefix (e.g., `rdcp_sk_`)
  - Store: hash using strong KDF (argon2id or scrypt); store hash + metadata (createdAt, lastUsedAt)
  - Verify: constant-time compare of provided key (prefix-checked) to stored hash
  - Rotate: issue replacement; retire old after grace window

- Audit & Metrics:
  - Audit records for: issue, rotate, retire, verify (success/failure) with tokenId/keyId only
  - Metrics counters: verifications, failures, rotations, grace-window hits

## Configuration surface (capabilities)
- security.tokenLifecycle.enabled: boolean (default: false)
- security.jwt:
  - alg: 'RS256' | 'ES256' | ... (default: RS256)
  - jwks.enabled: boolean (default: true when lifecycle enabled)
  - jwks.path: '/.well-known/jwks.json'
  - rotation: { cadence: '30d', graceWindow: '7d' }
- security.apiKeys:
  - prefix: 'rdcp_sk_'
  - kdf: 'argon2id' | 'scrypt' (default: scrypt for zero-dependency)
  - rotation: { cadence: '90d', graceWindow: '30d' }
- failureMode for verification backends: 'ignore' | 'warn' | 'fail'

## Endpoints (minimal)
- GET `/.well-known/jwks.json` (public): returns public JWKs (active + previous within grace)
  - Cache-Control: public, max-age=300
  - ETag: weak etag of key set

- Admin (future increments, behind RBAC + audit):
  - POST `/admin/keys/jwt/rotate` → rotate signing key
  - POST `/admin/keys/api/issue` → create new API key (returns secret once)
  - POST `/admin/keys/api/retire` → retire API key

## Data model (in-memory first)
- SigningKey: { kid, alg, publicKey, privateKey, createdAt }
- ApiKeyRecord: { keyId, hash, createdAt, lastUsedAt?, retiredAt? }
- KeyringState: {
  jwt: { active: SigningKey[], previous: { key: SigningKey, retirementAt: Date }[] }
  api: { active: ApiKeyRecord[], previous: { key: ApiKeyRecord, retirementAt: Date }[] }
}

## Rotation policy
- Manual rotation endpoint/CLI (MVP); scheduled rotation later
- On rotation:
  - Generate new key, promote to active[0]
  - Move old active to previous[] with retirementAt = now + graceWindow
  - Emit audit + metrics
- On verification:
  - Accept tokens signed by active or previous (if now < retirementAt)
  - After graceWindow passes, reject and drop previous key on next compaction

## Failure modes & security
- Never log secrets or full tokens; use tokenId/keyId and requestId
- Audit redaction by default; sampling allowed
- Verification backend errors respect failureMode; warn emits Warning header

## Test Plan (Increment 1)
- Unit (core keyring):
  - verifies JWT signed by active key
  - verifies JWT signed by previous key within grace
  - rejects JWT signed by retired key after grace
  - includes `kid` in signed JWT and uses it for resolution
  - API key verification passes for correct key and fails otherwise
  - audit redaction: no raw secrets stored or logged

- E2E (later increments):
  - jwks.json exposure and caching headers
  - rotation workflow with grace-window acceptance

## Implementation Plan (phased)
1) Core keyring + verification (MVP)
   - src/server/keyring.ts with signJwt, verifyJwt, rotate, hashApiKey, verifyApiKey
   - No external persistence (in-memory)
   - Use existing jsonwebtoken for tests; allow swapping to jose later
2) JWKS + signing headers
3) Rotation workflow + admin surfaces
4) Hardening and docs

## Open questions
- Default algorithms: RS256 vs ES256 trade-offs for users
- KDF choice: scrypt for portability vs argon2id for strength (dependency footprint)
- Pluggable persistence hook for keyring state (for horizontal scale)

## Appendix: Context7 snippets
- jose.createRemoteJWKSet: resolve `kid` with cooldown and cache
- jose.jwksCache: illustrate exporting/importing cache between invocations
