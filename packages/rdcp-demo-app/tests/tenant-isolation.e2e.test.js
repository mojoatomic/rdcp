const request = require('supertest')
const { app } = require('../src/app')

function headersWithApiKey(key = process.env.RDCP_API_KEY || 'dev-key-change-in-production-min-32-chars') {
  return {
    'X-RDCP-Auth-Method': 'api-key',
    'X-RDCP-Client-ID': 'demo-client',
    'Authorization': `Bearer ${key}`
  }
}

describe('RDCP Demo App - Multi-Tenancy Isolation', () => {
  const tenantA = 'tenant-A'
  const tenantB = 'tenant-B'

  it('enabling category for tenant A does not affect tenant B', async () => {
    // Baseline: both tenants should show API_ROUTES disabled
    const statusA1 = await request(app)
      .get('/rdcp/v1/status')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantA })
    expect(statusA1.status).toBe(200)
    expect(statusA1.body.categories?.API_ROUTES?.enabled).toBe(false)

    const statusB1 = await request(app)
      .get('/rdcp/v1/status')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantB })
    expect(statusB1.status).toBe(200)
    expect(statusB1.body.categories?.API_ROUTES?.enabled).toBe(false)

    // Enable API_ROUTES for tenant A only via control endpoint
    const ctrlA = await request(app)
      .post('/rdcp/v1/control')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantA })
      .send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(ctrlA.status).toBe(200)
    expect(Array.isArray(ctrlA.body.changes)).toBe(true)

    // Verify: tenant A enabled
    const statusA2 = await request(app)
      .get('/rdcp/v1/status')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantA })
    expect(statusA2.status).toBe(200)
    expect(statusA2.body.categories?.API_ROUTES?.enabled).toBe(true)

    // Verify: tenant B still disabled
    const statusB2 = await request(app)
      .get('/rdcp/v1/status')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantB })
    expect(statusB2.status).toBe(200)
    expect(statusB2.body.categories?.API_ROUTES?.enabled).toBe(false)

    // Cleanup: disable for tenant A
    const ctrlAOff = await request(app)
      .post('/rdcp/v1/control')
      .set({ ...headersWithApiKey(), 'X-RDCP-Tenant-ID': tenantA })
      .send({ action: 'disable', categories: ['API_ROUTES'] })
    expect(ctrlAOff.status).toBe(200)
  })
})