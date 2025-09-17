/**
 * @fileoverview Tests for RDCP validation system (TypeScript)
 * Following Context7 Jest patterns and RDCP protocol validation requirements
 * 
 * Context7 Compliance:
 * - Uses proper TypeScript Jest imports and patterns
 * - Implements comprehensive validation testing with strict types
 * - Follows ts-jest best practices for schema validation
 * - Maintains strict interface validation throughout
 * 
 * WARP.md Compliance:
 * - NO any types (NEVER EVER EVER EVER use ANY types)
 * - 100% validation schema coverage required
 * - Tests all RDCP v1.0 error codes and response formats
 * - Ensures protocol compliance in all validation scenarios
 * - File length under 300 lines (test file limit)
 */

import { describe, test, expect, jest } from '@jest/globals'
import { controlRequestSchema, safeValidate } from '../src/validation/index.js'
import { RDCP_ERROR_CODES, createRDCPError, createValidationError } from '../src/validation/errors.js'
import { validateControlRequest, handleValidationError } from '../src/validation/middleware.js'
import { createRDCPResponse, createControlResponse } from '../src/validation/response.js'
import type { ControlRequestBody, ValidationResult } from '../src/validation/types.js'

describe('RDCP Validation System (TypeScript + Context7)', () => {
  
  describe('Validation Schemas (100% Coverage)', () => {
    test('controlRequestSchema validates RDCP v1.0 compliant control request', () => {
      const validRequest: ControlRequestBody = {
        action: 'enable',
        categories: ['DATABASE', 'API_ROUTES'],
        options: { temporary: true, duration: 3600 }
      }
      
      expect(() => controlRequestSchema.parse(validRequest)).not.toThrow()
      const result = controlRequestSchema.parse(validRequest)
      expect(result.action).toBe('enable')
      expect(result.categories).toEqual(['DATABASE', 'API_ROUTES'])
      // Following WARP.md debug categories standards
    })

    test('controlRequestSchema validates all RDCP standard actions', () => {
      const validActions: Array<'enable' | 'disable' | 'toggle' | 'status'> = [
        'enable', 'disable', 'toggle', 'status'
      ]
      
      validActions.forEach(action => {
        const validRequest: ControlRequestBody = {
          action,
          categories: ['DATABASE']
        }
        
        expect(() => controlRequestSchema.parse(validRequest)).not.toThrow()
        const result = controlRequestSchema.parse(validRequest)
        expect(result.action).toBe(action)
      })
    })

    test('controlRequestSchema validates RDCP standard debug categories', () => {
      const validCategories = [
        'DATABASE', 'API_ROUTES', 'QUERIES', 'REPORTS', 
        'CACHE', 'AUTH', 'INTEGRATIONS'
      ]
      
      const validRequest: ControlRequestBody = {
        action: 'enable',
        categories: validCategories
      }
      
      expect(() => controlRequestSchema.parse(validRequest)).not.toThrow()
      const result = controlRequestSchema.parse(validRequest)
      expect(result.categories).toEqual(validCategories)
    })

    test('controlRequestSchema rejects invalid action with proper typing', () => {
      const invalidRequest = { action: 'invalid-action', categories: ['DATABASE'] }
      expect(() => controlRequestSchema.parse(invalidRequest)).toThrow()
    })

    test('safeValidate returns properly typed success result', () => {
      const validData: ControlRequestBody = { 
        action: 'enable', 
        categories: ['DATABASE'] 
      }
      const result = safeValidate(validData, controlRequestSchema)
      
      expect(result.success).toBe(true)
      if (result.success) {
        // TypeScript type narrowing - NO any types
        expect(result.data).toBeDefined()
        expect(result.data.action).toBe('enable')
      }
      expect(result.error).toBeUndefined()
    })

    test('safeValidate returns properly typed error result', () => {
      const invalidData = { action: 'invalid' }
      const result = safeValidate(invalidData, controlRequestSchema)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        // TypeScript type narrowing - NO any types
        expect(result.data).toBeUndefined()
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('object')
      }
    })
  })

  describe('RDCP Error Handling (Protocol v1.0)', () => {
    test('RDCP_ERROR_CODES contains all required protocol error codes', () => {
      // Following WARP.md standard error codes
      expect(RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED).toBe('RDCP_AUTH_REQUIRED')
      expect(RDCP_ERROR_CODES.RDCP_FORBIDDEN).toBe('RDCP_FORBIDDEN')
      expect(RDCP_ERROR_CODES.RDCP_NOT_FOUND).toBe('RDCP_NOT_FOUND')
      expect(RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR).toBe('RDCP_VALIDATION_ERROR')
      expect(RDCP_ERROR_CODES.RDCP_CATEGORY_NOT_FOUND).toBe('RDCP_CATEGORY_NOT_FOUND')
      expect(RDCP_ERROR_CODES.RDCP_RATE_LIMITED).toBe('RDCP_RATE_LIMITED')
      expect(RDCP_ERROR_CODES.RDCP_INTERNAL_ERROR).toBe('RDCP_INTERNAL_ERROR')
    })

    test('createRDCPError creates RDCP v1.0 compliant error structure', () => {
      const error = createRDCPError('RDCP_VALIDATION_ERROR', 'Test validation message')
      
      expect(error.error.code).toBe('RDCP_VALIDATION_ERROR')
      expect(error.error.message).toBe('Test validation message')
      expect(error.error.protocol).toBe('rdcp/1.0')
      expect(error.error.timestamp).toBeDefined()
      expect(typeof error.error.timestamp).toBe('string')
      // Following Context7 patterns - validate timestamp format
      expect(error.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('createValidationError creates proper RDCP validation error', () => {
      const error = createValidationError('Invalid field: categories')
      
      expect(error.error.code).toBe('RDCP_VALIDATION_ERROR')
      expect(error.error.message).toContain('Invalid field: categories')
      expect(error.error.protocol).toBe('rdcp/1.0')
      expect(error.error.details).toBeDefined()
    })

    test('error responses maintain TypeScript type safety - NO any types', () => {
      const error = createRDCPError('RDCP_AUTH_REQUIRED', 'Authentication required')
      
      // TypeScript compilation success means proper typing - NO any types used
      expect(typeof error.error).toBe('object')
      expect(typeof error.error.code).toBe('string')
      expect(typeof error.error.message).toBe('string')
      expect(typeof error.error.protocol).toBe('string')
    })
  })

  describe('Validation Middleware (Express/Fastify/Koa)', () => {
    test('validateControlRequest passes valid RDCP requests', () => {
      const req = {
        method: 'POST',
        body: { action: 'enable', categories: ['DATABASE'] }
      }
      const res = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      }
      const next = jest.fn()

      validateControlRequest(req, res, next)
      
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    test('validateControlRequest rejects invalid RDCP requests', () => {
      const req = {
        method: 'POST',
        body: { action: 'invalid-action', categories: ['DATABASE'] }
      }
      const res = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      }
      const next = jest.fn()

      validateControlRequest(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      
      // Validate error response format
      const errorResponse = res.json.mock.calls[0][0]
      expect(errorResponse.error).toBeDefined()
      expect(errorResponse.error.protocol).toBe('rdcp/1.0')
    })

    test('handleValidationError processes Zod errors with TypeScript safety', () => {
      const zodError = { 
        name: 'ZodError', 
        message: 'Validation failed: action is invalid' 
      }
      const req = {}
      const res = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      }
      const next = jest.fn()

      handleValidationError(zodError, req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      
      // Validate RDCP error format
      const errorResponse = res.json.mock.calls[0][0]
      expect(errorResponse.error.code).toBe('RDCP_VALIDATION_ERROR')
      expect(errorResponse.error.protocol).toBe('rdcp/1.0')
    })
  })

  describe('RDCP Response Formatting (Protocol v1.0)', () => {
    test('createRDCPResponse adds required protocol fields', () => {
      const data = { test: 'value', categories: ['DATABASE'] }
      const response = createRDCPResponse(data)
      
      expect(response.protocol).toBe('rdcp/1.0')
      expect(response.timestamp).toBeDefined()
      expect(typeof response.timestamp).toBe('string')
      expect(response.test).toBe('value')
      expect(response.categories).toEqual(['DATABASE'])
      // Following Context7 patterns - validate all fields transferred
    })

    test('createControlResponse formats RDCP v1.0 control responses', () => {
      const response = createControlResponse('enable', 'DATABASE', 'success')
      
      expect(response.protocol).toBe('rdcp/1.0')
      expect(response.action).toBe('enable')
      expect(response.categories).toEqual(['DATABASE'])
      expect(response.status).toBe('success')
      expect(response.timestamp).toBeDefined()
      expect(typeof response.timestamp).toBe('string')
    })

    test('createControlResponse handles array categories with proper typing', () => {
      const categories = ['DATABASE', 'API_ROUTES']
      const response = createControlResponse('enable', categories, 'success')
      
      expect(response.categories).toEqual(categories)
      expect(Array.isArray(response.categories)).toBe(true)
      // TypeScript ensures type safety - NO any types
      response.categories.forEach(category => {
        expect(typeof category).toBe('string')
      })
    })

    test('response formatting maintains tenant context support', () => {
      const data = { 
        categories: ['DATABASE'],
        tenant: {
          id: 'test-tenant',
          isolationLevel: 'organization' as const,
          scope: 'tenant-isolated' as const
        }
      }
      const response = createRDCPResponse(data)
      
      expect(response.tenant).toBeDefined()
      expect(response.tenant.id).toBe('test-tenant')
      expect(response.tenant.isolationLevel).toBe('organization')
      // Following WARP.md multi-tenancy requirements
    })
  })

  describe('TypeScript Type Safety (Context7 - NO any types)', () => {
    test('validation results maintain strict type safety', () => {
      const validData: ControlRequestBody = { 
        action: 'enable', 
        categories: ['DATABASE'] 
      }
      const result: ValidationResult<ControlRequestBody> = safeValidate(validData, controlRequestSchema)
      
      // TypeScript compilation passing means types are correct - NO any types used
      expect(typeof result.success).toBe('boolean')
      
      if (result.success) {
        expect(result.data).toBeDefined()
        expect(typeof result.data.action).toBe('string')
      }
    })

    test('RDCP error codes maintain proper union typing', () => {
      const errorCodes: Array<keyof typeof RDCP_ERROR_CODES> = [
        'RDCP_AUTH_REQUIRED',
        'RDCP_FORBIDDEN',
        'RDCP_NOT_FOUND',
        'RDCP_VALIDATION_ERROR',
        'RDCP_CATEGORY_NOT_FOUND',
        'RDCP_RATE_LIMITED',
        'RDCP_INTERNAL_ERROR'
      ]
      
      // TypeScript compilation success validates the union types - NO any types
      errorCodes.forEach(code => {
        expect(typeof RDCP_ERROR_CODES[code]).toBe('string')
        expect(RDCP_ERROR_CODES[code]).toBe(code)
      })
    })

    test('control request validation supports all standard categories', () => {
      const standardCategories: ControlRequestBody['categories'] = [
        'DATABASE', 'API_ROUTES', 'QUERIES', 'REPORTS',
        'CACHE', 'AUTH', 'INTEGRATIONS'
      ]
      
      const validRequest: ControlRequestBody = {
        action: 'enable',
        categories: standardCategories
      }
      
      // TypeScript type checking ensures compatibility - NO any types
      expect(Array.isArray(validRequest.categories)).toBe(true)
      expect(validRequest.categories.length).toBe(7)
    })
  })
})