import { Request, Response } from 'express'
import { DEBUG_CONFIG, getPerformanceMetrics } from '../debug'

export function protocolDiscovery(req: Request, res: Response): void {
  res.json({
    protocol: 'rdcp/1.0',
    endpoints: {
      discovery: '/rdcp/v1/discovery',
      control: '/rdcp/v1/control',
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health'
    },
    capabilities: {
      multiTenancy: false,
      performanceMetrics: true,
      temporaryControls: false,
      auditTrail: false
    },
    security: {
      level: 'basic',
      methods: ['api-key'],
      scopes: ['discovery', 'status', 'control'],
      required: true
    }
  })
}

export function debugSystemDiscovery(req: Request, res: Response): void {
  const metrics = getPerformanceMetrics()
  
  const categories = Object.keys(DEBUG_CONFIG).map(id => ({
    id,
    enabled: DEBUG_CONFIG[id as keyof typeof DEBUG_CONFIG],
    description: `Debug logging for ${id.toLowerCase().replace('_', ' ')}`,
    tags: ['infrastructure'],
    metrics: {
      callsTotal: metrics.categoryBreakdown[id] || 0,
      callsPerSecond: metrics.callsPerSecond || 0
    }
  }))
  
  res.json({
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    categories,
    performance: {
      overhead: {
        cpu: { value: 0.1, unit: 'percent', measured: false },
        memory: { value: 1048576, unit: 'bytes', measured: false }
      }
    }
  })
}
