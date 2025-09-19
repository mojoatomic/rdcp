/**
 * @fileoverview Express adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Express-compatible middleware
 * following standard Express middleware signature (req, res, next)
 */

import { Request, Response, NextFunction, Router } from 'express'
import * as express from 'express'
import { RDCPServer } from '../index.js'
import { RDCPErrorClass, createRDCPError } from '../../validation/errors.js'
import { extractTenantContext, RDCPTenantContext } from '../../utils/tenant.js'
import { logger } from '../../utils/logger.js'

/**
 * RDCP Authenticator function interface
 * Must return boolean indicating if request is authenticated
 */
export type RDCPAuthenticator = (req: Request) => Promise<boolean> | boolean

/**
 * RDCP middleware configuration options
 */
export interface RDCPMiddlewareOptions {
  authenticator: RDCPAuthenticator
  debugConfig?: Record<string, boolean>
  basePath?: string
  performance?: Record<string, unknown>
  tenant?: Record<string, unknown>
}

/**
 * Enhanced Express request with tenant context
 */
interface RequestWithTenant extends Request {
  rdcpTenant?: RDCPTenantContext
}

/**
 * Creates RDCP middleware for Express applications
 * Uses standard Express middleware pattern with req, res, next parameters
 * Following Context7 Express middleware patterns
 */
export function createRDCPMiddleware(
  options: RDCPMiddlewareOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  if (!options) {
    throw new Error('authenticator function is required')
  }

  const {
    authenticator,
    debugConfig = {},
    basePath = '/rdcp/v1',
    performance = {},
    tenant = {},
  } = options

  if (!authenticator) {
    throw new Error('authenticator function is required')
  }
  if (typeof authenticator !== 'function') {
    throw new Error('authenticator must be a function')
  }

  // Initialize RDCP server utilities
  const rdcpServer = new RDCPServer({
    debugConfig,
    performance,
    tenant,
  })

  // Express middleware function - standard Context7 pattern
  return async function rdcpMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract path from Express request
      const pathname = req.path

      // Only handle RDCP endpoints
      if (
        !pathname.startsWith('/.well-known/rdcp') &&
        !pathname.startsWith(basePath)
      ) {
        return next() // Continue to next middleware
      }

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === '/.well-known/rdcp') {
        const discoveryResponse = rdcpServer.handleDiscovery({ basePath })
        res.json(discoveryResponse)
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await authenticator(req)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError(
            'RDCP_AUTH_REQUIRED',
            'Authentication required'
          )
          res.status(401).json(errorResponse)
          return
        }
      } catch (authError) {
        const errorMessage =
          authError instanceof Error
            ? authError.message
            : 'Authentication failed'
        const errorResponse = createRDCPError(
          'RDCP_AUTH_REQUIRED',
          `Authentication failed: ${errorMessage}`
        )
        res.status(401).json(errorResponse)
        return
      }

      // Extract tenant context from Express headers using utility
      const tenantContext = extractTenantContext(req as RequestWithTenant)
      ;(req as RequestWithTenant).rdcpTenant = tenantContext

      // Handle authenticated RDCP endpoints
      let response
      let statusCode = 200

      if (pathname === `${basePath}/discovery`) {
        response = rdcpServer.handleDiscovery({
          basePath,
          tenant: tenantContext,
        })
      } else if (pathname === `${basePath}/control`) {
        if (req.method !== 'POST') {
          response = createRDCPError(
            'RDCP_INVALID_ACTION',
            'POST method required'
          )
          statusCode = 405
        } else {
          const body = req.body || {}
          response = await rdcpServer.handleControl(body, tenantContext)
        }
      } else if (pathname === `${basePath}/status`) {
        response = rdcpServer.handleStatus(tenantContext)
      } else if (pathname === `${basePath}/health`) {
        response = rdcpServer.handleHealth()
      } else {
        response = createRDCPError('RDCP_NOT_FOUND', 'RDCP endpoint not found')
        statusCode = 404
      }

      res.status(statusCode).json(response)
    } catch (error) {
      logger.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'Internal server error'
      )
      res.status(500).json(errorResponse)
    }
  }
}

/**
 * Creates Express router with RDCP routes pre-configured
 * Alternative approach using Express Router for modular mounting
 * Following Context7 Express Router patterns
 */
export function createRDCPRouter(options: RDCPMiddlewareOptions): Router {
  const router = express.Router() as Router
  const middleware = createRDCPMiddleware(options)

  // Apply middleware to all routes
  router.use(middleware)

  return router
}

/**
 * Creates Express error handler middleware for RDCP errors
 * Should be used after RDCP middleware to catch any unhandled errors
 * Following Context7 Express error handler patterns (4 parameters)
 */
export function createRDCPErrorHandler(): (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return function rdcpErrorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Only handle RDCP-related errors
    if (!(error instanceof RDCPErrorClass)) {
      return next(error)
    }

    logger.error('RDCP error handler:', error)
    const errorResponse = createRDCPError(
      error.code || 'RDCP_SERVER_ERROR',
      error.message
    )
    res.status(error.statusCode || 500).json(errorResponse)
  }
}
