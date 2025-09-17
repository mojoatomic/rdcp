/**
 * @fileoverview Tests for existing control endpoint implementation
 * Tests ONLY the implemented TypeScript debug control functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

import { runtimeControl } from '../src/endpoints/control'
import { Request, Response } from 'express'

// Mock the debug module
jest.mock('../src/debug', () => ({
  enableDebugCategories: jest.fn(),
  disableDebugCategories: jest.fn(),
  DEBUG_CONFIG: {
    DATABASE: false,
    API_ROUTES: false,
    QUERIES: false
  }
}))

// Mock the schemas module
jest.mock('../src/schemas', () => ({
  controlRequestSchema: {
    parse: jest.fn()
  }
}))

import { enableDebugCategories, disableDebugCategories, DEBUG_CONFIG } from '../src/debug'
import { controlRequestSchema } from '../src/schemas'

describe('Existing Runtime Control Endpoint', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockRequest = {
      body: {}
    }
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    }
    
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('Enable action', () => {
    test('enables single debug category', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)
      mockRequest.body = { action: 'enable', categories: 'DATABASE' }

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).toHaveBeenCalledWith(['DATABASE'])
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'rdcp/1.0',
          success: true,
          changes: expect.arrayContaining([
            expect.objectContaining({
              category: 'DATABASE',
              previousState: false,
              newState: true
            })
          ])
        })
      )
    })

    test('enables multiple debug categories', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: ['DATABASE', 'API_ROUTES']
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).toHaveBeenCalledWith(['DATABASE', 'API_ROUTES'])
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({ category: 'DATABASE' }),
            expect.objectContaining({ category: 'API_ROUTES' })
          ])
        })
      )
    })

    test('handles array of categories', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: ['QUERIES']
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).toHaveBeenCalledWith(['QUERIES'])
    })
  })

  describe('Disable action', () => {
    test('disables single debug category', () => {
      const mockParsedRequest = {
        action: 'disable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(disableDebugCategories).toHaveBeenCalledWith(['DATABASE'])
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              category: 'DATABASE',
              previousState: true,
              newState: false
            })
          ])
        })
      )
    })

    test('disables multiple debug categories', () => {
      const mockParsedRequest = {
        action: 'disable',
        categories: ['DATABASE', 'QUERIES']
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(disableDebugCategories).toHaveBeenCalledWith(['DATABASE', 'QUERIES'])
    })
  })

  describe('Reset action', () => {
    test('resets all debug categories', () => {
      const mockParsedRequest = {
        action: 'reset',
        categories: []
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(disableDebugCategories).toHaveBeenCalledWith(['DATABASE', 'API_ROUTES', 'QUERIES'])
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              category: 'ALL',
              previousState: true,
              newState: false
            })
          ])
        })
      )
    })
  })

  describe('Response format', () => {
    test('includes RDCP protocol version', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.protocol).toBe('rdcp/1.0')
    })

    test('includes unique request ID', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.requestId).toBeDefined()
      expect(callArgs.requestId).toMatch(/^req_\d+$/)
    })

    test('includes success status', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.success).toBe(true)
    })

    test('includes effectiveAt timestamp in changes', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      const beforeTime = new Date().toISOString()
      runtimeControl(mockRequest as Request, mockResponse as Response)
      const afterTime = new Date().toISOString()

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      const change = callArgs.changes[0]
      expect(change.effectiveAt).toBeDefined()
      expect(change.effectiveAt).toBeGreaterThanOrEqual(beforeTime)
      expect(change.effectiveAt).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('Error handling', () => {
    test('handles validation errors', () => {
      ;(controlRequestSchema.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Validation failed')
      })

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RDCP_VALIDATION_ERROR',
          message: 'Request validation failed',
          protocol: 'rdcp/1.0'
        }
      })
    })

    test('does not call debug functions when validation fails', () => {
      ;(controlRequestSchema.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Validation failed')
      })

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).not.toHaveBeenCalled()
      expect(disableDebugCategories).not.toHaveBeenCalled()
    })
  })

  describe('Category handling', () => {
    test('converts single category string to array', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: 'DATABASE'
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).toHaveBeenCalledWith(['DATABASE'])
    })

    test('handles array of categories directly', () => {
      const mockParsedRequest = {
        action: 'enable',
        categories: ['DATABASE', 'API_ROUTES']
      }
      
      ;(controlRequestSchema.parse as jest.Mock).mockReturnValue(mockParsedRequest)

      runtimeControl(mockRequest as Request, mockResponse as Response)

      expect(enableDebugCategories).toHaveBeenCalledWith(['DATABASE', 'API_ROUTES'])
    })
  })
})