import { Request, Response } from 'express'
import { getDebugStatus, getPerformanceMetrics } from '../debug'
import { extractTenantContext, createTenantResponse, getTenantDebugConfig } from '../utils/tenant.js'

export function statusMonitoring(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)
  const status = tenantContext ? getTenantDebugConfig(tenantContext.tenantId) : getDebugStatus()
  const metrics = getPerformanceMetrics()
  const categories: Record<string, unknown> = {}
  
  Object.keys(status).forEach(key => {
    if (status[key as keyof typeof status]) {
      categories[key] = {
        enabled: true,
        metrics: {
          callsLastMinute: 0,
          callsTotal: metrics.categoryBreakdown[key] || 0,
          lastActivity: new Date().toISOString()
        }
      }
    }
  })
  
  const response = {
    protocol: 'rdcp/1.0' as const,
    timestamp: new Date().toISOString(),
    categories
  }
  
  res.json(tenantContext ? createTenantResponse(response, tenantContext) : response)
}
