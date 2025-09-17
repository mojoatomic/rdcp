// File: src/auth/basic.ts - Basic Level (API Key) from implementation guide
import * as crypto from 'crypto'
import type { Request } from 'express'

const RDCP_API_KEY = process.env.RDCP_API_KEY || 'dev-key-change-in-production-min-32-chars'

function extractApiKey(request: Request): string | undefined {
  // Framework detection - Next.js has headers.get(), Express has headers[]
  if (typeof (request.headers as unknown as { get?: (name: string) => string }).get === 'function') {
    // Next.js Request object
    const headers = request.headers as unknown as { get: (name: string) => string | undefined }
    const authHeader = headers.get('authorization')
    const apiKeyHeader = headers.get('x-api-key')
    return authHeader?.replace('Bearer ', '') || apiKeyHeader
  } else {
    // Express/Node.js request object
    const authHeader = request.headers['authorization']
    const apiKeyHeader = request.headers['x-api-key']
    
    // Handle potential string array from Express headers
    const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader
    const apiKeyValue = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
    
    return authValue?.replace('Bearer ', '') || apiKeyValue
  }
}

import type { RDCPAuthResult } from './types.js'

export function validateRDCPAuth(request: Request): RDCPAuthResult {
  const providedKey = extractApiKey(request)
  
  // Basic security checks
  if (!providedKey) {
    return {
      valid: false,
      method: 'api-key',
      error: 'No API key provided'
    }
  }
  
  if (providedKey.length < 32) {
    return {
      valid: false,
      method: 'api-key', 
      error: 'API key must be at least 32 characters'
    }
  }
  
  if (!RDCP_API_KEY || RDCP_API_KEY.length < 32) {
    console.error('RDCP_API_KEY must be at least 32 characters for security')
    return {
      valid: false,
      method: 'api-key',
      error: 'Server configuration error'
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
      error: isValid ? undefined : 'Invalid API key'
    }
  } catch (error) {
    // Keys are different lengths - return false without revealing why
    return {
      valid: false,
      method: 'api-key',
      error: 'Invalid API key'
    }
  }
}
