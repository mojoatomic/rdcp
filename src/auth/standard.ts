// File: src/auth/standard.ts - Standard Level (JWT Bearer Token) from implementation guide
import * as jwt from 'jsonwebtoken'
import type { Request } from 'express'
import type { RDCPAuthResult } from './types.js'

// Read JWT secret at runtime for testability (Context7 Jest pattern)
function getJWTSecret(): string {
  return process.env.JWT_SECRET || 'change-in-production'
}

export function validateRDCPAuth(request: Request): RDCPAuthResult {
  const authHeader = (
    request.headers as unknown as { get?: (name: string) => string }
  ).get
    ? (
        request.headers as unknown as {
          get: (name: string) => string | undefined
        }
      ).get('authorization')
    : request.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      method: 'bearer',
      error: 'Missing Bearer token',
    }
  }

  const token = authHeader.substring(7)

  try {
    const JWT_SECRET = getJWTSecret()
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload

    // Return standard auth context
    return {
      valid: true,
      method: 'bearer',
      userId: decoded.sub || decoded.email,
      tenantId: decoded.org_id || decoded.tenant,
      scopes: decoded.scopes || ['discovery', 'status'],
      sessionId: decoded.session_id,
      expiresAt: new Date((decoded.exp || 0) * 1000).toISOString(),
    }
  } catch (error) {
    return {
      valid: false,
      method: 'bearer',
      error: error instanceof Error ? error.message : 'Token validation failed',
    }
  }
}
