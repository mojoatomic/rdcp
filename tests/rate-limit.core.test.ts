import { RDCPServer } from '../src/server/index.js'
import { createRDCPError } from '../src/validation/errors.js'

import { withTags } from './conformance/tags'
withTags(['rate-limit', 'control'], () => {
  describe('Core Rate Limiting (RDCPServer)', () => {
    const tenant = {
      tenantId: 'rate-tenant',
      isolationLevel: 'organization' as const,
    }

    test('limits control endpoint after threshold per tenant', async () => {
      const server = new RDCPServer({
        capabilities: {
          rateLimit: {
            enabled: true,
            defaultRule: { windowMs: 1000, maxRequests: 100 },
            perEndpoint: { control: { windowMs: 200, maxRequests: 2 } },
          },
        },
      })

      const body = {
        action: 'enable',
        categories: ['API_ROUTES'],
      }

      await server.handleControl(body, tenant)
      await server.handleControl(body, tenant)
      const r3 = await server.handleControl(body, tenant)

      // Third should be rate limited
      const hasError =
        typeof r3 === 'object' &&
        r3 !== null &&
        'error' in (r3 as unknown as Record<string, unknown>)
      if (!hasError) {
        throw new Error('expected RDCP error for rate limit')
      }
      const err = r3 as ReturnType<typeof createRDCPError>
      expect(err.error.code).toBe('RDCP_RATE_LIMITED')
    })

    test('separate tenants have independent limits', async () => {
      const server = new RDCPServer({
        capabilities: {
          rateLimit: {
            enabled: true,
            defaultRule: { windowMs: 1000, maxRequests: 100 },
            perEndpoint: { status: { windowMs: 500, maxRequests: 1 } },
          },
        },
      })

      const tA = { tenantId: 'A', isolationLevel: 'organization' as const }
      const tB = { tenantId: 'B', isolationLevel: 'organization' as const }

      await server.handleStatus(tA)
      const a2 = await server.handleStatus(tA)
      const b1 = await server.handleStatus(tB)

      const a2HasError =
        typeof a2 === 'object' &&
        a2 !== null &&
        'error' in (a2 as unknown as Record<string, unknown>)
      expect(a2HasError).toBe(true)
      if (a2HasError) {
        expect((a2 as { error: { code: string } }).error.code).toBe(
          'RDCP_RATE_LIMITED'
        )
      }
      const b1HasError =
        typeof b1 === 'object' &&
        b1 !== null &&
        'error' in (b1 as unknown as Record<string, unknown>)
      expect(b1HasError).toBe(false)
    })
  })
})
