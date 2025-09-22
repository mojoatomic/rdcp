/**
 * @fileoverview Express adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Express-compatible middleware
 * following standard Express middleware signature (req, res, next)
 */

import { Request, Response, NextFunction, Router } from 'express'
import * as express from 'express'
import { RDCPServer } from '../index.js'
import {
  RDCPErrorClass,
  createRDCPError,
  ERROR_STATUS_MAP,
} from '../../validation/errors.js'
import { extractTenantContext, RDCPTenantContext } from '../../utils/tenant.js'
import { logger } from '../../utils/logger.js'
import { createKeyring } from '../keyring.js'

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
  capabilities?: {
    temporaryControls?: boolean
    ttl?: {
      enabled?: boolean
      minDurationMs?: number
      maxDurationMs?: number
      maxActiveTTLs?: number
    }
    rateLimit?: {
      enabled?: boolean
      headers?: boolean
      headersMode?: 'x' | 'draft-7'
      defaultRule?: { windowMs?: number; maxRequests?: number }
      perEndpoint?: Record<string, { windowMs?: number; maxRequests?: number }>
      perTenant?: Record<string, { windowMs?: number; maxRequests?: number }>
    }
    metrics?: {
      enabled?: boolean
      endpointPath?: string
    }
    audit?: {
      enabled?: boolean
      sink?: 'console' | 'file' | 'none'
      file?: { path?: string; maxBytes?: number; maxFiles?: number }
      sampleRate?: number
    }
    security?: {
      tokenLifecycle?: {
        enabled?: boolean
        graceWindowMs?: number
      }
    }
  }
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

  // Rate limit header capture per-request
  const rateEvents = new Map<
    string,
    {
      allowed: boolean
      remaining: number
      resetMs: number
      limit: number
    }
  >()

  // Initialize RDCP server utilities
  const rdcpServer = new RDCPServer({
    debugConfig,
    performance,
    tenant,
    onRateLimit: (e): void => {
      if (options.capabilities?.rateLimit?.headers) {
        // store by requestId if available, otherwise key by endpoint+tenant
        const key = e.requestId ?? `${e.endpoint}:${e.tenantId ?? 'global'}`
        rateEvents.set(key, {
          allowed: e.allowed,
          remaining: e.remaining,
          resetMs: e.resetMs,
          limit: e.limit,
        })
      }
    },
    capabilities: options.capabilities ?? {},
  })

  // Optional keyring for token lifecycle (JWT only for now)
  const keyring = options.capabilities?.security?.tokenLifecycle?.enabled
    ? createKeyring({
        jwt: {
          active: [
            {
              kid: 'env-hs256',
              alg: 'HS256',
              secret: process.env.JWT_SECRET ?? 'change-in-production',
            },
          ],
          previous: [],
          graceWindowMs:
            options.capabilities?.security?.tokenLifecycle?.graceWindowMs ??
            7 * 24 * 60 * 60 * 1000,
        },
        api: { active: [], previous: [], graceWindowMs: 30 * 24 * 60 * 60 * 1000 },
      })
    : undefined

  // Wrap authenticator to prefer keyring for bearer JWT when enabled
  const wrappedAuthenticator = async (request: Request): Promise<boolean> => {
    if (!keyring) return !!(await Promise.resolve(authenticator(request)))
    const method = (request.headers['x-rdcp-auth-method'] as string) || ''
    if (method === 'bearer') {
      const authHeader = request.headers['authorization'] as string | undefined
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const issuers = (process.env.JWT_ISSUER ?? '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        const audiences = (process.env.JWT_AUDIENCE ?? '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        let audienceOption: undefined | string | [string, ...string[]]
        if (audiences.length === 1) audienceOption = audiences[0]
        else if (audiences.length > 1)
          audienceOption = [audiences[0], ...audiences.slice(1)]
        let issuerOption: undefined | string | [string, ...string[]]
        if (issuers.length === 1) issuerOption = issuers[0]
        else if (issuers.length > 1)
          issuerOption = [issuers[0], ...issuers.slice(1)]
        const result = await keyring.verifyJwt(token, {
          algorithms: ['HS256'],
          audience: audienceOption,
          issuer: issuerOption,
        })
        if (result.ok) return true
      }
    }
    return !!(await Promise.resolve(authenticator(request)))
  }

  // Express middleware function - standard Context7 pattern
  return async function rdcpMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let reqId = ''
    try {
      // Extract path from Express request
      const pathname = req.path

      // Only handle RDCP endpoints
      const metricsPath =
        options.capabilities?.metrics?.endpointPath ?? '/metrics'
      const isMetrics =
        options.capabilities?.metrics?.enabled === true &&
        pathname === metricsPath
      if (
        !pathname.startsWith('/.well-known/rdcp') &&
        !pathname.startsWith(basePath) &&
        !isMetrics
      ) {
        return next() // Continue to next middleware
      }

      // Prometheus metrics endpoint (no auth)
      if (isMetrics) {
        const text = rdcpServer.getPrometheusMetrics()
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        res.send(text)
        return
      }

      // Validate optional X-RDCP-Request-ID header (must be a UUID)
      const reqIdHeader = req.headers['x-rdcp-request-id'] as string | undefined
      if (reqIdHeader) {
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRe.test(reqIdHeader)) {
          const errorResponse = createRDCPError(
            'RDCP_REQUEST_ID_INVALID',
            'Invalid X-RDCP-Request-ID format',
            {
              expected: 'uuid',
              received: reqIdHeader,
            }
          )
          const status = (ERROR_STATUS_MAP as Record<string, number>)[
            'RDCP_REQUEST_ID_INVALID'
          ]
          res.status(status).json(errorResponse)
          return
        }
      }

      // Generate request ID for rate limit tracking
      reqId =
        reqIdHeader ??
        `req-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === '/.well-known/rdcp') {
        const discoveryResponse = rdcpServer.handleDiscovery({
          basePath,
          requestId: reqId,
        })
        // Set rate limit headers if configured
        const ev = rateEvents.get(reqId)
        if (ev && options.capabilities?.rateLimit?.headers) {
          if (options.capabilities.rateLimit.headersMode === 'draft-7') {
            res.set(
              'RateLimit',
              `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
                ev.resetMs / 1000
              )}`
            )
            res.set(
              'RateLimit-Policy',
              `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
            )
            if (!ev.allowed)
              res.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          } else {
            res.set('X-RateLimit-Limit', String(ev.limit))
            res.set('X-RateLimit-Remaining', String(ev.remaining))
            res.set(
              'X-RateLimit-Reset',
              String(Math.ceil((Date.now() + ev.resetMs) / 1000))
            )
            if (!ev.allowed)
              res.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          }
        }
        res.set('X-Request-Id', reqId)
        res.json(discoveryResponse)
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await wrappedAuthenticator(req)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError(
            'RDCP_AUTH_REQUIRED',
            'Authentication required'
          )
          res.set('X-Request-Id', reqId)
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
        res.set('X-Request-Id', reqId)
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
          requestId: reqId,
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
          const meta: {
            requestId: string
            authMethod?: string
            clientId?: string
            ip?: string
          } = { requestId: reqId }
          const am = req.headers['x-rdcp-auth-method'] as string | undefined
          const cid = req.headers['x-rdcp-client-id'] as string | undefined
          if (am) meta.authMethod = am
          if (cid) meta.clientId = cid
          if (req.ip) meta.ip = req.ip
          response = await rdcpServer.handleControl(body, tenantContext, meta)
        }
      } else if (pathname === `${basePath}/status`) {
        response = rdcpServer.handleStatus(tenantContext, { requestId: reqId })
      } else if (pathname === `${basePath}/health`) {
        response = rdcpServer.handleHealth({ requestId: reqId })
      } else {
        response = createRDCPError('RDCP_NOT_FOUND', 'RDCP endpoint not found')
        statusCode = 404
      }

      // Map error code to HTTP status if present
      const code = (response as { error?: { code?: string } })?.error?.code
      if (code && typeof code === 'string') {
        const mapped = (ERROR_STATUS_MAP as Record<string, number>)[code]
        if (typeof mapped === 'number') {
          statusCode = mapped
        } else if (code.startsWith('RDCP_')) {
          statusCode = 400
        }
      }
      // Rate limit headers
      const ev = rateEvents.get(reqId)
      if (ev && options.capabilities?.rateLimit?.headers) {
        if (options.capabilities.rateLimit.headersMode === 'draft-7') {
          res.set(
            'RateLimit',
            `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
              ev.resetMs / 1000
            )}`
          )
          res.set(
            'RateLimit-Policy',
            `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
          )
          if (!ev.allowed)
            res.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        } else {
          res.set('X-RateLimit-Limit', String(ev.limit))
          res.set('X-RateLimit-Remaining', String(ev.remaining))
          res.set(
            'X-RateLimit-Reset',
            String(Math.ceil((Date.now() + ev.resetMs) / 1000))
          )
          if (!ev.allowed)
            res.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        }
      }
      // Emit warnings
      const respWarn = response as { __rdcpWarnings?: string[] }
      const warnings = respWarn.__rdcpWarnings
      if (warnings?.includes('audit-write-failed')) {
        res.set('Warning', '199 rdcp "audit-write-failed"')
      }
      res.set('X-Request-Id', reqId)
      res.status(statusCode).json(response)
    } catch (error) {
      logger.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'Internal server error'
      )
      if (reqId) res.set('X-Request-Id', reqId)
      res.status(500).json(errorResponse)
    } finally {
      if (reqId) rateEvents.delete(reqId)
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
