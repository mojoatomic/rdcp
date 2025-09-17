// File: src/auth/basic.ts - Basic Level (API Key) from implementation guide
import crypto from 'crypto'
import { Request } from 'express'

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
    return authHeader?.replace('Bearer ', '') || apiKeyHeader
  }
}

export function validateRDCPAuth(request: Request): boolean {
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