/**
 * @fileoverview Tests for Fastify adapter JavaScript implementation
 * Tests only what exists in the codebase - follows WARP rules
 */

const { createRDCPMiddleware, createRDCPPlugin } = require('../src/server/adapters/fastify.js')

describe('Fastify RDCP Adapter', () => {
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

    test('returned middleware has correct Fastify signature', () => {
      const middleware = createRDCPMiddleware({
        authenticator: () => true
      })
      // Fastify middleware should accept 2 parameters: request, reply
      expect(middleware.length).toBe(2)
    })
  })

  describe('createRDCPPlugin function', () => {
    test('exists and is a function', () => {
      expect(typeof createRDCPPlugin).toBe('function')
    })

    test('returns a Fastify plugin function', () => {
      const plugin = createRDCPPlugin({
        authenticator: () => true
      })
      expect(typeof plugin).toBe('function')
      // Fastify plugin should accept 3 parameters: fastify, opts, done
      expect(plugin.length).toBe(3)
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