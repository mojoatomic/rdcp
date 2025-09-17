/**
 * @fileoverview Tests for Koa adapter JavaScript implementation
 * Tests only what exists in the codebase - follows WARP rules
 */

const { createRDCPMiddleware, createRDCPMiddlewareWithErrorBoundary } = require('../src/server/adapters/koa.js')

describe('Koa RDCP Adapter', () => {
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

    test('returned middleware has correct Koa signature', () => {
      const middleware = createRDCPMiddleware({
        authenticator: () => true
      })
      // Koa middleware should accept 2 parameters: ctx, next
      expect(middleware.length).toBe(2)
    })
  })

  describe('createRDCPMiddlewareWithErrorBoundary function', () => {
    test('exists and is a function', () => {
      expect(typeof createRDCPMiddlewareWithErrorBoundary).toBe('function')
    })

    test('returns a function when given valid options', () => {
      const middleware = createRDCPMiddlewareWithErrorBoundary({
        authenticator: () => true
      })
      expect(typeof middleware).toBe('function')
    })

    test('returned middleware has correct Koa signature', () => {
      const middleware = createRDCPMiddlewareWithErrorBoundary({
        authenticator: () => true
      })
      // Koa middleware should accept 2 parameters: ctx, next
      expect(middleware.length).toBe(2)
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
  })
})