import { describe, it, expect } from '@jest/globals'
import { createKeyring, generateRS256Keypair } from '../src/server/keyring'

describe('Keyring RSA rotation helper', () => {
  it('rotateNewRS256Key adds a new active RSA key and publishes in JWKS', async () => {
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'hs', alg: 'HS256', secret: 'hs-secret' }],
        previous: [],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    // First: rotate in an RSA key 'k-old'
    const kOld = await generateRS256Keypair('k-old')
    ring.rotateJwtKey(kOld)

    // Second: rotate in another RSA key 'k-new', making 'k-old' previous (within grace)
    const kNew = await generateRS256Keypair('k-new')
    ring.rotateJwtKey(kNew)

    const jwks = await ring.exportPublicJWKS()
    const kids = jwks.keys.map(k => (k as any).kid)
    expect(kids).toContain('k-new')
    expect(kids).toContain('k-old')
  })
})
