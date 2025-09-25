// File: src/auth/basic.ts - Basic Level (API Key) from implementation guide
import * as crypto from 'crypto'
import type { Request } from 'express'
import { logger } from '../utils/logger.js'

// Read API key at runtime for testability (Context7 Jest pattern)
function getRDCPApiKey(): string {
  return process.env.RDCP_API_KEY ?? 'dev-key-change-in-production-min-32-chars'
}

export function extractApiKey(request: Request): string | undefined {
  const headers = request.headers
  const hasGet = (
    h: unknown
  ): h is { get: (name: string) => string | undefined } =>
    typeof (h as { get?: unknown }).get === 'function'

  let authHeader: string | undefined
  let apiKeyHeader: string | undefined

  if (hasGet(headers)) {
    authHeader = headers.get('authorization') ?? undefined
    apiKeyHeader = headers.get('x-api-key') ?? undefined
  } else {
    const h = headers as Record<string, string | string[] | undefined>
    const rawAuth = h['authorization']
    const rawKey = h['x-api-key']
    const authValue = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth
    const apiKeyValue = Array.isArray(rawKey) ? rawKey[0] : rawKey
    authHeader = authValue
    apiKeyHeader = apiKeyValue
  }

  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined
  return bearer ?? apiKeyHeader
}

import type { RDCPAuthResult } from './types.js'

export function validateRDCPAuth(request: Request): RDCPAuthResult {
  const providedKey = extractApiKey(request)

  // Basic security checks
  if (!providedKey) {
    return {
      valid: false,
      method: 'api-key',
      error: 'No API key provided',
    }
  }

  if (providedKey.length < 32) {
    return {
      valid: false,
      method: 'api-key',
      error: 'API key must be at least 32 characters',
    }
  }

  const RDCP_API_KEY = getRDCPApiKey()

  if (!RDCP_API_KEY || RDCP_API_KEY.length < 32) {
    logger.error('RDCP_API_KEY must be at least 32 characters for security')
    return {
      valid: false,
      method: 'api-key',
      error: 'Server configuration error',
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
      error: isValid ? undefined : 'Invalid API key',
    }
  } catch (_error) {
    // Keys are different lengths - return false without revealing why
    return {
      valid: false,
      method: 'api-key',
      error: 'Invalid API key',
    }
  }
}
