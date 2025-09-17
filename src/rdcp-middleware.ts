import express, { Request, Response, NextFunction, Router } from 'express'
import { debugSystemDiscovery } from './endpoints/discovery'
import { protocolDiscovery } from './endpoints/protocol-discovery'
import { runtimeControl } from './endpoints/control'
import { statusMonitoring } from './endpoints/status'
import { healthCheck } from './endpoints/health'
import { validateRDCPAuth } from './auth'

interface RDCPOptions {
  requireAuth?: boolean
}

// RDCP authentication middleware using unified auth system
function rdcpAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = validateRDCPAuth(req)
  if (!auth.valid) {
    res.status(401).json({ error: { code: 'RDCP_AUTH_FAILED', message: 'Authentication failed', protocol: 'rdcp/1.0' }})
    return
  }
  next()
}

export function createRDCPMiddleware(options: RDCPOptions = {}): Router {
  const router = express.Router()
  
  // 5 RDCP endpoints - conditionally apply auth middleware
  router.get('/.well-known/rdcp', protocolDiscovery)
  
  if (options.requireAuth) {
    router.get('/rdcp/v1/discovery', rdcpAuthMiddleware, debugSystemDiscovery)
    router.post('/rdcp/v1/control', rdcpAuthMiddleware, runtimeControl)
    router.get('/rdcp/v1/status', rdcpAuthMiddleware, statusMonitoring)
  } else {
    router.get('/rdcp/v1/discovery', debugSystemDiscovery)
    router.post('/rdcp/v1/control', runtimeControl)
    router.get('/rdcp/v1/status', statusMonitoring)
  }
  
  router.get('/rdcp/v1/health', healthCheck)
  
  return router
}
