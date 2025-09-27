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

function ts(body: unknown): string {
  if (typeof body !== 'object' || body === null) return ''
  const o = body as Record<string, unknown>
  const s = o.status as Record<string, unknown> | undefined
  const v = s && typeof s.timestamp === 'string' ? s.timestamp : ''
  return typeof v === 'string' ? v : ''
}

describe('Admin app disable action updates status', () => {
  let adminServer: http.Server
  let demoServer: http.Server
  let base = ''
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    demoServer = await new Promise<http.Server>(resolve => {
      const s = (demoApp as Application).listen(0, () => resolve(s))
    })
    const daddr = demoServer.address()
    const dport = typeof daddr === 'object' && daddr ? daddr.port : 0
    process.env.RDCP_BASE_URL = `http://127.0.0.1:${dport}`

    adminServer = await new Promise<http.Server>(resolve => {
      const s = (app as Application).listen(0, () => resolve(s))
    })
    const a = adminServer.address()
    const aport = typeof a === 'object' && a ? a.port : 0
    base = `http://127.0.0.1:${aport}`
  })
  afterAll(async () => {
    if (adminServer) await new Promise(r => adminServer.close(() => r(null)))
    if (demoServer) await new Promise(r => demoServer.close(() => r(null)))
  })

  test('enable then disable triggers status timestamp changes', async () => {
    const r0 = await request(base).get('/admin/json')
    expect(r0.status).toBe(200)
    const t0 = ts(r0.body)

    const en = await request(base)
      .post('/admin/action')
      .set('content-type', 'application/json')
      .send({ action: 'enable', categories: ['API_ROUTES'] })
    expect(en.status).toBe(200)
    await new Promise(r => setTimeout(r, 50))
    const r1 = await request(base).get('/admin/json')
    expect(r1.status).toBe(200)
    const t1 = ts(r1.body)
    if (t0) expect(t1).not.toBe(t0)

    const dis = await request(base)
      .post('/admin/action')
      .set('content-type', 'application/json')
      .send({ action: 'disable', categories: ['API_ROUTES'] })
    expect(dis.status).toBe(200)
    await new Promise(r => setTimeout(r, 50))
    const r2 = await request(base).get('/admin/json')
    expect(r2.status).toBe(200)
    const t2 = ts(r2.body)
    if (t1) expect(t2).not.toBe(t1)
  })
})
