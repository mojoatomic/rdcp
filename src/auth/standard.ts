// File: src/auth/standard.ts - Standard Level (JWT Bearer Token) from implementation guide
import * as jwt from 'jsonwebtoken'
import type { Request } from 'express'
import type { RDCPAuthResult } from './types.js'

// Read JWT secret at runtime for testability (Context7 Jest pattern)
function getJWTSecret(): string {
  return process.env.JWT_SECRET ?? 'change-in-production'
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

    // Context7: support issuer/audience constraints from env (comma-separated)
    const issuers = (process.env.JWT_ISSUER ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const audiences = (process.env.JWT_AUDIENCE ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Build audience option matching jsonwebtoken VerifyOptions typing
    let audienceOption: undefined | string | [string, ...string[]]
    if (audiences.length === 1) audienceOption = audiences[0]
    else if (audiences.length > 1)
      audienceOption = [audiences[0], ...audiences.slice(1)]

    // Build issuer option matching jsonwebtoken VerifyOptions typing
    let issuerOption: undefined | string | [string, ...string[]]
    if (issuers.length === 1) issuerOption = issuers[0]
    else if (issuers.length > 1)
      issuerOption = [issuers[0], ...issuers.slice(1)]

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['HS256'],
      ...(issuerOption ? { issuer: issuerOption } : {}),
      ...(audienceOption ? { audience: audienceOption } : {}),
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET,
      verifyOptions
    ) as jwt.JwtPayload

    // Return standard auth context
    return {
      valid: true,
      method: 'bearer',
      userId: (decoded.sub ?? decoded.email) as string | undefined,
      tenantId: (decoded.org_id ?? (decoded as { tenant?: string }).tenant) as
        | string
        | undefined,
      scopes: (decoded.scopes ?? ['discovery', 'status']) as string[],
      sessionId: decoded.session_id,
      expiresAt: new Date(((decoded.exp ?? 0) as number) * 1000).toISOString(),
    }
  } catch (error) {
    return {
      valid: false,
      method: 'bearer',
      error: error instanceof Error ? error.message : 'Token validation failed',
    }
  }
}
