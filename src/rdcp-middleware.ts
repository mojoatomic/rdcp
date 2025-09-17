import express, { Request, Response, NextFunction, Router } from 'express'
import { protocolDiscovery, debugSystemDiscovery } from './endpoints/discovery'
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
    return res.status(401).json({ error: { code: 'RDCP_AUTH_FAILED', message: 'Authentication failed', protocol: 'rdcp/1.0' }})
  }
  next()
}

export function createRDCPMiddleware(options: RDCPOptions = {}): Router {
  const router = express.Router()
  const auth = options.requireAuth ? rdcpAuthMiddleware : null
  
  // 5 RDCP endpoints
  router.get('/.well-known/rdcp', protocolDiscovery)
  router.get('/rdcp/v1/discovery', auth, debugSystemDiscovery)
  router.post('/rdcp/v1/control', auth, runtimeControl)
  router.get('/rdcp/v1/status', auth, statusMonitoring)
  router.get('/rdcp/v1/health', healthCheck)
  
  return router
}
