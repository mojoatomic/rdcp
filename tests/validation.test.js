/**
 * @fileoverview Tests for RDCP validation system
 * Tests validation schemas, error handling, and response formatting
 */

const { controlRequestSchema, safeValidate } = require('../src/validation/index')
const { RDCP_ERROR_CODES, createRDCPError, createValidationError } = require('../src/validation/errors')
const { validateControlRequest, handleValidationError } = require('../src/validation/middleware')
const { createRDCPResponse, createControlResponse } = require('../src/validation/response')

describe('RDCP Validation System', () => {
  
  describe('Validation Schemas', () => {
    test('controlRequestSchema validates valid control request', () => {
      const validRequest = {
        action: 'enable',
        categories: ['database', 'api'],
        options: { temporary: true, duration: 3600 }
      }
      
      expect(() => controlRequestSchema.parse(validRequest)).not.toThrow()
      const result = controlRequestSchema.parse(validRequest)
      expect(result.action).toBe('enable')
      expect(result.categories).toEqual(['database', 'api'])
    })

    test('controlRequestSchema rejects invalid action', () => {
      const invalidRequest = { action: 'invalid', categories: ['test'] }
      expect(() => controlRequestSchema.parse(invalidRequest)).toThrow()
    })

    test('safeValidate returns success for valid data', () => {
      const validData = { action: 'enable', categories: 'database' }
      const result = safeValidate(validData, controlRequestSchema)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    test('safeValidate returns error for invalid data', () => {
      const invalidData = { action: 'invalid' }
      const result = safeValidate(invalidData, controlRequestSchema)
      
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('RDCP_ERROR_CODES contains all required codes', () => {
      expect(RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED).toBe('RDCP_AUTH_REQUIRED')
      expect(RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR).toBe('RDCP_VALIDATION_ERROR')
      expect(RDCP_ERROR_CODES.RDCP_SERVER_ERROR).toBe('RDCP_SERVER_ERROR')
    })

    test('createRDCPError creates proper error structure', () => {
      const error = createRDCPError('TEST_CODE', 'Test message')
      
      expect(error.error.code).toBe('TEST_CODE')
      expect(error.error.message).toBe('Test message')
      expect(error.error.protocol).toBe('rdcp/1.0')
      expect(error.error.timestamp).toBeDefined()
    })

    test('createValidationError creates validation error', () => {
      const error = createValidationError('Invalid field')
      
      expect(error.error.code).toBe('RDCP_VALIDATION_ERROR')
      expect(error.error.message).toContain('Invalid field')
      expect(error.error.protocol).toBe('rdcp/1.0')
    })
  })

  describe('Middleware Functions', () => {
    test('validateControlRequest passes valid requests', () => {
      const req = {
        method: 'POST',
        body: { action: 'enable', categories: 'test' }
      }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      const next = jest.fn()

      validateControlRequest(req, res, next)
      
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('validateControlRequest rejects invalid requests', () => {
      const req = {
        method: 'POST',
        body: { action: 'invalid', categories: 'test' }
      }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      const next = jest.fn()

      validateControlRequest(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    test('handleValidationError handles Zod errors', () => {
      const err = { name: 'ZodError', message: 'Validation failed' }
      const req = {}
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      const next = jest.fn()

      handleValidationError(err, req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('Response Formatting', () => {
    test('createRDCPResponse adds protocol and timestamp', () => {
      const data = { test: 'value' }
      const response = createRDCPResponse(data)
      
      expect(response.protocol).toBe('rdcp/1.0')
      expect(response.timestamp).toBeDefined()
      expect(response.test).toBe('value')
    })

    test('createControlResponse formats control responses', () => {
      const response = createControlResponse('enable', 'database', 'success')
      
      expect(response.protocol).toBe('rdcp/1.0')
      expect(response.action).toBe('enable')
      expect(response.categories).toEqual(['database'])
      expect(response.status).toBe('success')
      expect(response.timestamp).toBeDefined()
    })

    test('createControlResponse handles array categories', () => {
      const response = createControlResponse('enable', ['db', 'api'], 'success')
      
      expect(response.categories).toEqual(['db', 'api'])
    })
  })
})