const request = require('supertest')
const jwt = require('jsonwebtoken')

// Import the demo app without starting a network listener
const { app } = require('../packages/rdcp-demo-app/src/app.js')

describe('RDCP Demo App - Temporary controls (TTL)', () => {
  const tenant = 'ttl-tenant-A'
  const secret = process.env.JWT_SECRET || 'change-in-production'
  const tokenCtrl = jwt.sign(
    { sub: 'ops@example.com', scopes: ['control', `control:${tenant}`, 'read', `read:${tenant}`] },
    secret,
    { algorithm: 'HS256', expiresIn: '5m' }
  )

  function h(prefix = 'ttl') {
    return {
      'X-RDCP-Auth-Method': 'bearer',
      'X-RDCP-Client-ID': `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      Authorization: `Bearer ${tokenCtrl}`,
    }
  }

  test('enable category with TTL expires after duration', async () => {
    const resEnable = await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl1'))
      .send({ action: 'enable', categories: ['CACHE'], options: { temporary: true, duration: '150ms' } })
    expect(resEnable.status).toBe(200)

    // Immediately present
    const resNow = await request(app)
      .get(`/rdcp/v1/tenants/${tenant}/settings`)
      .set(h('ttl2'))
    expect(resNow.status).toBe(200)
    expect(resNow.body?.settings?.categories || []).toContain('CACHE')

    // Wait for expiry
    await new Promise(r => setTimeout(r, 220))

    const resAfter = await request(app)
      .get(`/rdcp/v1/tenants/${tenant}/settings`)
      .set(h('ttl3'))
    expect(resAfter.status).toBe(200)
    expect(resAfter.body?.settings?.categories || []).not.toContain('CACHE')
  })

  test('disabling cancels pending TTL for that category', async () => {
    // Enable with TTL
    await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl4'))
      .send({ action: 'enable', categories: ['API_ROUTES'], options: { temporary: true, duration: '500ms' } })
      .expect(200)

    // Disable before TTL fires
    await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl5'))
      .send({ action: 'disable', categories: ['API_ROUTES'] })
      .expect(200)

    await new Promise(r => setTimeout(r, 600))

    const res = await request(app)
      .get(`/rdcp/v1/tenants/${tenant}/settings`)
      .set(h('ttl6'))
    expect(res.status).toBe(200)
    expect(res.body?.settings?.categories || []).not.toContain('API_ROUTES')
  })

  test('multiple categories get independent TTLs', async () => {
    await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl7'))
      .send({ action: 'enable', categories: ['AUTH', 'INTEGRATIONS'], options: { temporary: true, duration: '120ms' } })
      .expect(200)

    await new Promise(r => setTimeout(r, 70))
    let res = await request(app).get(`/rdcp/v1/tenants/${tenant}/settings`).set(h('ttl8'))
    expect(res.body?.settings?.categories || []).toEqual(expect.arrayContaining(['AUTH', 'INTEGRATIONS']))

    await new Promise(r => setTimeout(r, 80))
    res = await request(app).get(`/rdcp/v1/tenants/${tenant}/settings`).set(h('ttl9'))
    expect(res.body?.settings?.categories || []).not.toEqual(expect.arrayContaining(['AUTH', 'INTEGRATIONS']))
  })

  test('TTL applies only when options.temporary is true and duration is valid', async () => {
    await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl10'))
      .send({ action: 'enable', categories: ['REPORTS'], options: { temporary: false, duration: '100ms' } })
      .expect(200)

    await new Promise(r => setTimeout(r, 160))
    const res = await request(app).get(`/rdcp/v1/tenants/${tenant}/settings`).set(h('ttl11'))
    expect(res.body?.settings?.categories || []).toContain('REPORTS')
  })

  test('invalid or zero durations do not schedule TTL', async () => {
    await request(app)
      .post(`/rdcp/v1/tenants/${tenant}/control`)
      .set(h('ttl12'))
      .send({ action: 'enable', categories: ['QUERIES'], options: { temporary: true, duration: 'xyz' } })
      .expect(200)

    await new Promise(r => setTimeout(r, 150))
    const res = await request(app).get(`/rdcp/v1/tenants/${tenant}/settings`).set(h('ttl13'))
    expect(res.body?.settings?.categories || []).toContain('QUERIES')
  })
})
