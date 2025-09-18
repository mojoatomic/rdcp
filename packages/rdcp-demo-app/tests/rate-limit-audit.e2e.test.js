const request = require('supertest')
const { app } = require('../src/app')

function headersWithApiKey(key = process.env.RDCP_API_KEY || 'dev-key-change-in-production-min-32-chars') {
  return {
    'X-RDCP-Auth-Method': 'api-key',
    'X-RDCP-Client-ID': 'rate-test-client',
    'Authorization': `Bearer ${key}`
  }
}

describe('RDCP Demo App - Rate limiting and audit trail for control', () => {
  it('rate limits POST /rdcp/v1/control per client id', async () => {
    process.env.RATE_LIMIT_CONTROL_WINDOW_MS = '500'
    process.env.RATE_LIMIT_CONTROL_MAX = '2'

    // First two should succeed
    const r1 = await request(app).post('/rdcp/v1/control').set(headersWithApiKey()).send({ action: 'enable', categories: ['API_ROUTES'] })
    const r2 = await request(app).post('/rdcp/v1/control').set(headersWithApiKey()).send({ action: 'disable', categories: ['API_ROUTES'] })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    // Third within window should 429
    const r3 = await request(app).post('/rdcp/v1/control').set(headersWithApiKey()).send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(r3.status).toBe(429)
    expect(r3.body.error?.code).toBe('RDCP_RATE_LIMITED')
  })
})
