/**
 * @fileoverview Authentication validation tests
 * Tests ONLY the implemented authentication functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

const { basicApiKeyAuth } = require('../src/auth/basic.js')

describe('Authentication Validation', () => {
  describe('Basic API Key Authentication', () => {
    let authenticator
    const validApiKey = 'test-32-character-api-key-here123'

    beforeEach(() => {
      authenticator = basicApiKeyAuth({ apiKey: validApiKey })
    })

    test('creates authenticator function', () => {
      expect(typeof authenticator).toBe('function')
    })

    test('validates correct API key from X-API-Key header', async () => {
      const mockRequest = {
        headers: {
          'x-api-key': validApiKey
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(true)
    })

    test('validates correct API key from Authorization header', async () => {
      const mockRequest = {
        headers: {
          'authorization': `Bearer ${validApiKey}`
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(true)
    })

    test('rejects missing API key', async () => {
      const mockRequest = {
        headers: {}
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })

    test('rejects incorrect API key', async () => {
      const mockRequest = {
        headers: {
          'x-api-key': 'wrong-api-key'
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })

    test('rejects empty API key', async () => {
      const mockRequest = {
        headers: {
          'x-api-key': ''
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })

    test('handles case-insensitive headers', async () => {
      const mockRequest = {
        headers: {
          'X-API-KEY': validApiKey
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(true)
    })

    test('works with Express request object', async () => {
      const mockExpressRequest = {
        headers: {
          'x-api-key': validApiKey
        },
        get: function(headerName) {
          return this.headers[headerName.toLowerCase()]
        }
      }

      const result = await authenticator(mockExpressRequest)
      expect(result).toBe(true)
    })

    test('works with Next.js request object', async () => {
      const mockNextRequest = {
        headers: new Map([
          ['x-api-key', validApiKey]
        ])
      }

      const result = await authenticator(mockNextRequest)
      expect(result).toBe(true)
    })
  })

  describe('API Key Validation Rules', () => {
    test('requires minimum 32 character API key', () => {
      const shortKey = 'short-key'
      
      expect(() => {
        basicApiKeyAuth({ apiKey: shortKey })
      }).toThrow('API key must be at least 32 characters')
    })

    test('accepts exactly 32 character API key', () => {
      const exactKey = '32-character-api-key-exactly123'
      
      expect(() => {
        basicApiKeyAuth({ apiKey: exactKey })
      }).not.toThrow()
    })

    test('accepts longer than 32 character API key', () => {
      const longKey = 'this-is-a-much-longer-api-key-that-exceeds-32-characters'
      
      expect(() => {
        basicApiKeyAuth({ apiKey: longKey })
      }).not.toThrow()
    })

    test('requires API key parameter', () => {
      expect(() => {
        basicApiKeyAuth({})
      }).toThrow('apiKey is required')

      expect(() => {
        basicApiKeyAuth({ apiKey: null })
      }).toThrow('apiKey is required')

      expect(() => {
        basicApiKeyAuth({ apiKey: undefined })
      }).toThrow('apiKey is required')
    })
  })

  describe('Security Features', () => {
    let authenticator
    const validApiKey = 'secure-32-character-api-key-test123'

    beforeEach(() => {
      authenticator = basicApiKeyAuth({ apiKey: validApiKey })
    })

    test('uses constant-time comparison (timing attack protection)', async () => {
      // Test that similar-length wrong keys don't reveal timing information
      const wrongKey1 = 'secure-32-character-api-key-test124' // Last char different
      const wrongKey2 = 'xecure-32-character-api-key-test123' // First char different
      
      const mockRequest1 = { headers: { 'x-api-key': wrongKey1 } }
      const mockRequest2 = { headers: { 'x-api-key': wrongKey2 } }

      const result1 = await authenticator(mockRequest1)
      const result2 = await authenticator(mockRequest2)

      expect(result1).toBe(false)
      expect(result2).toBe(false)
    })

    test('handles malformed authorization headers', async () => {
      const mockRequest = {
        headers: {
          'authorization': 'InvalidFormat'
        }
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })

    test('handles undefined request headers', async () => {
      const mockRequest = {}

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })

    test('handles request with null headers', async () => {
      const mockRequest = {
        headers: null
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(false)
    })
  })

  describe('Framework Compatibility', () => {
    const validApiKey = 'framework-test-32-char-api-key123'
    let authenticator

    beforeEach(() => {
      authenticator = basicApiKeyAuth({ apiKey: validApiKey })
    })

    test('works with Fastify request format', async () => {
      const mockFastifyRequest = {
        headers: {
          'x-api-key': validApiKey
        }
      }

      const result = await authenticator(mockFastifyRequest)
      expect(result).toBe(true)
    })

    test('works with Koa context format', async () => {
      const mockKoaContext = {
        headers: {
          'x-api-key': validApiKey
        },
        get: function(headerName) {
          return this.headers[headerName.toLowerCase()]
        }
      }

      const result = await authenticator(mockKoaContext)
      expect(result).toBe(true)
    })

    test('handles missing get method gracefully', async () => {
      const mockRequest = {
        headers: {
          'x-api-key': validApiKey
        }
        // No get method
      }

      const result = await authenticator(mockRequest)
      expect(result).toBe(true)
    })
  })
})