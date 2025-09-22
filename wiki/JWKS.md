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
  - Headers: `Cache-Control: public, max-age=<seconds>`

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
