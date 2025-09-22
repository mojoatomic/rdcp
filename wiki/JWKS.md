# JWKS (JSON Web Key Set) for RDCP JWT

Status: Available (capability-gated)

## What is JWKS?
A JWKS endpoint publishes the public keys used to verify JWTs signed with asymmetric algorithms (e.g., RS256, ES256). Clients, gateways, or relying services can fetch keys by `kid` to verify signatures without sharing private material.

## Enabling JWKS
- Capability flags (adapter options):
  - security.tokenLifecycle.enabled: true
  - security.tokenLifecycle.jwks.enabled: true
  - security.tokenLifecycle.jwks.maxAgeSeconds: 300 (default)
- Endpoint:
  - GET /.well-known/jwks.json (no auth)
- Headers: `Cache-Control: public, max-age=<seconds>`, `ETag: "<hash>"`
- Conditional GET supported: send `If-None-Match` with the ETag to receive `304 Not Modified` when unchanged
- Optional headers: `Last-Modified` and `Vary` (configurable via adapter options)

Example (Express):
```js path=null start=null
const mw = adapters.express.createRDCPMiddleware({
  authenticator,
  capabilities: {
    security: {
      tokenLifecycle: {
        enabled: true,
        jwks: { enabled: true, maxAgeSeconds: 300 }
      }
    }
  }
})
```

## Security notes
- Only asymmetric public keys are published (RSA/EC). Symmetric keys (HS256) are never exposed.
- Keys in previous rotation state are included only within the configured grace window.
- Set appropriate cache controls; consider ETag for large deployments (planned).

## Generating and rotating keys
RDCP server includes helpers via the keyring:
- Generate RS256 keypair: returns PEM strings
- Rotate into keyring: makes new key active; previous active moves to previous with a grace window.

Programmatic example:
```ts path=null start=null
import { createKeyring, generateRS256Keypair } from '@rdcp/server/server/keyring'

const ring = createKeyring({
  jwt: { active: [], previous: [], graceWindowMs: 7 * 24 * 60 * 60 * 1000 },
  api: { active: [], previous: [], graceWindowMs: 30 * 24 * 60 * 60 * 1000 }
})

const k1 = await generateRS256Keypair('key-2025-09-22')
ring.rotateJwtKey(k1)
```

Adapters automatically publish active+previous (within grace) public keys at /.well-known/jwks.json when enabled.

## Client caching with ETag (recommended)

### Using the built-in helper (SDK utils)

Optional TTL override (skip network when cache is new):
```ts path=null start=null
import { createJwksFetcher } from '@rdcp/server'

// ttlMs: use cached JWKS for up to 30s without hitting the network
const jwksFetcher = createJwksFetcher({ ttlMs: 30_000 })
const res = await jwksFetcher.fetch('http://localhost:3000')
console.log('fromCache?', res.fromCache)
```
```ts path=null start=null
import { createJwksFetcher } from '@rdcp/server'

const jwksFetcher = createJwksFetcher()

// On startup
const initial = await jwksFetcher.fetch('http://localhost:3000')
console.log('JWKS keys:', initial.jwks.keys.length)

// Later calls reuse ETag automatically and return from cache on 304
const next = await jwksFetcher.fetch('http://localhost:3000')
console.log('fromCache?', next.fromCache)
```

### Roll-your-own ETag cache
Implement conditional GETs to avoid fetching unchanged JWKS. Example (browser/node fetch):
```js path=null start=null
let cachedEtag = undefined
let cachedBody = undefined

async function fetchJWKS(baseUrl) {
  const headers = {}
  if (cachedEtag) headers['If-None-Match'] = cachedEtag
  const res = await fetch(`${baseUrl}/.well-known/jwks.json`, { headers })
  if (res.status === 304 && cachedBody) {
    return { fromCache: true, jwks: cachedBody }
  }
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  cachedEtag = res.headers.get('ETag') || undefined
  const data = await res.json()
  cachedBody = data
  return { fromCache: false, jwks: data }
}
```

Optional headers for advanced caching:
- Last-Modified: when enabled, servers include this; clients can also send If-Modified-Since
- Vary: indicates cache key variance; defaults to none for JWKS; may be set for advanced setups

## Migration: HS256 → RS256
1) Plan a rotation window
- Choose a grace window (e.g., 7 days) to overlap old (HS) and new (RS) issuance.

2) Begin signing new tokens with RS256
- Deploy RS256 private key to the issuing service; set `kid` on signed tokens.
- Keep HS256 validation available until after the grace period ends.

3) Enable JWKS and publish public keys
- Enable capabilities.security.tokenLifecycle.jwks.enabled.
- Consumers fetch JWKS and cache by max-age.

4) Retire HS256
- After grace period, stop accepting HS256 and remove HS key material from the keyring.

## Operational tips
- Use distinct `kid` values per rotation and date-stamp them.
- Monitor JWKS fetches and JWT verification failures.
- Keep audit logs for key rotations (planned: admin endpoints/CLI).
