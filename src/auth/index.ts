// File: src/auth/index.ts - Unified Auth Adapter from implementation guide
// Selects the appropriate auth validator based on RDCP_AUTH_LEVEL

import { validateRDCPAuth as validateApiKey } from './basic'
import { validateRDCPAuth as validateJwt } from './standard'
import { validateRDCPAuth as validateMtls } from './enterprise'
import { Request } from 'express'

const LEVEL = (process.env.RDCP_AUTH_LEVEL || 'basic').toLowerCase()

interface AuthResult {
  valid: boolean
  method: string
  userId?: string
  tenantId?: string
  scopes: string[]
  sessionId?: string
  expiresAt?: string
  error?: string
  metadata?: Record<string, unknown>
}

function normalize(result: boolean | AuthResult, method: string): AuthResult {
  if (result && typeof result === 'object' && 'valid' in result) {
    return result as AuthResult
  }
  return {
    valid: !!result,
    method,
    scopes: ['discovery', 'status', 'control', 'health']
  }
}

export function validateRDCPAuth(request: Request): AuthResult {
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