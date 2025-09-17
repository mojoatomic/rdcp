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
 * Validate RDCP authentication using API key
 * Returns boolean for simple usage
 */
function validateRDCPAuth(request) {
  const providedKey = extractApiKey(request)
  
  // Basic security checks
  if (!providedKey || providedKey.length < 32) {
    return false
  }
  
  if (!RDCP_API_KEY || RDCP_API_KEY.length < 32) {
    console.error('RDCP_API_KEY must be at least 32 characters for security')
    return false
  }
  
  try {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(RDCP_API_KEY),
      Buffer.from(providedKey)
    )
  } catch (error) {
    // Keys are different lengths - return false without revealing why
    return false
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