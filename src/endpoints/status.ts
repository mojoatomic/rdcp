import { Request, Response } from 'express'
import { getDebugStatus, getPerformanceMetrics } from '../debug'

export function statusMonitoring(req: Request, res: Response): void {
  const status = getDebugStatus()
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
  
  res.json({
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    categories
  })
}