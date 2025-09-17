import { Request, Response } from 'express'
import { extractTenantContext, createTenantResponse } from '../utils/tenant.js'

export function healthCheck(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)
  
  const response = {
    protocol: 'rdcp/1.0' as const,
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    components: {
      debugSystem: 'operational' as const,
      persistence: 'operational' as const
    }
  }
  
  res.json(tenantContext ? createTenantResponse(response, tenantContext) : response)
}
