import { describe, it, expect } from '@jest/globals'
import { createKeyring } from '../src/server/keyring'
import { generateKeyPair, exportSPKI, exportPKCS8 } from 'jose'

describe('Keyring JWKS export (JOSE)', () => {
  it('exports RSA public JWK for active and previous (within grace) keys', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const pubPem = await exportSPKI(publicKey)
    const privPem = await exportPKCS8(privateKey)

    const ring = createKeyring({
      jwt: {
        active: [
          {
            kid: 'rsa-active-1',
            alg: 'RS256',
            publicKeyPem: pubPem,
            privateKeyPem: privPem,
          },
        ],
        previous: [
          {
            key: {
              kid: 'rsa-prev-1',
              alg: 'RS256',
              publicKeyPem: pubPem,
              privateKeyPem: privPem,
            },
            retirementAt: new Date(Date.now() + 60_000),
          },
        ],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const jwks = await ring.exportPublicJWKS()
    expect(Array.isArray(jwks.keys)).toBe(true)
    // Should have at least one RSA JWK
    const rsa = jwks.keys.find(k => (k as any).kty === 'RSA')
    expect(rsa).toBeDefined()
    expect((rsa as any).kid).toBe('rsa-active-1')
    expect((rsa as any).alg).toBe('RS256')
    expect((rsa as any).use).toBe('sig')
    expect(typeof (rsa as any).n).toBe('string')
    expect(typeof (rsa as any).e).toBe('string')
  })
})
