import express, { Request, Response, NextFunction, Router } from 'express'
import { debugSystemDiscovery } from './endpoints/discovery'
import { protocolDiscovery } from './endpoints/protocol-discovery'
import { runtimeControl } from './endpoints/control'
import { statusMonitoring } from './endpoints/status'
import { healthCheck } from './endpoints/health'
import { validateRDCPAuth } from './auth'
import { PROTOCOL_VERSION, RDCP_PATHS } from '@rdcp.dev/core'

interface RDCPOptions {
  requireAuth?: boolean
}

// RDCP authentication middleware using unified auth system
function rdcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = validateRDCPAuth(req)
  if (!auth.valid) {
    res.status(401).json({
      error: {
        code: 'RDCP_AUTH_FAILED',
        message: 'Authentication failed',
        protocol: PROTOCOL_VERSION,
      },
    })
    return
  }
  next()
}

export function createRDCPMiddleware(options: RDCPOptions = {}): Router {
  const router = express.Router()

  // 5 RDCP endpoints - conditionally apply auth middleware
  router.get(RDCP_PATHS.WELL_KNOWN_RDCP, protocolDiscovery)

  if (options.requireAuth) {
    router.get(RDCP_PATHS.DISCOVERY, rdcpAuthMiddleware, debugSystemDiscovery)
    router.post(RDCP_PATHS.CONTROL, rdcpAuthMiddleware, runtimeControl)
    router.get(RDCP_PATHS.STATUS, rdcpAuthMiddleware, statusMonitoring)
  } else {
    router.get(RDCP_PATHS.DISCOVERY, debugSystemDiscovery)
    router.post(RDCP_PATHS.CONTROL, runtimeControl)
    router.get(RDCP_PATHS.STATUS, statusMonitoring)
  }

  router.get(RDCP_PATHS.HEALTH, healthCheck)

  return router
}
