/**
 * @fileoverview RDCP Validation System Types
 * TypeScript interfaces for validation schemas and results
 */

export interface ControlRequestBody {
  action: 'enable' | 'disable' | 'toggle' | 'status'
  categories: string[] | string
  duration?: number
  tenantId?: string
  metadata?: Record<string, unknown>
}

export interface ValidationResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    issues: Array<{
      path: (string | number)[]
      message: string
      code: string
    }>
  }
}

export interface RDCPErrorResponse {
  error: {
    code: string
    message: string
    protocol: 'rdcp/1.0'
    timestamp?: string
    details?: Record<string, unknown>
  }
}

export interface RDCPResponse {
  protocol: 'rdcp/1.0'
  timestamp: string
  [key: string]: unknown
}