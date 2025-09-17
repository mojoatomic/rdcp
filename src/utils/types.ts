// RDCP Protocol Types - Strict compliance with RDCP v1.0 specification
// NO deviations allowed - these types enforce protocol compliance

export interface RDCPResponse {
  protocol: 'rdcp/1.0'
  timestamp?: string
}

export interface RDCPError {
  error: {
    code: string
    message: string
    protocol: 'rdcp/1.0'
    details?: Record<string, unknown>
  }
}

// Protocol Discovery Response (/.well-known/rdcp)
export interface RDCPDiscoveryResponse extends RDCPResponse {
  endpoints: {
    discovery: string
    control: string
    status: string
    health: string
    metrics?: string
    tenants?: string
    audit?: string
  }
  capabilities: {
    multiTenancy: boolean
    performanceMetrics: boolean
    temporaryControls: boolean
    auditTrail: boolean
  }
  security: {
    level: 'basic' | 'standard' | 'enterprise'
    methods: string[]
    scopes: string[]
    required: boolean
    keyRotation?: boolean
    tokenRefresh?: boolean
  }
}

// Debug System Discovery Response
export interface DebugCategory {
  id: string
  enabled: boolean
  description: string
  tags?: string[]
  metrics?: {
    callsTotal: number
    callsPerSecond: number
  }
}

export interface PerformanceMetric {
  value: number
  unit: string
  measured: boolean
  timestamp?: string
}

export interface DebugDiscoveryResponse extends RDCPResponse {
  categories: DebugCategory[]
  performance: {
    overhead: {
      cpu: PerformanceMetric
      memory: PerformanceMetric
    }
  }
  tenant?: TenantContext
}

// Control Request and Response
export interface ControlRequest {
  action: 'enable' | 'disable' | 'toggle' | 'reset'
  categories: string[] | string
  options?: {
    temporary?: boolean
    duration?: number
    reason?: string
  }
  requestId?: string
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
  userId?: string
  scopes: string[]
  sessionId?: string
  tenantId?: string
}

export interface ControlResponse extends RDCPResponse {
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

// Status Response
export interface CategoryStatus {
  enabled: boolean
  metrics: {
    callsLastMinute: number
    callsTotal: number
    lastActivity: string
  }
}

export interface StatusResponse extends RDCPResponse {
  categories: Record<string, CategoryStatus>
  tenant?: TenantContext
}

// Health Response  
export interface HealthResponse extends RDCPResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: {
    debugSystem: 'operational' | 'degraded' | 'failed'
    persistence: 'operational' | 'degraded' | 'failed'
  }
}

// Multi-tenancy Support
export interface TenantContext {
  id: string
  isolationLevel: 'global' | 'process' | 'namespace' | 'organization'
  scope: 'global' | 'tenant-isolated'
  name?: string
}

// Authentication Types
export interface AuthConfig {
  level: 'basic' | 'standard' | 'enterprise'
  apiKey?: string
  bearerToken?: string
  clientCert?: {
    cert: string
    key: string
  }
}

export interface AuthHeaders {
  [key: string]: string
}

// Client Configuration
export interface RDCPClientConfig {
  baseUrl: string
  auth: AuthConfig
  tenant?: {
    id: string
    isolationLevel?: 'global' | 'process' | 'namespace' | 'organization'
    name?: string
  }
  timeout?: number
  retries?: number
}

// Standard RDCP Error Codes
export const RDCP_ERROR_CODES = {
  AUTH_REQUIRED: 'RDCP_AUTH_REQUIRED',
  FORBIDDEN: 'RDCP_FORBIDDEN', 
  NOT_FOUND: 'RDCP_NOT_FOUND',
  VALIDATION_ERROR: 'RDCP_VALIDATION_ERROR',
  CATEGORY_NOT_FOUND: 'RDCP_CATEGORY_NOT_FOUND',
  RATE_LIMITED: 'RDCP_RATE_LIMITED',
  INTERNAL_ERROR: 'RDCP_INTERNAL_ERROR',
} as const