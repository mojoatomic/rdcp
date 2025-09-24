import type { Request, Response } from 'express'
import { DEBUG_CONFIG, getPerformanceMetrics } from '../debug'
import {
  extractTenantContext,
  createTenantResponse,
  getTenantDebugConfig,
} from '../utils/tenant.js'
import { PROTOCOL_VERSION, RDCP_PATHS } from '@rdcp.dev/core'

export function protocolDiscovery(req: Request, res: Response): void {
  res.json({
    protocol: PROTOCOL_VERSION,
    endpoints: {
      discovery: RDCP_PATHS.DISCOVERY,
      control: RDCP_PATHS.CONTROL,
      status: RDCP_PATHS.STATUS,
      health: RDCP_PATHS.HEALTH,
    },
    capabilities: {
      multiTenancy: true,
      performanceMetrics: true,
      temporaryControls: false,
      auditTrail: false,
    },
    security: {
      level: 'basic',
      methods: ['api-key'],
      scopes: ['discovery', 'status', 'control'],
      required: true,
    },
  })
}

export function debugSystemDiscovery(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)
  const debugConfig = tenantContext
    ? getTenantDebugConfig(tenantContext.tenantId)
    : DEBUG_CONFIG
  const metrics = getPerformanceMetrics()

  const categories = Object.keys(debugConfig).map(id => ({
    id,
    enabled: debugConfig[id as keyof typeof debugConfig],
    description: `Debug logging for ${id.toLowerCase().replace('_', ' ')}`,
    tags: ['infrastructure'],
    metrics: {
      callsTotal: metrics.categoryBreakdown[id] || 0,
      callsPerSecond: metrics.callsPerSecond || 0,
    },
  }))

  const response = {
    protocol: 'rdcp/1.0' as const,
    timestamp: new Date().toISOString(),
    categories,
    performance: {
      overhead: {
        cpu: { value: 0.1, unit: 'percent', measured: false },
        memory: { value: 1048576, unit: 'bytes', measured: false },
      },
    },
  }

  res.json(
    tenantContext ? createTenantResponse(response, tenantContext) : response
  )
}
