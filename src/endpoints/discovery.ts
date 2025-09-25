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
  const perf = getPerformanceMetrics()

  const categories = Object.keys(debugConfig).map(name => ({
    name,
    description: `Debug logging for ${name.toLowerCase().replace('_', ' ')}`,
    enabled: Boolean(debugConfig[name as keyof typeof debugConfig]),
    temporary: false,
    metrics: {
      callsTotal: perf.categoryBreakdown[name] || 0,
      callsPerSecond: perf.callsPerSecond || 0,
    },
  }))

  const response = {
    protocol: 'rdcp/1.0' as const,
    timestamp: new Date().toISOString(),
    categories,
    performance: {
      totalCalls: perf.totalCalls,
      callsPerSecond: perf.callsPerSecond,
      categoryBreakdown: { ...perf.categoryBreakdown },
    },
  }

  res.json(
    tenantContext ? createTenantResponse(response, tenantContext) : response
  )
}
