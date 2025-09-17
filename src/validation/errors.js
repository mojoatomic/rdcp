/**
 * @fileoverview RDCP validation errors
 * Standard error response creation following RDCP v1.0 protocol
 */

// Standard RDCP v1.0 error codes
const RDCP_ERROR_CODES = {
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
  RDCP_MISSING_PARAMETER: 'RDCP_MISSING_PARAMETER',
  RDCP_INVALID_PROTOCOL: 'RDCP_INVALID_PROTOCOL',
  
  // Server errors (5xx)
  RDCP_SERVER_ERROR: 'RDCP_SERVER_ERROR',
  RDCP_UNAVAILABLE: 'RDCP_UNAVAILABLE',
  RDCP_TIMEOUT: 'RDCP_TIMEOUT',
  RDCP_CONFIGURATION_ERROR: 'RDCP_CONFIGURATION_ERROR',
  RDCP_STORAGE_ERROR: 'RDCP_STORAGE_ERROR',
  
  // Protocol errors
  RDCP_UNSUPPORTED_VERSION: 'RDCP_UNSUPPORTED_VERSION',
  RDCP_MALFORMED_REQUEST: 'RDCP_MALFORMED_REQUEST'
}

// Error code to HTTP status mapping
const ERROR_STATUS_MAP = {
  [RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED]: 401,
  [RDCP_ERROR_CODES.RDCP_INVALID_TOKEN]: 401,
  [RDCP_ERROR_CODES.RDCP_TOKEN_EXPIRED]: 401,
  [RDCP_ERROR_CODES.RDCP_FORBIDDEN]: 403,
  [RDCP_ERROR_CODES.RDCP_INVALID_CLIENT]: 403,
  [RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_ACTION]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_CATEGORY]: 400,
  [RDCP_ERROR_CODES.RDCP_MISSING_PARAMETER]: 400,
  [RDCP_ERROR_CODES.RDCP_INVALID_PROTOCOL]: 400,
  [RDCP_ERROR_CODES.RDCP_MALFORMED_REQUEST]: 400,
  [RDCP_ERROR_CODES.RDCP_UNSUPPORTED_VERSION]: 400,
  [RDCP_ERROR_CODES.RDCP_SERVER_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_UNAVAILABLE]: 503,
  [RDCP_ERROR_CODES.RDCP_TIMEOUT]: 504,
  [RDCP_ERROR_CODES.RDCP_CONFIGURATION_ERROR]: 500,
  [RDCP_ERROR_CODES.RDCP_STORAGE_ERROR]: 500
}

/**
 * RDCP Error class with status code mapping
 */
class RDCPError extends Error {
  constructor(code, message, statusCode) {
    super(message)
    this.name = 'RDCPError'
    this.code = code
    this.statusCode = statusCode || ERROR_STATUS_MAP[code] || 500
  }
}

/**
 * Creates RDCP standard error response
 * @param {string} code - RDCP error code
 * @param {string} message - Human-readable error message
 * @returns {Object} RDCP standard error response
 */
function createRDCPError(code, message) {
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
 * @param {string} code - RDCP error code from RDCP_ERROR_CODES
 * @param {string} message - Human-readable error message
 * @returns {Object} Error response with status code
 */
function createRDCPErrorWithStatus(code, message) {
  return {
    error: createRDCPError(code, message).error,
    statusCode: ERROR_STATUS_MAP[code] || 500
  }
}

/**
 * Validates if error code is a standard RDCP code
 * @param {string} code - Error code to validate
 * @returns {boolean} True if valid RDCP error code
 */
function isValidRDCPErrorCode(code) {
  return Object.values(RDCP_ERROR_CODES).includes(code)
}

/**
 * Creates validation error for invalid request data
 * @param {string} details - Validation error details
 * @returns {Object} RDCP validation error response
 */
function createValidationError(details) {
  return createRDCPError(
    RDCP_ERROR_CODES.RDCP_VALIDATION_ERROR,
    `Request validation failed: ${details}`
  )
}

/**
 * Creates authentication error
 * @param {string} reason - Authentication failure reason
 * @returns {Object} RDCP authentication error response
 */
function createAuthError(reason) {
  return createRDCPError(
    RDCP_ERROR_CODES.RDCP_AUTH_REQUIRED,
    `Authentication required: ${reason}`
  )
}

module.exports = {
  RDCP_ERROR_CODES,
  ERROR_STATUS_MAP,
  RDCPError,
  createRDCPError,
  createRDCPErrorWithStatus,
  isValidRDCPErrorCode,
  createValidationError,
  createAuthError,
  // Legacy export for backward compatibility
  RDCPAuthError: RDCPError
}
