import http from 'http'
import type { Application } from 'express'
import jwt from 'jsonwebtoken'
import { beforeAll, afterAll, describe, test, expect } from '@jest/globals'
import { createRDCPClient } from '../packages/rdcp-client/src/index'
import type { RDCPClient } from '../packages/rdcp-client/src/index'
import { RDCP_HEADERS } from '../packages/rdcp-core/src/constants'

// Import the demo app express instance (no listener)
// Using require because the demo app is CJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  app,
}: { app: Application } = require('../packages/rdcp-demo-app/src/app.js')

describe('Client-first e2e: RDCP client against demo app', () => {
  let server: http.Server
  let baseUrl: string

  beforeAll(async () => {
    server = await new Promise<http.Server>(resolve => {
      const s = (app as Application).listen(0, () => resolve(s))
    })
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    if (server) await new Promise(r => server.close(() => r(null)))
  })

  test('discovery → status → control → status → health', async () => {
    // Create a bearer token with "control" scope for root control endpoint
    const secret = process.env.JWT_SECRET ?? 'change-in-production'
    const token = jwt.sign(
      { sub: 'client-e2e', scopes: ['control', 'read'] },
      secret,
      {
        algorithm: 'HS256',
        expiresIn: '5m',
      }
    )

    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'bearer',
      [RDCP_HEADERS.CLIENT_ID]: `client-e2e-${Date.now()}`,
      authorization: `Bearer ${token}`,
    }

    const rdcp: RDCPClient = createRDCPClient({ baseUrl, headers })

    const disc = await rdcp.getDiscovery()
    expect(disc.protocol).toBeDefined()

    const status0 = await rdcp.getStatus()
    expect(status0.protocol).toBeDefined()

    const res = await rdcp.postControl({
      action: 'enable',
      categories: ['API_ROUTES'],
    })
    expect(res.status).toBe('success')

    const status1 = await rdcp.getStatus()
    expect(status1.protocol).toBeDefined()

    const health = await rdcp.getHealth()
    expect(health.status).toBe('healthy')
  })
})
