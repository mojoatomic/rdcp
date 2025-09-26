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

  test('rate limit maps to RDCPClientError with code and status 429 (client path)', async () => {
    const secret = process.env.JWT_SECRET ?? 'change-in-production'
    const token = jwt.sign(
      { sub: 'client-e2e', scopes: ['control', 'read'] },
      secret,
      { algorithm: 'HS256', expiresIn: '2m' }
    )
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'bearer',
      [RDCP_HEADERS.CLIENT_ID]: `client-e2e-rate-${Date.now()}`,
      authorization: `Bearer ${token}`,
    }
    const rdcp: RDCPClient = createRDCPClient({ baseUrl, headers })

    // Threshold in demo app defaults to 3 per 2s; send 5 quickly
    const ops = [] as Promise<unknown>[]
    for (let i = 0; i < 5; i++) {
      ops.push(
        rdcp
          .postControl({ action: 'enable', categories: ['API_ROUTES'] })
          .catch((e: unknown) =>
            e instanceof Error ? e : new Error(String(e))
          )
      )
    }
    const results = await Promise.all(ops)
    let error: Error | undefined
    for (const r of results) {
      if (r instanceof Error) {
        error = r
        break
      }
    }
    expect(error).toBeDefined()
    if (error) {
      const err = error as unknown as { status?: number; code?: string }
      expect(err.status).toBe(429)
      expect(err.code).toBe('RDCP_RATE_LIMITED')
    }
  })

  test('emits RDCP_AUDIT log on successful control (client path)', async () => {
    const secret = process.env.JWT_SECRET ?? 'change-in-production'
    const token = jwt.sign(
      { sub: 'client-e2e', scopes: ['control', 'read'] },
      secret,
      { algorithm: 'HS256', expiresIn: '2m' }
    )
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'bearer',
      [RDCP_HEADERS.CLIENT_ID]: `client-e2e-audit-${Date.now()}`,
      authorization: `Bearer ${token}`,
    }
    const rdcp: RDCPClient = createRDCPClient({ baseUrl, headers })

    const logs: string[] = []
    const orig = console.info
    const interceptor = (...args: unknown[]): void => {
      try {
        if (typeof args[0] === 'string' && args[0] === 'RDCP_AUDIT') {
          logs.push(String(args[1] ?? ''))
        }
      } catch {
        // ignore
      }
      orig.call(console, ...args)
    }
    console.info = interceptor as typeof console.info
    try {
      await rdcp.postControl({ action: 'enable', categories: ['API_ROUTES'] })
    } finally {
      console.info = orig
    }
    expect(logs.some(l => l.includes('"event":"RDCP_AUDIT"'))).toBe(true)
  })
})
