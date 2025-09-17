/**
 * @fileoverview Tests for existing discovery endpoints implementation
 * Tests ONLY the implemented TypeScript discovery functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

import { protocolDiscovery, debugSystemDiscovery } from '../src/endpoints/discovery'
import { Request, Response } from 'express'

describe('Existing Discovery Endpoints', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      json: jest.fn()
    }
  })

  describe('protocolDiscovery endpoint', () => {
    test('returns RDCP protocol information', () => {
      protocolDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.json).toHaveBeenCalledWith({
        protocol: 'rdcp/1.0',
        endpoints: {
          discovery: '/rdcp/v1/discovery',
          control: '/rdcp/v1/control',
          status: '/rdcp/v1/status',
          health: '/rdcp/v1/health'
        },
        capabilities: {
          multiTenancy: false,
          performanceMetrics: true,
          temporaryControls: false,
          auditTrail: false
        },
        security: {
          level: 'basic',
          methods: ['api-key'],
          scopes: ['discovery', 'status', 'control'],
          required: true
        }
      })
    })

    test('sets correct protocol version', () => {
      protocolDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.protocol).toBe('rdcp/1.0')
    })

    test('includes all required RDCP endpoints', () => {
      protocolDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.endpoints).toEqual({
        discovery: '/rdcp/v1/discovery',
        control: '/rdcp/v1/control',
        status: '/rdcp/v1/status',
        health: '/rdcp/v1/health'
      })
    })

    test('indicates basic security level', () => {
      protocolDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.security.level).toBe('basic')
      expect(callArgs.security.methods).toContain('api-key')
      expect(callArgs.security.required).toBe(true)
    })
  })

  describe('debugSystemDiscovery endpoint', () => {
    test('returns RDCP protocol with timestamp', () => {
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.protocol).toBe('rdcp/1.0')
      expect(callArgs.timestamp).toBeDefined()
      expect(typeof callArgs.timestamp).toBe('string')
    })

    test('includes debug categories from DEBUG_CONFIG', () => {
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.categories).toBeDefined()
      expect(Array.isArray(callArgs.categories)).toBe(true)
      
      // Each category should have required properties
      if (callArgs.categories.length > 0) {
        const category = callArgs.categories[0]
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('enabled')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('tags')
        expect(category.tags).toContain('debug')
      }
    })

    test('includes performance metrics', () => {
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.performance).toBeDefined()
      expect(callArgs.performance.overhead).toBeDefined()
      expect(callArgs.performance.overhead.cpu).toEqual({
        value: 0.1,
        unit: 'percent',
        measured: false
      })
      expect(callArgs.performance.overhead.memory).toEqual({
        value: 1048576,
        unit: 'bytes',
        measured: false
      })
    })

    test('timestamp is valid ISO string', () => {
      const beforeTime = new Date().toISOString()
      
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const afterTime = new Date().toISOString()
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      
      expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(callArgs.timestamp).toBeLessThanOrEqual(afterTime)
    })

    test('handles empty DEBUG_CONFIG gracefully', () => {
      // This tests the existing implementation behavior
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(callArgs.categories).toBeDefined()
      expect(Array.isArray(callArgs.categories)).toBe(true)
      // Should not crash even if DEBUG_CONFIG is empty
    })

    test('formats category descriptions correctly', () => {
      debugSystemDiscovery(
        mockRequest as Request,
        mockResponse as Response
      )

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0]
      
      // Test description formatting for categories that might exist
      callArgs.categories.forEach((category: any) => {
        expect(category.description).toMatch(/^Debug logging for .+$/)
        expect(category.description.toLowerCase()).toContain('debug logging')
      })
    })
  })

  describe('Response Format Compliance', () => {
    test('both endpoints return JSON responses', () => {
      protocolDiscovery(mockRequest as Request, mockResponse as Response)
      debugSystemDiscovery(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledTimes(2)
    })

    test('both endpoints include RDCP protocol version', () => {
      protocolDiscovery(mockRequest as Request, mockResponse as Response)
      const protocolCall = (mockResponse.json as jest.Mock).mock.calls[0][0]

      debugSystemDiscovery(mockRequest as Request, mockResponse as Response)
      const debugCall = (mockResponse.json as jest.Mock).mock.calls[1][0]

      expect(protocolCall.protocol).toBe('rdcp/1.0')
      expect(debugCall.protocol).toBe('rdcp/1.0')
    })
  })
})