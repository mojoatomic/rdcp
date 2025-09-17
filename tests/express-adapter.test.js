/**
 * @fileoverview Tests for actual Express adapter JavaScript implementation
 * Tests only what exists in the codebase - follows WARP rules
 */

const { createRDCPMiddleware } = require('../src/server/adapters/express.js')

describe('Express RDCP Adapter', () => {
  describe('createRDCPMiddleware function', () => {
    test('exists and is a function', () => {
      expect(typeof createRDCPMiddleware).toBe('function')
    })

    test('requires authenticator parameter', () => {
      expect(() => {
        createRDCPMiddleware()
      }).toThrow('authenticator function is required')
    })

    test('validates authenticator is a function', () => {
      expect(() => {
        createRDCPMiddleware({ authenticator: 'not-a-function' })
      }).toThrow('authenticator must be a function')
    })

    test('returns a function when given valid authenticator', () => {
      const middleware = createRDCPMiddleware({
        authenticator: () => true
      })
      expect(typeof middleware).toBe('function')
    })

    test('returned middleware has correct Express signature', () => {
      const middleware = createRDCPMiddleware({
        authenticator: () => true
      })
      // Express middleware should accept 3 parameters: req, res, next
      expect(middleware.length).toBe(3)
    })
  })

  describe('middleware options', () => {
    test('accepts optional debugConfig parameter', () => {
      expect(() => {
        createRDCPMiddleware({
          authenticator: () => true,
          debugConfig: { DATABASE: true }
        })
      }).not.toThrow()
    })

    test('accepts optional basePath parameter', () => {
      expect(() => {
        createRDCPMiddleware({
          authenticator: () => true,
          basePath: '/custom/rdcp/v1'
        })
      }).not.toThrow()
    })

    test('accepts optional performance configuration', () => {
      expect(() => {
        createRDCPMiddleware({
          authenticator: () => true,
          performance: { enableMetrics: true }
        })
      }).not.toThrow()
    })

    test('accepts optional tenant configuration', () => {
      expect(() => {
        createRDCPMiddleware({
          authenticator: () => true,
          tenant: { multiTenancy: true }
        })
      }).not.toThrow()
    })
  })
})