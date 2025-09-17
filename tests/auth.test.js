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

    test('rejects request without API key (missing RDCP headers)', () => {
      const mockRequest = { headers: {} }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required header: X-RDCP-Auth-Method')
    })

    test('rejects request with short API key (missing RDCP headers)', () => {
      const mockRequest = { 
        headers: { 'x-api-key': shortApiKey }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required header: X-RDCP-Auth-Method')
    })

    test('rejects short API key when RDCP headers are present', () => {
      const mockRequest = {
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-rdcp-client-id': 'test-client',
          'x-api-key': shortApiKey 
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('API key must be at least 32 characters')
    })

    test('rejects valid length API key that does not match env key', () => {
      const mockRequest = {
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-rdcp-client-id': 'test-client',
          'x-api-key': validApiKey 
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // False because env key doesn't match
      expect(result.error).toContain('Invalid API key')
      expect(result.method).toBe('api-key')
    })

    test('handles Authorization header with valid RDCP headers', () => {
      const mockRequest = {
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-rdcp-client-id': 'test-client',
          'authorization': `Bearer ${validApiKey}` 
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // False because env key doesn't match
      expect(result.error).toContain('Invalid API key')
      expect(result.method).toBe('api-key')
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

  describe('RDCP Header Validation', () => {
    const validHeaders = {
      'x-rdcp-auth-method': 'api-key',
      'x-rdcp-client-id': 'test-client-123',
      'x-rdcp-request-id': 'req-456',
      'x-api-key': validApiKey
    }

    test('validates required RDCP headers are present', () => {
      const mockRequest = { headers: validHeaders }
      const result = validateRDCPAuth(mockRequest)
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('method')
    })

    test('rejects request missing X-RDCP-Auth-Method header', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required header: X-RDCP-Auth-Method')
    })

    test('rejects request missing X-RDCP-Client-ID header', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required header: X-RDCP-Client-ID')
    })

    test('rejects invalid X-RDCP-Auth-Method value', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'invalid-method',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid X-RDCP-Auth-Method')
      expect(result.error).toContain('api-key, bearer, mtls, hybrid')
    })

    test('accepts valid auth methods: api-key', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // Still false due to env key mismatch, but no header error
      expect(result.error).not.toContain('Missing required header')
    })

    test('accepts valid auth methods: bearer', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'bearer',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // Still false due to env key mismatch, but no header error
      expect(result.error).not.toContain('Invalid X-RDCP-Auth-Method')
    })

    test('accepts valid auth methods: mtls', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'mtls',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // Still false due to env key mismatch, but no header error
      expect(result.error).not.toContain('Invalid X-RDCP-Auth-Method')
    })

    test('accepts valid auth methods: hybrid', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'hybrid',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // Still false due to env key mismatch, but no header error
      expect(result.error).not.toContain('Invalid X-RDCP-Auth-Method')
    })

    test('X-RDCP-Request-ID is optional', () => {
      const mockRequest = { 
        headers: { 
          'x-rdcp-auth-method': 'api-key',
          'x-rdcp-client-id': 'test-client-123',
          'x-api-key': validApiKey
          // No X-RDCP-Request-ID header
        }
      }
      const result = validateRDCPAuth(mockRequest)
      expect(result.valid).toBe(false) // Still false due to env key mismatch, but no header error
      expect(result.error).not.toContain('Missing required header: X-RDCP-Request-ID')
    })
  })
})
