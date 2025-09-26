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

describe('Admin app dual JSON endpoints', () => {
  let server: http.Server
  let demoServer: http.Server
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    // Start demo app first, capture base URL, and point admin app there
    demoServer = await new Promise<http.Server>(resolve => {
      const s = (demoApp as Application).listen(0, () => resolve(s))
    })
    const addr = demoServer.address()
    const dport = typeof addr === 'object' && addr ? addr.port : 0
    const demoBase = `http://127.0.0.1:${dport}`
    process.env.RDCP_BASE_URL = demoBase

    // Now start admin app
    server = await new Promise<http.Server>(resolve => {
      const s = (app as Application).listen(0, () => resolve(s))
    })
  })
  afterAll(async () => {
    if (server) await new Promise(r => server.close(() => r(null)))
    if (demoServer) await new Promise(r => demoServer.close(() => r(null)))
  })

  test('GET /admin/spec returns AdminUISpec JSON', async () => {
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    const base = `http://127.0.0.1:${port}`
    const res = await request(base).get('/admin/spec')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('groups')
  })

  test('GET /admin/json returns discovery + status', async () => {
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    const base = `http://127.0.0.1:${port}`
    const res = await request(base).get('/admin/json')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('discovery')
    expect(res.body).toHaveProperty('status')
  })
})
