import jwt from 'jsonwebtoken'
import { describe, it, expect } from '@jest/globals'

// TDD: start with tests for a minimal keyring API
// The implementation will live in src/server/keyring.ts
import { createKeyring } from '../src/server/keyring'

describe('Keyring (core) — JWT + API keys', () => {
  it('verifies JWT signed by active key (kid-based)', async () => {
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'k1', alg: 'HS256', secret: 'secret-1' }],
        previous: [],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const token = jwt.sign({ sub: 't1' }, 'secret-1', {
      algorithm: 'HS256',
      keyid: 'k1',
      expiresIn: '1h',
    })

    const result = await ring.verifyJwt(token, {
      algorithms: ['HS256'],
      audience: undefined,
      issuer: undefined,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.sub).toBe('t1')
      expect(result.header.kid).toBe('k1')
    }
  })

  it('verifies JWT signed by previous key within grace window', async () => {
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'k2', alg: 'HS256', secret: 'secret-2' }],
        previous: [
          {
            key: { kid: 'k1', alg: 'HS256', secret: 'secret-1' },
            retirementAt: new Date(Date.now() + 60_000),
          },
        ],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const token = jwt.sign({ sub: 'prev' }, 'secret-1', {
      algorithm: 'HS256',
      keyid: 'k1',
      expiresIn: '1h',
    })

    const result = await ring.verifyJwt(token, { algorithms: ['HS256'] })
    expect(result.ok).toBe(true)
  })

  it('rejects JWT signed by retired key after grace', async () => {
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'k3', alg: 'HS256', secret: 'secret-3' }],
        previous: [
          {
            key: { kid: 'k0', alg: 'HS256', secret: 'old-secret' },
            retirementAt: new Date(Date.now() - 10_000),
          },
        ],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const token = jwt.sign({ sub: 'old' }, 'old-secret', {
      algorithm: 'HS256',
      keyid: 'k0',
      expiresIn: '1h',
    })

    const result = await ring.verifyJwt(token, { algorithms: ['HS256'] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('RDCP_JWT_KEY_NOT_FOUND')
    }
  })

  it('rejects JWT with unknown kid', async () => {
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'k5', alg: 'HS256', secret: 'secret-5' }],
        previous: [],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const token = jwt.sign({ sub: 'x' }, 'wrong', {
      algorithm: 'HS256',
      keyid: 'does-not-exist',
      expiresIn: '1h',
    })

    const result = await ring.verifyJwt(token, { algorithms: ['HS256'] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('RDCP_JWT_KEY_NOT_FOUND')
    }
  })

  it('API key hashing and verification works; timing-safe compare', async () => {
    const ring = createKeyring({
      jwt: { active: [], previous: [], graceWindowMs: 60_000 },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    const issued = await ring.issueApiKey({ prefix: 'rdcp_sk_' })
    // only the cleartext is returned once; ring stores hash internally
    expect(issued.key.startsWith('rdcp_sk_')).toBe(true)

    const ok = await ring.verifyApiKey(issued.key)
    expect(ok).toBe(true)

    const no = await ring.verifyApiKey(issued.key + 'tamper')
    expect(no).toBe(false)
  })
})
