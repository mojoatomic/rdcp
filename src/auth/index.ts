// File: src/auth/index.ts - Unified Auth Adapter from implementation guide
// Selects the appropriate auth validator based on RDCP_AUTH_LEVEL

import { validateRDCPAuth as validateApiKey } from './basic.js'
import { validateRDCPAuth as validateJwt } from './standard.js'
import { validateRDCPAuth as validateMtls } from './enterprise.js'
import { Request } from 'express'
import type { RDCPAuthResult } from './types.js'

const LEVEL = (process.env.RDCP_AUTH_LEVEL || 'basic').toLowerCase()

// Use RDCPAuthResult from types.js
// interface moved to types.js for better organization

function normalize(result: boolean | RDCPAuthResult, method: string, request: Request): RDCPAuthResult {
  if (result && typeof result === 'object' && 'valid' in result) {
    return {
      ...result,
      method: result.method || method,
      clientId: result.clientId || (request.headers['x-rdcp-client-id'] as string),
      scopes: result.scopes || ['discovery', 'status', 'control', 'health']
    }
  }
  return {
    valid: !!result,
    method,
    clientId: request.headers['x-rdcp-client-id'] as string,
    scopes: ['discovery', 'status', 'control', 'health']
  }
}

function validateRDCPHeaders(request: Request): { valid: boolean; error?: string } {
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
  if (!validMethods.includes(authMethod as string)) {
    return { valid: false, error: `Invalid X-RDCP-Auth-Method: ${authMethod}. Must be one of: ${validMethods.join(', ')}` }
  }
  
  return { valid: true }
}

// Extract API key utility function (for compatibility)
export function extractApiKey(request: Request): string | undefined {
  const authHeader = request.headers['authorization']
  const apiKeyHeader = request.headers['x-api-key']
  
  // Handle potential string array from Express headers
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const apiKeyValue = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
  
  return authValue?.replace('Bearer ', '') || apiKeyValue
}

// Basic authenticator alias (for compatibility)
export const basicAuthenticator = validateRDCPAuth

export function validateRDCPAuth(request: Request): RDCPAuthResult {
  // First validate RDCP required headers
  const headerValidation = validateRDCPHeaders(request)
  if (!headerValidation.valid) {
    return {
      valid: false,
      error: headerValidation.error,
      method: 'unknown'
    }
  }
  
  // Then validate auth method
  switch (LEVEL) {
    case 'enterprise':
      return normalize(validateMtls(request), 'mtls', request)
    case 'standard':
    case 'bearer':
      return normalize(validateJwt(request), 'bearer', request)
    case 'basic':
    default:
      return normalize(validateApiKey(request), 'api-key', request)
  }
}
