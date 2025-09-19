/**
 * @fileoverview RDCP Authentication System Types
 * TypeScript interfaces for authentication adapters
 */

export interface RDCPAuthResult {
  valid: boolean
  method: string
  userId?: string | undefined
  clientId?: string | undefined
  tenantId?: string | undefined
  scopes?: string[] | undefined
  sessionId?: string | undefined
  expiresAt?: string | undefined
  error?: string | undefined
  metadata?: Record<string, unknown> | undefined
}

export interface AuthConfig {
  level: 'basic' | 'standard' | 'enterprise'
  apiKey?: string
  jwtSecret?: string
  requireTenantId?: boolean
  allowedScopes?: string[]
}

export interface AuthHeaders {
  'x-rdcp-auth-method'?: string
  'x-rdcp-client-id'?: string
  'x-rdcp-request-id'?: string
  'x-rdcp-tenant-id'?: string
  'x-api-key'?: string
  authorization?: string
}
