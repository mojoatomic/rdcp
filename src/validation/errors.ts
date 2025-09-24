/**
 * @fileoverview RDCP validation errors
 * Standard error response creation following RDCP v1.0 protocol
 */

import { RDCPError } from '../utils/types.js'
import { PROTOCOL_VERSION, RDCP_ERROR_CODES, RDCPErrorCode } from '@rdcp.dev/core'

/**
 * Standard RDCP v1.0 error codes
 * Must match protocol specification exactly
 */
// RDCP_ERROR_CODES are protocol constants; import from core and re-export for compatibility
export { RDCP_ERROR_CODES } from '@rdcp.dev/core'

/**
 * RDCP error code type
 */
export type { RDCPErrorCode } from '@rdcp.dev/core'

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
  [RDCP_ERROR_CODES.RDCP_REQUEST_ID_INVALID]: 400,
  [RDCP_ERROR_CODES.RDCP_MALFORMED_REQUEST]: 400,
  [RDCP_ERROR_CODES.RDCP_UNSUPPORTED_VERSION]: 400,
  [RDCP_ERROR_CODES.RDCP_SERVER_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_INTERNAL_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_UNAVAILABLE]: 503,
  [RDCP_ERROR_CODES.RDCP_TIMEOUT]: 504,
  [RDCP_ERROR_CODES.RDCP_CONFIGURATION_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_STORAGE_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_AUDIT_WRITE_FAILED]: 500,
  [RDCP_ERROR_CODES.RDCP_RATE_LIMIT_MISCONFIGURED]: 500,
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
    this.statusCode = statusCode ?? ERROR_STATUS_MAP[code] ?? 500
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
export function createRDCPError(
  code: RDCPErrorCode,
  message: string,
  details?: Record<string, unknown>
): RDCPError {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      protocol: PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Creates RDCP error with automatic status code mapping
 */
export function createRDCPErrorWithStatus(
  code: RDCPErrorCode,
  message: string,
  details?: Record<string, unknown>
): RDCPErrorWithStatus {
  return {
    error: createRDCPError(code, message, details).error,
    statusCode: ERROR_STATUS_MAP[code] || 500,
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
      timestamp: new Date().toISOString(),
    },
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

/**
 * Specialized details for rate limiting error
 */
export interface RateLimitErrorDetails extends Record<string, unknown> {
  limit: number
  remaining: number
  reset: number // epoch seconds
  retryAfterSec?: number
  policy?: string
  requestId?: string
}

/**
 * Specialized details for audit write error
 */
export interface AuditWriteErrorDetails extends Record<string, unknown> {
  sink: 'file' | 'console' | 'custom' | 'none'
  reason: string
  requestId?: string
}

export function createRateLimitError(
  details: RateLimitErrorDetails,
  message = 'Request was rate limited'
): RDCPError {
  return createRDCPError(RDCP_ERROR_CODES.RDCP_RATE_LIMITED, message, details)
}

export function createAuditWriteError(
  details: AuditWriteErrorDetails,
  message = 'Failed to write audit record'
): RDCPError {
  return createRDCPError(
    RDCP_ERROR_CODES.RDCP_AUDIT_WRITE_FAILED,
    message,
    details
  )
}

// Legacy export for backward compatibility
export { RDCPErrorClass as RDCPAuthError }
