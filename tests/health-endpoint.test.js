/**
 * @fileoverview Health endpoint tests
 * Tests ONLY the implemented health endpoint functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

const express = require('express')
const request = require('supertest')
const { createRDCPMiddleware } = require('../src/server/adapters/express.js')

describe('Health Endpoint', () => {
  let app
  let mockAuthenticator

  beforeEach(() => {
    app = express()
    app.use(express.json())
    mockAuthenticator = jest.fn().mockResolvedValue(true)
    
    const rdcpMiddleware = createRDCPMiddleware({
      authenticator: mockAuthenticator
    })
    app.use(rdcpMiddleware)
  })

  test('returns system health status', async () => {
    const response = await request(app)
      .get('/rdcp/v1/health')
      .set('X-API-Key', 'test-key-32-chars-long-here123')
      .expect(200)

    expect(response.body).toMatchObject({
      protocol: 'rdcp/1.0',
      status: 'healthy',
      version: '1.0.0',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    })
    expect(response.body.timestamp).toBeDefined()
    expect(response.body.uptime).toBeDefined()
    expect(typeof response.body.uptime).toBe('number')
  })

  test('health endpoint is not tenant-specific', async () => {
    const responseA = await request(app)
      .get('/rdcp/v1/health')
      .set('X-API-Key', 'test-key-32-chars-long-here123')
      .set('X-RDCP-Tenant-ID', 'tenant-a')
      .expect(200)

    const responseB = await request(app)
      .get('/rdcp/v1/health')
      .set('X-API-Key', 'test-key-32-chars-long-here123')
      .set('X-RDCP-Tenant-ID', 'tenant-b')
      .expect(200)

    // Health responses should be identical (no tenant isolation)
    expect(responseA.body.status).toBe(responseB.body.status)
    expect(responseA.body.version).toBe(responseB.body.version)
    expect(responseA.body.system).toEqual(responseB.body.system)
  })

  test('requires authentication like other RDCP endpoints', async () => {
    mockAuthenticator.mockResolvedValue(false)
    
    const response = await request(app)
      .get('/rdcp/v1/health')
      .expect(401)

    expect(response.body).toMatchObject({
      error: {
        code: 'RDCP_AUTH_REQUIRED',
        message: 'Authentication required',
        protocol: 'rdcp/1.0'
      }
    })
  })
})