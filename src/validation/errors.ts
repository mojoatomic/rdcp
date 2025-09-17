/**
 * @fileoverview RDCP validation errors
 * Standard error response creation following RDCP v1.0 protocol
 */

import { RDCPError } from '../utils/types.js'

/**
 * Standard RDCP v1.0 error codes
 * Must match protocol specification exactly
 */
export const RDCP_ERROR_CODES = {
  // Authentication errors (4xx)
  RDCP_AUTH_REQUIRED: 'RDCP_AUTH_REQUIRED',
  RDCP_INVALID_TOKEN: 'RDCP_INVALID_TOKEN',
  RDCP_TOKEN_EXPIRED: 'RDCP_TOKEN_EXPIRED',
  RDCP_FORBIDDEN: 'RDCP_FORBIDDEN',
  RDCP_INVALID_CLIENT: 'RDCP_INVALID_CLIENT',
  
  // Validation errors (4xx)
  RDCP_VALIDATION_ERROR: 'RDCP_VALIDATION_ERROR',
  RDCP_INVALID_ACTION: 'RDCP_INVALID_ACTION',
  RDCP_INVALID_CATEGORY: 'RDCP_INVALID_CATEGORY',
  RDCP_CATEGORY_NOT_FOUND: 'RDCP_CATEGORY_NOT_FOUND',
  RDCP_MISSING_PARAMETER: 'RDCP_MISSING_PARAMETER',
  RDCP_INVALID_PROTOCOL: 'RDCP_INVALID_PROTOCOL',
  RDCP_NOT_FOUND: 'RDCP_NOT_FOUND',
  RDCP_RATE_LIMITED: 'RDCP_RATE_LIMITED',
  
  // Server errors (5xx)
  RDCP_SERVER_ERROR: 'RDCP_SERVER_ERROR',
  RDCP_INTERNAL_ERROR: 'RDCP_INTERNAL_ERROR',
  RDCP_UNAVAILABLE: 'RDCP_UNAVAILABLE',
  RDCP_TIMEOUT: 'RDCP_TIMEOUT',
  RDCP_CONFIGURATION_ERROR: 'RDCP_CONFIGURATION_ERROR',
  RDCP_STORAGE_ERROR: 'RDCP_STORAGE_ERROR',
  
  // Protocol errors
  RDCP_UNSUPPORTED_VERSION: 'RDCP_UNSUPPORTED_VERSION',
  RDCP_MALFORMED_REQUEST: 'RDCP_MALFORMED_REQUEST'
} as const

/**
 * RDCP error code type
 */
export type RDCPErrorCode = typeof RDCP_ERROR_CODES[keyof typeof RDCP_ERROR_CODES]

/**
 * Error code to HTTP status mapping
 */
export const ERROR_STATUS_MAP: Record<RDCPErrorCode, number> = {
  [RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED]: 401,
  [RDCP_ERROR_CODES.RDCP_INVALID_TOKEN]: 401,
  [RDCP_ERROR_CODES.RDCP_TOKEN_EXPIRED]: 401,
  [RDCP_ERROR_CODES.RDCP_FORBIDDEN]: 403,
  [RDCP_ERROR_CODES.RDCP_INVALID_CLIENT]: 403,
  [RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_ACTION]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_CATEGORY]: 400,
  [RDCP_ERROR_CODES.RDCP_CATEGORY_NOT_FOUND]: 404,
  [RDCP_ERROR_CODES.RDCP_MISSING_PARAMETER]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_PROTOCOL]: 400,
  [RDCP_ERROR_CODES.RDCP_NOT_FOUND]: 404,
  [RDCP_ERROR_CODES.RDCP_RATE_LIMITED]: 429,
  [RDCP_ERROR_CODES.RDCP_MALFORMED_REQUEST]: 400,
  [RDCP_ERROR_CODES.RDCP_UNSUPPORTED_VERSION]: 400,
  [RDCP_ERROR_CODES.RDCP_SERVER_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_INTERNAL_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_UNAVAILABLE]: 503,
  [RDCP_ERROR_CODES.RDCP_TIMEOUT]: 504,
  [RDCP_ERROR_CODES.RDCP_CONFIGURATION_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_STORAGE_ERROR]: 500
}

/**
 * RDCP Error class with status code mapping
 */
export class RDCPErrorClass extends Error {
  public readonly code: RDCPErrorCode
  public readonly statusCode: number

  constructor(code: RDCPErrorCode, message: string, statusCode?: number) {
    super(message)
    this.name = 'RDCPError'
    this.code = code
    this.statusCode = statusCode || ERROR_STATUS_MAP[code] || 500
  }
}

/**
 * Error response with status code
 */
export interface RDCPErrorWithStatus {
  error: RDCPError['error']
  statusCode: number
}

/**
 * Creates RDCP standard error response
 */
export function createRDCPError(code: RDCPErrorCode, message: string): RDCPError {
  return {
    error: {
      code,
      message,
      protocol: 'rdcp/1.0',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Creates RDCP error with automatic status code mapping
 */
export function createRDCPErrorWithStatus(code: RDCPErrorCode, message: string): RDCPErrorWithStatus {
  return {
    error: createRDCPError(code, message).error,
    statusCode: ERROR_STATUS_MAP[code] || 500
  }
}

/**
 * Validates if error code is a standard RDCP code
 */
export function isValidRDCPErrorCode(code: string): code is RDCPErrorCode {
  return Object.values(RDCP_ERROR_CODES).includes(code as RDCPErrorCode)
}

/**
 * Creates validation error for invalid request data
 */
export function createValidationError(details: string): RDCPError {
  return {
    error: {
      code: RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR,
      message: `Request validation failed: ${details}`,
      details: { validation: details },
      protocol: 'rdcp/1.0',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Creates authentication error
 */
export function createAuthError(reason: string): RDCPError {
  return createRDCPError(
    RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED,
    `Authentication required: ${reason}`
  )
}

// Legacy export for backward compatibility
export { RDCPErrorClass as RDCPAuthError }