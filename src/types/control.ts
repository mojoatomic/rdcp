import { RDCPBase } from './base'

export interface ControlRequest {
  action: 'enable' | 'disable' | 'toggle' | 'reset'
  categories: string[] | string
  options?: {
    temporary?: boolean
    duration?: number
    reason?: string
  }
}

export interface ControlChange {
  category: string
  previousState: boolean
  newState: boolean
  effectiveAt: string
  expiresAt?: string
}

export interface AuthContext {
  method: string
  userId: string
  scopes: string[]
  sessionId: string
}

export interface ControlResponse extends RDCPBase {
  requestId: string
  success: boolean
  authContext?: AuthContext
  changes: ControlChange[]
  audit?: {
    timestamp: string
    action: string
    operator: string
    method: string
    clientId?: string
    reason?: string
    complianceMetadata?: Record<string, unknown>
  }
}