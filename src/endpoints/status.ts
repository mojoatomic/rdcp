import { Request, Response } from 'express'
import { getDebugStatus, getPerformanceMetrics } from '../debug'
import {
  extractTenantContext,
  createTenantResponse,
  getTenantDebugConfig,
} from '../utils/tenant.js'

export function statusMonitoring(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)
  const config = tenantContext
    ? getTenantDebugConfig(tenantContext.tenantId)
    : getDebugStatus()
  const perf = getPerformanceMetrics()

  const categories: Record<string, boolean> = {}
  Object.keys(config).forEach(key => {
    categories[key] = Boolean(config[key as keyof typeof config])
  })

  const enabled = Object.values(categories).some(Boolean)

  const response = {
    protocol: 'rdcp/1.0' as const,
    timestamp: new Date().toISOString(),
    enabled,
    categories,
    performance: {
      totalCalls: perf.totalCalls,
      callsPerSecond: perf.callsPerSecond,
    },
  }

  res.json(
    tenantContext ? createTenantResponse(response, tenantContext) : response
  )
}
