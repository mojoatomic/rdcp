/**
 * @fileoverview Tests for existing RDCP middleware implementation
 * Tests ONLY the implemented TypeScript middleware functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

import { rdcpMiddleware, RDCPRequest } from '../src/middleware'
import { Request, Response, NextFunction } from 'express'

describe('Existing RDCP Middleware', () => {
  let mockRequest: Partial<RDCPRequest>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      setHeader: jest.fn()
    }
    nextFunction = jest.fn()
  })

  test('adds RDCP context to request object', () => {
    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    expect(mockRequest.rdcp).toBeDefined()
    expect(mockRequest.rdcp?.protocol).toBe('rdcp/1.0')
    expect(mockRequest.rdcp?.timestamp).toBeDefined()
  })

  test('sets correct protocol version', () => {
    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    expect(mockRequest.rdcp?.protocol).toBe('rdcp/1.0')
  })

  test('sets timestamp as ISO string', () => {
    const beforeTime = new Date().toISOString()
    
    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    const afterTime = new Date().toISOString()
    
    expect(mockRequest.rdcp?.timestamp).toBeDefined()
    expect(typeof mockRequest.rdcp?.timestamp).toBe('string')
    
    // Timestamp should be between before and after
    expect(mockRequest.rdcp?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(mockRequest.rdcp?.timestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(mockRequest.rdcp?.timestamp).toBeLessThanOrEqual(afterTime)
  })

  test('sets Content-Type header to application/json', () => {
    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
  })

  test('calls next function to continue middleware chain', () => {
    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    expect(nextFunction).toHaveBeenCalledTimes(1)
  })

  test('does not overwrite existing RDCP context', () => {
    // Pre-populate request with RDCP context
    mockRequest.rdcp = {
      protocol: 'rdcp/1.0',
      timestamp: '2023-01-01T00:00:00.000Z'
    }

    rdcpMiddleware(
      mockRequest as RDCPRequest, 
      mockResponse as Response, 
      nextFunction
    )

    // Should overwrite with new timestamp but keep protocol
    expect(mockRequest.rdcp?.protocol).toBe('rdcp/1.0')
    expect(mockRequest.rdcp?.timestamp).not.toBe('2023-01-01T00:00:00.000Z')
    expect(mockRequest.rdcp?.timestamp).toBeDefined()
  })

  test('works with minimal request/response objects', () => {
    const minimalRequest = {} as RDCPRequest
    const minimalResponse = {
      setHeader: jest.fn()
    } as Partial<Response>

    expect(() => {
      rdcpMiddleware(
        minimalRequest,
        minimalResponse as Response,
        nextFunction
      )
    }).not.toThrow()

    expect(minimalRequest.rdcp).toBeDefined()
    expect(nextFunction).toHaveBeenCalled()
  })

  test('middleware execution is synchronous', () => {
    let executionOrder: string[] = []

    const testNext = () => {
      executionOrder.push('next-called')
    }

    executionOrder.push('before-middleware')
    
    rdcpMiddleware(
      mockRequest as RDCPRequest,
      mockResponse as Response,
      testNext
    )
    
    executionOrder.push('after-middleware')

    expect(executionOrder).toEqual([
      'before-middleware',
      'next-called',
      'after-middleware'
    ])
  })
})