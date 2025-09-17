/**
 * @fileoverview JavaScript Authentication Module for RDCP SDK
 * Provides basic API key authentication for JavaScript usage
 */

const crypto = require('crypto')

const RDCP_API_KEY = process.env.RDCP_API_KEY || 'dev-key-change-in-production-min-32-chars'

/**
 * Extract API key from request headers
 * Supports both Express and Next.js request formats
 */
function extractApiKey(request) {
  // Framework detection - Next.js has headers.get(), Express has headers[]
  if (typeof request.headers?.get === 'function') {
    // Next.js Request object
    const authHeader = request.headers.get('authorization')
    const apiKeyHeader = request.headers.get('x-api-key')
    return authHeader?.replace('Bearer ', '') || apiKeyHeader
  } else {
    // Express/Node.js request object
    const authHeader = request.headers['authorization']
    const apiKeyHeader = request.headers['x-api-key']
    return authHeader?.replace('Bearer ', '') || apiKeyHeader
  }
}

/**
 * Validate required RDCP headers
 * Returns object with valid boolean and optional error message
 */
function validateRDCPHeaders(request) {
  // Required headers per RDCP v1.0 specification Section 3.2
  const authMethod = request.headers['x-rdcp-auth-method']
  const clientId = request.headers['x-rdcp-client-id']
  const requestId = request.headers['x-rdcp-request-id']
  
  if (!authMethod) {
    return { valid: false, error: 'Missing required header: X-RDCP-Auth-Method' }
  }
  
  if (!clientId) {
    return { valid: false, error: 'Missing required header: X-RDCP-Client-ID' }
  }
  
  // X-RDCP-Request-ID is optional but recommended for audit trail
  
  const validMethods = ['api-key', 'bearer', 'mtls', 'hybrid']
  if (!validMethods.includes(authMethod)) {
    return { valid: false, error: `Invalid X-RDCP-Auth-Method: ${authMethod}. Must be one of: ${validMethods.join(', ')}` }
  }
  
  return { valid: true }
}

/**
 * Validate RDCP authentication using API key
 * Now returns AuthResult object instead of boolean for RDCP compliance
 */
function validateRDCPAuth(request) {
  // First validate RDCP required headers
  const headerValidation = validateRDCPHeaders(request)
  if (!headerValidation.valid) {
    return {
      valid: false,
      error: headerValidation.error,
      method: 'unknown'
    }
  }
  
  const providedKey = extractApiKey(request)
  
  // Basic security checks
  if (!providedKey || providedKey.length < 32) {
    return {
      valid: false,
      error: 'API key must be at least 32 characters',
      method: 'api-key'
    }
  }
  
  if (!RDCP_API_KEY || RDCP_API_KEY.length < 32) {
    console.error('RDCP_API_KEY must be at least 32 characters for security')
    return {
      valid: false,
      error: 'Server configuration error',
      method: 'api-key'
    }
  }
  
  try {
    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(RDCP_API_KEY),
      Buffer.from(providedKey)
    )
    return {
      valid: isValid,
      method: 'api-key',
      scopes: ['discovery', 'status', 'control', 'health'],
      error: isValid ? undefined : 'Invalid API key'
    }
  } catch (error) {
    // Keys are different lengths - return false without revealing why
    return {
      valid: false,
      error: 'Invalid API key format',
      method: 'api-key'
    }
  }
}

/**
 * Simple authenticator function for middleware usage
 */
const basicAuthenticator = validateRDCPAuth

module.exports = {
  validateRDCPAuth,
  basicAuthenticator,
  extractApiKey
}