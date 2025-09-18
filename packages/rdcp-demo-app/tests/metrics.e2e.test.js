const request = require('supertest')
const { app } = require('../src/app')

describe('RDCP Demo App - /metrics endpoint', () => {
  it('exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics')
    expect(res.status).toBe(200)
    expect(res.text).toContain('# HELP rdcp_demo_requests_total')
    expect(res.text).toContain('# HELP rdcp_demo_request_duration_seconds')
  })
})
