// File: src/auth/index.ts - Unified Auth Adapter from implementation guide
// Selects the appropriate auth validator based on RDCP_AUTH_LEVEL

import { validateRDCPAuth as validateApiKey } from './basic'
import { validateRDCPAuth as validateJwt } from './standard'
import { validateRDCPAuth as validateMtls } from './enterprise'
import { Request } from 'express'

const LEVEL = (process.env.RDCP_AUTH_LEVEL || 'basic').toLowerCase()

interface AuthResult {
  valid: boolean
  method?: string
  userId?: string
  tenantId?: string
  scopes?: string[]
  sessionId?: string
  expiresAt?: string
  error?: string
  metadata?: Record<string, unknown>
}

function normalize(result: boolean | AuthResult, method: string): AuthResult {
  if (result && typeof result === 'object' && 'valid' in result) {
    return {
      ...result,
      method: result.method || method,
      scopes: result.scopes || ['discovery', 'status', 'control', 'health']
    }
  }
  return {
    valid: !!result,
    method,
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

export function validateRDCPAuth(request: Request): AuthResult {
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
      return normalize(validateMtls(request), 'mtls')
    case 'standard':
    case 'bearer':
      return normalize(validateJwt(request), 'bearer')
    case 'basic':
    default:
      return normalize(validateApiKey(request), 'api-key')
  }
}
