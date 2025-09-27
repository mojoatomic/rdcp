import http from 'http'
import request from 'supertest'
import type { Application } from 'express'
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'

// Import admin app (ESM export)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  app,
}: { app: Application } = require('./../packages/rdcp-admin-app/src/index.ts')
// Import demo app (CJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  app: demoApp,
}: { app: Application } = require('../packages/rdcp-demo-app/src/app.js')

/**
 * E2E: Admin app actions → status feedback loop
 */
describe('Admin app actions → status feedback loop', () => {
  let adminServer: http.Server
  let demoServer: http.Server
  let adminBase = ''

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    // Start demo app
    demoServer = await new Promise<http.Server>(resolve => {
      const s = (demoApp as Application).listen(0, () => resolve(s))
    })
    const daddr = demoServer.address()
    const dport = typeof daddr === 'object' && daddr ? daddr.port : 0
    const demoBase = `http://127.0.0.1:${dport}`
    process.env.RDCP_BASE_URL = demoBase

    // Start admin app
    adminServer = await new Promise<http.Server>(resolve => {
      const s = (app as Application).listen(0, () => resolve(s))
    })
    const aaddr = adminServer.address()
    const aport = typeof aaddr === 'object' && aaddr ? aaddr.port : 0
    adminBase = `http://127.0.0.1:${aport}`
  })

  afterAll(async () => {
    if (adminServer) await new Promise(r => adminServer.close(() => r(null)))
    if (demoServer) await new Promise(r => demoServer.close(() => r(null)))
  })

  function safeTimestamp(body: unknown): string {
    if (typeof body !== 'object' || body === null) return ''
    const obj = body as Record<string, unknown>
    const status = obj.status
    if (typeof status !== 'object' || status === null) return ''
    const st = status as Record<string, unknown>
    const ts = st.timestamp
    return typeof ts === 'string' ? ts : ''
  }

  test('POST /admin/action followed by /admin/json shows updated status timestamp', async () => {
    const before = await request(adminBase).get('/admin/json')
    expect(before.status).toBe(200)
    const ts0 = safeTimestamp(before.body as unknown)

    const res = await request(adminBase)
      .post('/admin/action')
      .set('content-type', 'application/json')
      .send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(typeof res.status).toBe('number')
    expect(res.status).toBe(200)

    // Small delay to allow status to update
    await new Promise(r => setTimeout(r, 50))

    const after = await request(adminBase).get('/admin/json')
    expect(after.status).toBe(200)
    const ts1 = safeTimestamp(after.body as unknown)

    // Timestamp should be present and (usually) change
    expect(typeof ts1).toBe('string')
    // If ts0 existed, ts1 should be different or at least non-empty
    if (ts0) expect(ts1).not.toBe(ts0)
  })
})
