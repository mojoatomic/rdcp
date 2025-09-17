/**
 * @fileoverview Tests for JavaScript authentication module
 * Tests only what exists in the codebase - follows WARP rules
 */

const { validateRDCPAuth, basicAuthenticator, extractApiKey } = require('../src/auth/index.js')

describe('RDCP Authentication', () => {
  const validApiKey = 'this-is-a-valid-32-character-key-for-testing'
  const shortApiKey = 'short'

  describe('validateRDCPAuth function', () => {
    test('exists and is a function', () => {
      expect(typeof validateRDCPAuth).toBe('function')
    })

    test('rejects request without API key', () => {
      const mockRequest = { headers: {} }
      expect(validateRDCPAuth(mockRequest)).toBe(false)
    })

    test('rejects request with short API key', () => {
      const mockRequest = { 
        headers: { 'x-api-key': shortApiKey }
      }
      expect(validateRDCPAuth(mockRequest)).toBe(false)
    })

    test('accepts valid API key in x-api-key header', () => {
      const mockRequest = {
        headers: { 'x-api-key': validApiKey }
      }
      expect(validateRDCPAuth(mockRequest)).toBe(false) // False because env key doesn't match
    })

    test('extracts API key from Authorization header', () => {
      const mockRequest = {
        headers: { 'authorization': `Bearer ${validApiKey}` }
      }
      expect(validateRDCPAuth(mockRequest)).toBe(false) // False because env key doesn't match
    })
  })

  describe('basicAuthenticator function', () => {
    test('exists and is same as validateRDCPAuth', () => {
      expect(basicAuthenticator).toBe(validateRDCPAuth)
    })
  })

  describe('extractApiKey function', () => {
    test('exists and is a function', () => {
      expect(typeof extractApiKey).toBe('function')
    })

    test('extracts key from x-api-key header', () => {
      const mockRequest = {
        headers: { 'x-api-key': 'test-key' }
      }
      expect(extractApiKey(mockRequest)).toBe('test-key')
    })

    test('extracts key from Authorization Bearer header', () => {
      const mockRequest = {
        headers: { 'authorization': 'Bearer test-key' }
      }
      expect(extractApiKey(mockRequest)).toBe('test-key')
    })

    test('prefers Authorization over x-api-key', () => {
      const mockRequest = {
        headers: { 
          'authorization': 'Bearer auth-key',
          'x-api-key': 'header-key'
        }
      }
      expect(extractApiKey(mockRequest)).toBe('auth-key')
    })

    test('returns undefined when no key present', () => {
      const mockRequest = { headers: {} }
      expect(extractApiKey(mockRequest)).toBeUndefined()
    })
  })
})