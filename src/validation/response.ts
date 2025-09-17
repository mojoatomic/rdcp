/**
 * @fileoverview RDCP response format utilities
 * Simple functions to format RDCP responses correctly
 */

import { 
  RDCPResponse, 
  DebugCategory, 
  PerformanceMetric, 
  ControlChange,
  RDCPDiscoveryResponse 
} from '../utils/types.js'

/**
 * Basic response data that can be extended
 */
export interface BaseResponseData {
  [key: string]: unknown
}

/**
 * Creates standard RDCP response with protocol and timestamp
 */
export function createRDCPResponse<T extends BaseResponseData>(data: T): RDCPResponse & T {
  return {
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    ...data
  }
}

/**
 * Control response specific data
 */
export interface ControlResponseData {
  action: string
  categories: string[]
  status: 'success' | 'partial' | 'failed'
  changes: ControlChange[]
}

/**
 * Creates RDCP control response
 */
export function createControlResponse(
  action: string, 
  categories: string | string[], 
  status: 'success' | 'partial' | 'failed', 
  changes: ControlChange[] = []
): RDCPResponse & ControlResponseData {
  return createRDCPResponse({
    action,
    categories: Array.isArray(categories) ? categories : [categories],
    status,
    changes
  })
}

/**
 * Discovery response specific data
 */
export interface DiscoveryResponseData {
  categories: DebugCategory[]
  performance: {
    overhead: {
      cpu: PerformanceMetric
      memory: PerformanceMetric
    }
  }
}

/**
 * Creates RDCP discovery response
 */
export function createDiscoveryResponse(
  categories: DebugCategory[], 
  performance: DiscoveryResponseData['performance']
): RDCPResponse & DiscoveryResponseData {
  return createRDCPResponse({
    categories,
    performance
  })
}

/**
 * Status response specific data
 */
export interface StatusResponseData {
  enabled: boolean
  categories: Record<string, {
    enabled: boolean
    metrics: {
      callsLastMinute: number
      callsTotal: number
      lastActivity: string
    }
  }>
  performance?: {
    overhead: {
      cpu: PerformanceMetric
      memory: PerformanceMetric
    }
  }
}

/**
 * Creates RDCP status response
 */
export function createStatusResponse(
  enabled: boolean, 
  categories: StatusResponseData['categories'], 
  performance?: StatusResponseData['performance']
): RDCPResponse & StatusResponseData {
  return createRDCPResponse({
    enabled,
    categories,
    ...(performance && { performance })
  })
}

/**
 * Health response specific data
 */
export interface HealthResponseData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, 'operational' | 'degraded' | 'failed'>
}

/**
 * Creates RDCP health response
 */
export function createHealthResponse(
  status: 'healthy' | 'degraded' | 'unhealthy', 
  checks: Record<string, 'operational' | 'degraded' | 'failed'>
): RDCPResponse & HealthResponseData {
  return createRDCPResponse({
    status,
    checks
  })
}

/**
 * Protocol discovery endpoints configuration
 */
export interface EndpointsConfig {
  discovery: string
  control: string
  status: string
  health: string
  metrics?: string
  tenants?: string
  audit?: string
}

/**
 * Protocol discovery capabilities
 */
export interface CapabilitiesConfig {
  multiTenancy: boolean
  performanceMetrics: boolean
  temporaryControls: boolean
  auditTrail: boolean
}

/**
 * Protocol discovery security configuration
 */
export interface SecurityConfig {
  level: 'basic' | 'standard' | 'enterprise'
  methods: string[]
  scopes: string[]
  required: boolean
  keyRotation?: boolean
  tokenRefresh?: boolean
}

/**
 * Creates protocol discovery response
 */
export function createProtocolDiscoveryResponse(
  endpoints: EndpointsConfig, 
  capabilities: CapabilitiesConfig, 
  security: SecurityConfig
): RDCPDiscoveryResponse {
  return {
    protocol: 'rdcp/1.0',
    endpoints,
    capabilities,
    security
  }
}