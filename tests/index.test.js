/**
 * @fileoverview Tests for main JavaScript index exports
 * Tests only what exists in the codebase - follows WARP rules
 */

const rdcpSDK = require('../src/index.js')

describe('RDCP SDK Main Exports', () => {
  test('exports the expected structure', () => {
    expect(rdcpSDK).toHaveProperty('adapters')
    expect(rdcpSDK).toHaveProperty('auth')
    expect(rdcpSDK).toHaveProperty('utils')
    expect(rdcpSDK).toHaveProperty('createRDCPError')
  })

  describe('adapters', () => {
    test('exports framework adapters', () => {
      expect(rdcpSDK.adapters).toHaveProperty('express')
      expect(rdcpSDK.adapters).toHaveProperty('fastify')  
      expect(rdcpSDK.adapters).toHaveProperty('koa')
    })

    test('express adapter exports expected functions', () => {
      expect(rdcpSDK.adapters.express).toHaveProperty('createRDCPMiddleware')
      expect(typeof rdcpSDK.adapters.express.createRDCPMiddleware).toBe('function')
    })
  })

  describe('validation', () => {
    test('exports createRDCPError function', () => {
      expect(typeof rdcpSDK.createRDCPError).toBe('function')
    })
  })

  describe('authentication', () => {
    test('exports auth module', () => {
      expect(rdcpSDK.auth).toBeDefined()
      expect(rdcpSDK.auth.validateRDCPAuth).toBeDefined()
      expect(typeof rdcpSDK.auth.validateRDCPAuth).toBe('function')
    })
  })

  describe('utils', () => {
    test('exports utils module', () => {
      expect(rdcpSDK.utils).toBeDefined()
    })
  })
})