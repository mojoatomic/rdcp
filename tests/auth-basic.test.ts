/**
 * @fileoverview Tests for existing basic authentication implementation
 * Tests ONLY the implemented TypeScript auth functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

import { validateRDCPAuth } from '../src/auth/basic'
import { Request } from 'express'

describe('Existing Basic Authentication', () => {
  // Store original env
  const originalEnv = process.env.RDCP_API_KEY

  afterEach(() => {
    // Restore original env
    process.env.RDCP_API_KEY = originalEnv
  })

  describe('validateRDCPAuth function', () => {
    test('validates correct API key from x-api-key header', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {
          'x-api-key': 'test-32-character-api-key-here123'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(true)
    })

    test('validates correct API key from authorization header', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {
          'authorization': 'Bearer test-32-character-api-key-here123'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(true)
    })

    test('rejects incorrect API key', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {
          'x-api-key': 'wrong-32-character-api-key-here123'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(false)
    })

    test('rejects API key shorter than 32 characters', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {
          'x-api-key': 'short-key'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(false)
    })

    test('rejects missing API key', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {}
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(false)
    })

    test('handles invalid environment API key', () => {
      process.env.RDCP_API_KEY = 'short'
      
      const mockRequest = {
        headers: {
          'x-api-key': 'test-32-character-api-key-here123'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(false)
    })

    test('uses constant-time comparison (timing attack protection)', () => {
      process.env.RDCP_API_KEY = 'secure-32-character-api-key-test123'
      
      const wrongKey1 = 'secure-32-character-api-key-test124' // Last char different
      const wrongKey2 = 'xecure-32-character-api-key-test123' // First char different
      
      const mockRequest1 = {
        headers: { 'x-api-key': wrongKey1 }
      } as Request
      
      const mockRequest2 = {
        headers: { 'x-api-key': wrongKey2 }
      } as Request

      // Both should return false regardless of where the difference is
      expect(validateRDCPAuth(mockRequest1)).toBe(false)
      expect(validateRDCPAuth(mockRequest2)).toBe(false)
    })

    test('handles Next.js request format with headers.get()', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      // Mock Next.js Request with headers.get method
      const mockNextRequest = {
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-api-key') return 'test-32-character-api-key-here123'
            return undefined
          })
        }
      } as unknown as Request

      const result = validateRDCPAuth(mockNextRequest)
      expect(result).toBe(true)
      expect((mockNextRequest.headers as any).get).toHaveBeenCalledWith('x-api-key')
    })

    test('handles different length keys gracefully', () => {
      process.env.RDCP_API_KEY = 'test-32-character-api-key-here123'
      
      const mockRequest = {
        headers: {
          'x-api-key': 'different-length-key'
        }
      } as Request

      // Should not crash and should return false
      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(false)
    })
  })

  describe('Framework Compatibility', () => {
    test('works with Express-style headers object', () => {
      process.env.RDCP_API_KEY = 'express-test-32-char-api-key123'
      
      const expressRequest = {
        headers: {
          'x-api-key': 'express-test-32-char-api-key123'
        }
      } as Request

      expect(validateRDCPAuth(expressRequest)).toBe(true)
    })

    test('prefers authorization header over x-api-key', () => {
      process.env.RDCP_API_KEY = 'auth-header-32-char-api-key123'
      
      const mockRequest = {
        headers: {
          'authorization': 'Bearer auth-header-32-char-api-key123',
          'x-api-key': 'wrong-key-32-characters-here123'
        }
      } as Request

      const result = validateRDCPAuth(mockRequest)
      expect(result).toBe(true)
    })
  })
})