/**
 * @fileoverview Express middleware integration tests
 * Tests ONLY the implemented functionality - no additional features
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

const express = require('express')
const request = require('supertest')
const { createRDCPMiddleware } = require('../src/server/adapters/express.js')

describe('Express Middleware Integration', () => {
  let app
  let mockAuthenticator

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    // Mock authenticator that always succeeds
    mockAuthenticator = jest.fn().mockResolvedValue(true)
  })

  describe('Middleware Setup', () => {
    test('creates middleware with required authenticator', () => {
      expect(() => {
        createRDCPMiddleware({ authenticator: mockAuthenticator })
      }).not.toThrow()
    })

    test('throws error when authenticator is missing', () => {
      expect(() => {
        createRDCPMiddleware({})
      }).toThrow('authenticator function is required')
    })

    test('throws error when authenticator is not a function', () => {
      expect(() => {
        createRDCPMiddleware({ authenticator: 'not-a-function' })
      }).toThrow('authenticator must be a function')
    })
  })

  describe('RDCP Discovery Endpoint', () => {
    beforeEach(() => {
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator,
        debugConfig: { categories: ['DATABASE', 'API_ROUTES'] }
      })
      app.use(rdcpMiddleware)
    })

    test('handles /.well-known/rdcp without authentication', async () => {
      const response = await request(app)
        .get('/.well-known/rdcp')
        .expect(200)

      expect(response.body).toMatchObject({
        protocol: 'rdcp/1.0',
        endpoints: {
          discovery: '/rdcp/v1/discovery',
          control: '/rdcp/v1/control',
          status: '/rdcp/v1/status',
          health: '/rdcp/v1/health'
        },
        capabilities: {
          authentication: ['basic', 'standard', 'enterprise'],
          isolation: ['global', 'process', 'namespace', 'organization'],
          categories: expect.arrayContaining(['DATABASE', 'API_ROUTES', 'QUERIES'])
        }
      })

      expect(response.body.timestamp).toBeDefined()
      expect(mockAuthenticator).not.toHaveBeenCalled()
    })

    test('includes custom basePath in discovery response', async () => {
      const customApp = express()
      customApp.use(express.json())
      
      const customMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator,
        basePath: '/custom/rdcp'
      })
      customApp.use(customMiddleware)

      const response = await request(customApp)
        .get('/.well-known/rdcp')
        .expect(200)

      expect(response.body.endpoints).toMatchObject({
        discovery: '/custom/rdcp/discovery',
        control: '/custom/rdcp/control',
        status: '/custom/rdcp/status',
        health: '/custom/rdcp/health'
      })
    })
  })

  describe('Authentication Required Endpoints', () => {
    beforeEach(() => {
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator,
        debugConfig: { categories: ['DATABASE'] }
      })
      app.use(rdcpMiddleware)
    })

    test('discovery endpoint requires authentication', async () => {
      await request(app)
        .get('/rdcp/v1/discovery')
        .expect(200)

      expect(mockAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/rdcp/v1/discovery'
        })
      )
    })

    test('control endpoint requires authentication', async () => {
      await request(app)
        .post('/rdcp/v1/control')
        .send({ action: 'enable', categories: ['DATABASE'] })
        .expect(200)

      expect(mockAuthenticator).toHaveBeenCalled()
    })

    test('status endpoint requires authentication', async () => {
      await request(app)
        .get('/rdcp/v1/status')
        .expect(200)

      expect(mockAuthenticator).toHaveBeenCalled()
    })

    test('health endpoint requires authentication', async () => {
      await request(app)
        .get('/rdcp/v1/health')
        .expect(200)

      expect(mockAuthenticator).toHaveBeenCalled()
    })
  })

  describe('Authentication Failure Handling', () => {
    beforeEach(() => {
      // Mock authenticator that fails
      mockAuthenticator = jest.fn().mockResolvedValue(false)
      
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator
      })
      app.use(rdcpMiddleware)
    })

    test('returns 401 when authentication fails', async () => {
      const response = await request(app)
        .get('/rdcp/v1/discovery')
        .expect(401)

      expect(response.body).toMatchObject({
        error: {
          code: 'RDCP_AUTH_REQUIRED',
          message: 'Authentication required',
          protocol: 'rdcp/1.0'
        }
      })
    })

    test('handles authenticator exceptions', async () => {
      mockAuthenticator.mockRejectedValue(new Error('Auth service down'))

      const response = await request(app)
        .get('/rdcp/v1/discovery')
        .expect(401)

      expect(response.body).toMatchObject({
        error: {
          code: 'RDCP_AUTH_ERROR',
          message: 'Authentication failed: Auth service down',
          protocol: 'rdcp/1.0'
        }
      })
    })
  })

  describe('Non-RDCP Request Handling', () => {
    beforeEach(() => {
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator
      })
      app.use(rdcpMiddleware)
      
      // Add a regular route after RDCP middleware
      app.get('/regular', (req, res) => {
        res.json({ message: 'regular endpoint' })
      })
    })

    test('passes through non-RDCP requests', async () => {
      const response = await request(app)
        .get('/regular')
        .expect(200)

      expect(response.body).toEqual({ message: 'regular endpoint' })
      expect(mockAuthenticator).not.toHaveBeenCalled()
    })

    test('ignores requests to other paths', async () => {
      await request(app)
        .get('/some/other/path')
        .expect(404) // Express default 404

      expect(mockAuthenticator).not.toHaveBeenCalled()
    })
  })

  describe('Tenant Context Integration', () => {
    beforeEach(() => {
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator: mockAuthenticator
      })
      app.use(rdcpMiddleware)
    })

    test('extracts tenant context from headers', async () => {
      const response = await request(app)
        .get('/rdcp/v1/discovery')
        .set('X-RDCP-Tenant-ID', 'test-tenant')
        .set('X-RDCP-Isolation-Level', 'organization')
        .set('X-RDCP-Tenant-Name', 'Test Corp')
        .expect(200)

      expect(response.body.tenant).toMatchObject({
        id: 'test-tenant',
        isolationLevel: 'organization',
        scope: 'tenant-isolated',
        name: 'Test Corp'
      })
    })

    test('uses default tenant when headers missing', async () => {
      const response = await request(app)
        .get('/rdcp/v1/discovery')
        .expect(200)

      expect(response.body.tenant).toMatchObject({
        id: 'default',
        isolationLevel: 'global',
        scope: 'global'
      })
    })
  })
})