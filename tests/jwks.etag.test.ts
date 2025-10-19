import { describe, it, expect } from '@jest/globals'
import { createKeyring } from '../src/server/keyring'
import { prepareJWKSResponse } from '../src/utils/etag'
import { withTags } from './conformance/tags'

withTags(['jwks'], () => {
  describe('JWKS ETag utility', () => {
    it('ETag changes when JWKS content changes (e.g., after rotation)', async () => {
      const ring = createKeyring({
        jwt: {
          active: [{ kid: 'hs', alg: 'HS256', secret: 'hs-secret' }],
          previous: [],
          graceWindowMs: 60_000,
        },
        api: { active: [], previous: [], graceWindowMs: 60_000 },
      })

      const jwks1 = await ring.exportPublicJWKS()
      const { etag: etag1 } = prepareJWKSResponse(jwks1)

      // Rotate in an RSA key so JWKS changes
      await ring.rotateNewRS256Key('kid-1')

      const jwks2 = await ring.exportPublicJWKS()
      const { etag: etag2 } = prepareJWKSResponse(jwks2)

      expect(etag1).not.toBe(etag2)
    })
  })
})
