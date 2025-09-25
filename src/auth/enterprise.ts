// File: src/auth/enterprise.ts - Enterprise Level (mTLS) Authentication
// RDCP v1.0 compliant enterprise authentication using certificate-validator.js

import * as jwt from 'jsonwebtoken'
import { Request } from 'express'
import type { RDCPAuthResult } from './types.js'
import {
  verifyCertificateChain,
  parseCertificateFromHeader,
  extractTenantFromCN,
} from './certificate-validator.js'
import { logger } from '../utils/logger.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-in-production'

/**
 * RDCP Enterprise mTLS + JWT hybrid authentication
 * Uses certificate-validator.js for comprehensive security validation
 */
export function validateRDCPAuth(request: Request): RDCPAuthResult {
  // Extract client certificate from request headers
  const certHeader = request.headers['x-client-cert'] as string

  if (!certHeader) {
    return {
      valid: false,
      method: 'mtls',
      error: 'Client certificate required for enterprise authentication',
    }
  }

  // Parse certificate from header
  const parseResult = parseCertificateFromHeader(certHeader)
  if (parseResult.error) {
    return {
      valid: false,
      method: 'mtls',
      error: parseResult.error ?? 'Certificate parsing failed',
    }
  }
  if (!parseResult.cert) {
    return {
      valid: false,
      method: 'mtls',
      error: 'Certificate parsing failed',
    }
  }

  // Validate certificate using comprehensive validator
  const certValidation = verifyCertificateChain(parseResult.cert)
  if (!certValidation.valid) {
    return {
      valid: false,
      method: 'mtls',
      error: certValidation.error ?? 'Certificate validation failed',
    }
  }

  // Extract common name from certificate subject
  const cnMatch = parseResult.cert.subject.match(/CN=([^,]+)/)
  const commonName = cnMatch?.[1] ?? null
  const tenantId = extractTenantFromCN(commonName ?? undefined)

  // Process optional JWT token for hybrid authentication
  let scopes = ['admin'] // Default enterprise scopes
  const authHeader = request.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: '1h',
      }) as jwt.JwtPayload

      // Ensure JWT subject matches certificate CN
      if (decoded.sub && decoded.sub !== commonName) {
        return {
          valid: false,
          method: 'mtls',
          error: 'JWT subject does not match certificate identity',
        }
      }

      if (Array.isArray(decoded.scopes)) {
        scopes = decoded.scopes
      }
    } catch (_jwtError) {
      // Continue with cert-only auth if JWT fails; downgrade to debug in production unless explicitly enabled
      const shouldWarn =
        process.env.NODE_ENV === 'development' ||
        process.env.RDCP_WARN_ON_HYBRID_FALLBACK === 'true'
      if (shouldWarn) {
        logger.warn('JWT validation failed, continuing with cert-only auth', {
          route: request.path,
          method: request.method,
          clientId: request.headers['x-rdcp-client-id'] as string | undefined,
        })
      } else {
        logger.debug('Hybrid auth: JWT invalid, using certificate only')
      }
    }
  }

  // SUCCESS: Return validated authentication result
  return {
    valid: true,
    method: 'mtls',
    userId: commonName ?? 'unknown',
    tenantId,
    scopes,
    sessionId: parseResult.cert.fingerprint256,
    metadata: {
      certSubject: parseResult.cert.subject,
      certFingerprint256: parseResult.cert.fingerprint256,
    },
  }
}
