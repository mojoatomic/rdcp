/**
 * @fileoverview Tests for Express RDCP adapter TypeScript implementation
 * Tests only what exists in the codebase - follows WARP rules
 * 
 * Context7 Compliance:
 * - Uses proper TypeScript imports and type safety
 * - NO any types (NEVER EVER EVER EVER use ANY types)  
 * - Focused testing approach, not overengineered
 * - Under 300 lines (test file limit)
 */

import { describe, test, expect } from '@jest/globals'
import { createRDCPMiddleware } from '../src/server/adapters/express.js'
import type { RDCPMiddlewareOptions } from '../src/server/adapters/express.js'

describe('Express RDCP Adapter', () => {
  describe('createRDCPMiddleware function', () => {
    test('exists and is a function', () => {
      expect(typeof createRDCPMiddleware).toBe('function')
    })

    test('requires authenticator parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        createRDCPMiddleware()
      }).toThrow('authenticator function is required')
    })

    test('validates authenticator is a function', () => {
      expect(() => {
        // @ts-expect-error - Testing type validation at runtime
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

  describe('TypeScript type safety - NO any types', () => {
    test('options maintain proper TypeScript typing', () => {
      const options: RDCPMiddlewareOptions = {
        authenticator: async () => true,
        debugConfig: { DATABASE: true },
        basePath: '/rdcp/v1'
      }
      
      // TypeScript compilation passing means types are correct
      expect(typeof options.authenticator).toBe('function')
      expect(typeof options.debugConfig).toBe('object')
      expect(typeof options.basePath).toBe('string')
    })
  })
})