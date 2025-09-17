/**
 * @fileoverview RDCP validation errors
 * Standard error response creation following RDCP v1.0 protocol
 */

/**
 * RDCP Authentication Error class
 */
class RDCPAuthError extends Error {
  constructor(code, message, statusCode = 401) {
    super(message)
    this.name = 'RDCPAuthError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Creates RDCP standard error response
 * 
 * @param {string} code - RDCP error code
 * @param {string} message - Human-readable error message
 * @returns {Object} RDCP standard error response
 */
function createRDCPError(code, message) {
  return {
    error: {
      code,
      message,
      protocol: 'rdcp/1.0'
    }
  }
}

module.exports = {
  RDCPAuthError,
  createRDCPError
}