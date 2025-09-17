// File: src/auth/standard.ts - Standard Level (JWT Bearer Token) from implementation guide
import jwt from 'jsonwebtoken'
import { Request } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'change-in-production'

interface AuthResult {
  valid: boolean
  method?: string
  userId?: string
  tenantId?: string
  scopes?: string[]
  sessionId?: string
  expiresAt?: string
  error?: string
}

export function validateRDCPAuth(request: Request): AuthResult {
  const authHeader = (request.headers as unknown as { get?: (name: string) => string }).get 
    ? (request.headers as unknown as { get: (name: string) => string | undefined }).get('authorization')
    : request.headers['authorization']
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing Bearer token'
    }
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    
    // Return standard auth context
    return {
      valid: true,
      method: 'bearer',
      userId: decoded.sub || decoded.email,
      tenantId: decoded.org_id || decoded.tenant,
      scopes: decoded.scopes || ['discovery', 'status'],
      sessionId: decoded.session_id,
      expiresAt: new Date((decoded.exp || 0) * 1000).toISOString()
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed'
    }
  }
}