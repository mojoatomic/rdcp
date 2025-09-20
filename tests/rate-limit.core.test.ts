import { RDCPServer } from '../src/server/index.js'
import { createRDCPError } from '../src/validation/errors.js'

describe('Core Rate Limiting (RDCPServer)', () => {
  const tenant = { tenantId: 'rate-tenant', isolationLevel: 'organization' as const }

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

    const r1 = await server.handleControl(body, tenant)
    const r2 = await server.handleControl(body, tenant)
    const r3 = await server.handleControl(body, tenant)

    // Third should be rate limited
    if (!('error' in (r3 as any))) {
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

    const rA1 = server.handleStatus(tA)
    const rA2 = server.handleStatus(tA)
    const rB1 = server.handleStatus(tB)

    // A second call should be limited; B first allowed
    const a2 = await rA2
    const b1 = await rB1

    expect('error' in (a2 as any)).toBe(true)
    if ('error' in (a2 as any)) {
      expect((a2 as any).error.code).toBe('RDCP_RATE_LIMITED')
    }
    expect('error' in (b1 as any)).toBe(false)
  })
})
