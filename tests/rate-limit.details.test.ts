import { RDCPServer } from '../src/server/index.js'

describe('RDCP rate limit error details', () => {
  test('includes structured details in RDCP_RATE_LIMITED error', async () => {
    const server = new RDCPServer({
      capabilities: {
        rateLimit: {
          enabled: true,
          defaultRule: { windowMs: 500, maxRequests: 1 },
          perEndpoint: { status: { windowMs: 300, maxRequests: 1 } },
        },
      },
    })

    const tenant = { tenantId: 'details-tenant', isolationLevel: 'organization' as const }

    // First call allowed
    const r1 = server.handleStatus(tenant)
    await r1

    // Second call should be limited
    const r2 = server.handleStatus(tenant)
    const result = await r2

    expect('error' in (result as any)).toBe(true)
    if ('error' in (result as any)) {
      const err = result as { error: { code: string; details?: Record<string, unknown> } }
      expect(err.error.code).toBe('RDCP_RATE_LIMITED')
      expect(err.error.details).toBeDefined()
      const d = err.error.details as Record<string, unknown>
      expect(typeof d.limit).toBe('number')
      expect(typeof d.remaining).toBe('number')
      expect(typeof d.reset).toBe('number')
      // retryAfterSec is helpful but optional
      if (d.retryAfterSec !== undefined) {
        expect(typeof d.retryAfterSec).toBe('number')
      }
    }
  })
})
