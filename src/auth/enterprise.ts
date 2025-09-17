// File: src/auth/enterprise.ts - Enterprise Level (mTLS) from implementation guide
import { X509Certificate } from 'crypto'
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
  error?: string
  metadata?: Record<string, unknown>
}

function extractTenantFromCN(cn?: string): string {
  // Example: CN=client.tenant123.example.com
  const match = cn?.match(/\.([^.]+)\.example\.com$/)
  return match?.[1] || 'default'
}

export function validateRDCPAuth(request: Request): AuthResult {
  // Extract client certificate from request
  const hasGetMethod = typeof (request.headers as unknown as { get?: (name: string) => string }).get === 'function'
  
  const certHeader = hasGetMethod
    ? (request.headers as unknown as { get: (name: string) => string | undefined }).get('x-client-cert')
    : (Array.isArray(request.headers['x-client-cert']) 
       ? request.headers['x-client-cert'][0] 
       : request.headers['x-client-cert'])
  
  if (!certHeader) {
    return {
      valid: false,
      error: 'Client certificate required'
    }
  }
  
  try {
    // Validate certificate
    const cert = new X509Certificate(Buffer.from(certHeader as string, 'base64'))
    
    // Check certificate validity
    const now = new Date()
    const validFrom = new Date(cert.validFrom)
    const validTo = new Date(cert.validTo)
    
    if (now < validFrom || now > validTo) {
      return {
        valid: false,
        error: 'Certificate expired or not yet valid'
      }
    }
    
    // Extract identity from certificate
    const subject = cert.subject
    const cn = subject.match(/CN=([^,]+)/)?.[1]
    
    // Also check for JWT token for additional context
    const authHeader = hasGetMethod
      ? (request.headers as unknown as { get: (name: string) => string | undefined }).get('authorization')
      : (Array.isArray(request.headers['authorization']) 
         ? request.headers['authorization'][0] 
         : request.headers['authorization'])
    let tokenContext = {}
    
    if (authHeader?.startsWith('Bearer ')) {
      // Hybrid mode: mTLS + JWT
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
        tokenContext = {
          userId: decoded.sub,
          scopes: decoded.scopes
        }
      } catch {
        // JWT validation failed, continue with cert-only auth
      }
    }
    
    return {
      valid: true,
      method: 'mtls',
      userId: (tokenContext as { userId?: string }).userId || cn,
      tenantId: extractTenantFromCN(cn),
      scopes: (tokenContext as { scopes?: string[] }).scopes || ['admin'],
      sessionId: cert.fingerprint,
      metadata: {
        certSubject: cert.subject,
        certIssuer: cert.issuer,
        certFingerprint: cert.fingerprint
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Certificate validation failed'
    }
  }
}