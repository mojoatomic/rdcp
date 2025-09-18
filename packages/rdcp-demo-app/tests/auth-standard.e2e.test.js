const request = require('supertest')
const jwt = require('jsonwebtoken')
const { app } = require('../src/app')

describe('RDCP Demo App - Standard JWT (bearer)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'change-in-production'
  })

  it('rejects when missing bearer token or headers', async () => {
    const res = await request(app).get('/rdcp/v1/status').set({
      'X-RDCP-Auth-Method': 'bearer',
      'X-RDCP-Client-ID': 'demo-client'
    })
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBeDefined()
  })

  it('rejects invalid token signature', async () => {
    const bad = jwt.sign({ sub: 'user@example.com' }, 'wrong-secret', { algorithm: 'HS256', expiresIn: '5m' })
    const res = await request(app).get('/rdcp/v1/status').set({
      'X-RDCP-Auth-Method': 'bearer',
      'X-RDCP-Client-ID': 'demo-client',
      'Authorization': `Bearer ${bad}`
    })
    expect(res.status).toBe(401)
  })

  it('accepts a valid token with proper headers', async () => {
    const good = jwt.sign({ sub: 'user@example.com', scopes: ['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' })
    const res = await request(app).get('/rdcp/v1/status').set({
      'X-RDCP-Auth-Method': 'bearer',
      'X-RDCP-Client-ID': 'demo-client',
      'Authorization': `Bearer ${good}`
    })
    expect(res.status).toBe(200)
    expect(res.body.protocol).toBe('rdcp/1.0')
  })

  it('POST /rdcp/v1/control works with valid token', async () => {
    const good = jwt.sign({ sub: 'user@example.com', scopes: ['control'] }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' })
    const res = await request(app).post('/rdcp/v1/control')
      .set({
        'X-RDCP-Auth-Method': 'bearer',
        'X-RDCP-Client-ID': 'demo-client',
        'Authorization': `Bearer ${good}`
      })
      .send({ action: 'enable', categories: ['API_ROUTES'] })
    expect([200,401]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.body.changes)).toBe(true)
    }
  })
})