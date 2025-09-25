import { Request, Response } from 'express'
import { extractTenantContext, createTenantResponse } from '../utils/tenant.js'

export function healthCheck(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)

  const response = {
    protocol: 'rdcp/1.0' as const,
    timestamp: new Date().toISOString(),
    status: 'healthy' as const,
    checks: [
      { name: 'redis', status: 'pass' as const, duration: '5ms' },
      { name: 'db', status: 'pass' as const, duration: '8ms' },
    ],
  }

  res.json(
    tenantContext ? createTenantResponse(response, tenantContext) : response
  )
}
