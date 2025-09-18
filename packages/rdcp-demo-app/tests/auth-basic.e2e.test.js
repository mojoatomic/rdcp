const request = require('supertest')
const { app } = require('../src/app')

// Helper to build headers for basic api-key mode
function headersWithApiKey(key = process.env.RDCP_API_KEY || 'dev-key-change-in-production-min-32-chars') {
  return {
    'X-RDCP-Auth-Method': 'api-key',
    'X-RDCP-Client-ID': 'demo-client',
    'Authorization': `Bearer ${key}`
  }
}

describe('RDCP Demo App - Basic Auth Enforcement (api-key)', () => {
  it('allows discovery document without auth', async () => {
    const res = await request(app).get('/.well-known/rdcp')
    expect(res.status).toBe(200)
    expect(res.body.protocol).toBe('rdcp/1.0')
    expect(res.body.endpoints).toBeDefined()
  })

  it('rejects discovery (authenticated endpoint) without required headers', async () => {
    const res = await request(app).get('/rdcp/v1/discovery')
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe('RDCP_AUTH_REQUIRED')
  })

  it('rejects when api key is missing/short', async () => {
    const res = await request(app).get('/rdcp/v1/status').set({
      'X-RDCP-Auth-Method': 'api-key',
      'X-RDCP-Client-ID': 'demo-client',
      'Authorization': 'Bearer shortkey'
    })
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe('RDCP_AUTH_REQUIRED')
  })

  it('accepts with valid api key and required headers', async () => {
    const res = await request(app).get('/rdcp/v1/status').set(headersWithApiKey())
    expect(res.status).toBe(200)
    expect(res.body.protocol).toBe('rdcp/1.0')
    expect(res.body.categories).toBeDefined()
  })

  it('POST /rdcp/v1/control enforces method and auth', async () => {
    // GET should 405
    const getRes = await request(app).get('/rdcp/v1/control').set(headersWithApiKey())
    expect(getRes.status).toBe(405)

    // POST without headers should 401
    const unauthPost = await request(app).post('/rdcp/v1/control').send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(unauthPost.status).toBe(401)

    // POST with headers should 200 (even if no categories changed)
    const res = await request(app)
      .post('/rdcp/v1/control')
      .set(headersWithApiKey())
      .send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(res.status).toBe(200)
    expect(res.body.protocol).toBe('rdcp/1.0')
    expect(Array.isArray(res.body.changes)).toBe(true)
  })
})
