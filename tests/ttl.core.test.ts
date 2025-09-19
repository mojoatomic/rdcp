import { RDCPServer } from '../src/server/index'
import { getTenantDebugConfig } from '../src/utils/tenant'

describe('Core TTL Temporary Controls (RDCPServer)', () => {
  const tenantId = 'ttl-core-A'

  test('enable with temporary TTL expires automatically', async () => {
    const server = new RDCPServer({
      capabilities: { temporaryControls: true, ttl: { minDurationMs: 10, maxDurationMs: 60000 } },
    })

    // Enable CACHE temporarily for 50ms
    const res = await server.handleControl(
      { action: 'enable', categories: ['CACHE'], options: { temporary: true, duration: '50ms' } },
      { tenantId, isolationLevel: 'organization' }
    )
    expect((res as any).status).toBe('success')

    // Immediately present
    expect(getTenantDebugConfig(tenantId).CACHE).toBe(true)

    // After 80ms, should auto-disable
    await new Promise(r => setTimeout(r, 80))
    expect(getTenantDebugConfig(tenantId).CACHE).toBe(false)
  }, 500)

  test('disable cancels pending TTL', async () => {
    const server = new RDCPServer({
      capabilities: { temporaryControls: true, ttl: { minDurationMs: 10, maxDurationMs: 60000 } },
    })

    // Enable API_ROUTES temporarily for 120ms
    await server.handleControl(
      { action: 'enable', categories: ['API_ROUTES'], options: { temporary: true, duration: '120ms' } },
      { tenantId, isolationLevel: 'organization' }
    )

    // Disable before expiry
    await server.handleControl(
      { action: 'disable', categories: ['API_ROUTES'] },
      { tenantId, isolationLevel: 'organization' }
    )

    // Wait beyond original TTL
    await new Promise(r => setTimeout(r, 150))
    expect(getTenantDebugConfig(tenantId).API_ROUTES).toBe(false)
  }, 1000)
})