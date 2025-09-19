// Basic RDCP protocol types from spec
export interface RDCPBase {
  protocol: 'rdcp/1.0'
}

export interface RDCPError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    protocol: 'rdcp/1.0'
  }
}

export type SecurityLevel = 'basic' | 'standard' | 'enterprise'
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
export type ComponentStatus = 'operational' | 'degraded' | 'failed'
