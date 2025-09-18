const request = require('supertest')

// Ensure long API key across both services
const TEST_API_KEY = process.env.RDCP_API_KEY || '0123456789abcdefghijklmnopqrstuvwxyz01234567'
process.env.RDCP_API_KEY = TEST_API_KEY

// Start downstream RDCP demo app on an ephemeral port
const { app: downstreamApp } = require('../src/app')
let downstreamServer
let downstreamPort

// Configure upstream to point at the ephemeral downstream URL
let upstreamApp

beforeAll(async () => {
  downstreamServer = downstreamApp.listen(0)
  await new Promise(resolve => downstreamServer.once('listening', resolve))
  downstreamPort = downstreamServer.address().port
  process.env.DOWNSTREAM_URL = `http://localhost:${downstreamPort}`

  // Import upstream after env is set
  upstreamApp = require('../src/upstream-service')
}, 15000)

afterAll(async () => {
  if (downstreamServer) {
    await new Promise(resolve => downstreamServer.close(resolve))
  }
})

it('unauthorized variant returns 200,401,401 for discovery, health, status', async () => {
  const res = await request(upstreamApp).get('/api/demo/multi-call')
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.calls)).toBe(true)
  const statuses = res.body.calls.map(c => c.status)
  expect(statuses).toEqual([200, 401, 401])
})

it('authorized variant returns 200,200,200 for discovery, health, status', async () => {
  const res = await request(upstreamApp).get('/api/demo/multi-call-auth')
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.calls)).toBe(true)
  const statuses = res.body.calls.map(c => c.status)
  expect(statuses).toEqual([200, 200, 200])
})

it('rdcp-discovery through upstream returns protocol rdcp/1.0', async () => {
  const res = await request(upstreamApp).get('/api/demo/rdcp-discovery')
  expect(res.status).toBe(200)
  expect(res.body.downstream.statusCode).toBe(200)
  expect(res.body.downstream.body.protocol).toBe('rdcp/1.0')
})
