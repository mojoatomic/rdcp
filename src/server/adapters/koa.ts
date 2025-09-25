/**
 * @fileoverview Koa adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Koa-compatible middleware
 * following async/await patterns and Koa context conventions
 *
 * Context7 Compliance:
 * - Uses async/await middleware pattern with (ctx, next) signature
 * - Extends context interfaces properly for TypeScript safety
 * - Follows Koa body parsing patterns with middleware extensions
 * - Implements proper error boundaries and context state management
 *
 * @example
 * ```typescript
 * import Koa from 'koa'
 * import bodyParser from 'koa-bodyparser'
 * import { createRDCPMiddleware } from '@rdcp/server/adapters/koa'
 *
 * const app = new Koa()
 *
 * // Required: Add body parser middleware before RDCP middleware
 * app.use(bodyParser())
 *
 * // Add RDCP middleware with authentication
 * app.use(createRDCPMiddleware({
 *   authenticator: async (ctx) => {
 *     const apiKey = ctx.headers['x-api-key']
 *     return apiKey === 'valid-key'
 *   }
 * }))
 *
 * app.listen(3000)
 * ```
 */

import { Context, Next } from 'koa'
import { RDCPServer } from '../index.js'
import { createRDCPError, ERROR_STATUS_MAP } from '../../validation/errors.js'
import { RDCPTenantContext } from '../../utils/tenant.js'
import { logger } from '../../utils/logger.js'
import { createKeyring } from '../keyring.js'
import { prepareJWKSResponse, etagMatches } from '../../utils/etag.js'
import { RDCP_PATHS } from '@rdcp.dev/core'

/**
 * Extended Koa Request interface for body parsing
 * Following Context7 patterns - body parser middleware adds body property
 */
interface KoaRequestWithBody {
  body?: unknown
}

/**
 * Extended Koa Context interface with request body support
 * Following Context7 patterns for context extension
 */
interface KoaContextWithBody extends Context {
  request: Context['request'] & KoaRequestWithBody
}

/**
 * RDCP Authenticator function interface for Koa
 * Must return boolean indicating if request is authenticated
 * Following Context7 Koa patterns - ctx parameter instead of request
 */
export type RDCPKoaAuthenticator = (ctx: Context) => Promise<boolean> | boolean

/**
 * RDCP middleware configuration options for Koa
 */
export interface RDCPKoaMiddlewareOptions {
  authenticator: RDCPKoaAuthenticator
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
        jwks?: {
          enabled?: boolean
          maxAgeSeconds?: number
          varyHeader?: string
          emitLastModified?: boolean
        }
      }
    }
  }
}

/**
 * Enhanced Koa Context with RDCP tenant information
 * Following Context7 patterns for context extension
 */
interface KoaContextWithRDCP extends Context {
  rdcpTenant?: RDCPTenantContext
}

/**
 * Extract tenant context from Koa context headers
 * Koa headers are different from Express - they're plain objects
 */
function extractTenantContextFromKoa(ctx: Context): RDCPTenantContext {
  return {
    tenantId: (ctx.headers['x-rdcp-tenant-id'] as string) || 'default',
    isolationLevel: ((ctx.headers['x-rdcp-isolation-level'] as string) ||
      'global') as 'global' | 'process' | 'namespace' | 'organization',
    tenantName: ctx.headers['x-rdcp-tenant-name'] as string,
  }
}

/**
 * Creates RDCP middleware for Koa applications
 * Uses Koa's async middleware pattern with ctx and next parameters
 * Following Context7 Koa middleware patterns
 */
export function createRDCPMiddleware(
  options: RDCPKoaMiddlewareOptions
): (ctx: KoaContextWithBody, next: Next) => Promise<void> {
  if (!options) {
    throw new Error('authenticator function is required')
  }

  const {
    authenticator,
    debugConfig = {},
    basePath = RDCP_PATHS.BASE,
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
        api: {
          active: [],
          previous: [],
          graceWindowMs: 30 * 24 * 60 * 60 * 1000,
        },
      })
    : undefined

  const wrappedAuthenticator = async (c: Context): Promise<boolean> => {
    if (!keyring) return !!(await Promise.resolve(authenticator(c)))
    const method = (c.headers['x-rdcp-auth-method'] as string) || ''
    if (method === 'bearer') {
      const authHeader = c.headers['authorization'] as string | undefined
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
    return !!(await Promise.resolve(authenticator(c)))
  }

  // Koa middleware function - async pattern following Context7
  return async function rdcpMiddleware(
    ctx: KoaContextWithBody,
    next: Next
  ): Promise<void> {
    let reqId = ''
    try {
      // Extract path from Koa context (Context7 pattern)
      const pathname = ctx.path

      // Only handle RDCP endpoints
      const metricsPath =
        options.capabilities?.metrics?.endpointPath ?? '/metrics'
      const isMetrics =
        options.capabilities?.metrics?.enabled === true &&
        pathname === metricsPath
      const isJwks =
        options.capabilities?.security?.tokenLifecycle?.jwks?.enabled ===
          true && pathname === '/.well-known/jwks.json'
      if (
        !pathname.startsWith(RDCP_PATHS.WELL_KNOWN_RDCP) &&
        !pathname.startsWith(basePath) &&
        !isMetrics &&
        !isJwks
      ) {
        await next() // Continue to next middleware (Context7 pattern)
      }

      // Prometheus metrics endpoint (no auth)
      if (isMetrics) {
        const text = rdcpServer.getPrometheusMetrics()
        ctx.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        ctx.body = text
        return
      }

      // JWKS endpoint (no auth)
      if (isJwks) {
        const maxAge =
          options.capabilities?.security?.tokenLifecycle?.jwks?.maxAgeSeconds ??
          300
        const jwks = keyring
          ? await keyring.exportPublicJWKS()
          : { keys: [] as unknown[] }
        const prepared = prepareJWKSResponse(jwks)
        const ifNoneMatch =
          (ctx.headers['if-none-match'] as string | undefined) ?? ''
        ctx.set('ETag', prepared.etag)
        ctx.set('Cache-Control', `public, max-age=${maxAge}`)
        const jwksOpts = options.capabilities?.security?.tokenLifecycle?.jwks
        if (jwksOpts?.emitLastModified) {
          ctx.set('Last-Modified', new Date().toUTCString())
        }
        if (jwksOpts?.varyHeader) {
          ctx.set('Vary', jwksOpts.varyHeader)
        }
        ctx.set('Content-Type', 'application/json')
        if (ifNoneMatch && etagMatches(ifNoneMatch, prepared.etag)) {
          ctx.status = 304
          ctx.body = null
          return
        }
        ctx.status = 200
        ctx.body = prepared.body
        return
      }

      // Validate optional X-RDCP-Request-ID header (must be a UUID)
      const reqIdHeader = ctx.headers['x-rdcp-request-id'] as string | undefined
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
          ctx.status = status
          ctx.type = 'application/json'
          ctx.body = errorResponse
          return
        }
      }

      // Generate request ID for rate limit tracking
      reqId =
        reqIdHeader ??
        `req-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === RDCP_PATHS.WELL_KNOWN_RDCP) {
        const discoveryResponse = rdcpServer.handleDiscovery({
          basePath,
          requestId: reqId,
        })
        const ev = rateEvents.get(reqId)
        if (ev && options.capabilities?.rateLimit?.headers) {
          if (options.capabilities.rateLimit.headersMode === 'draft-7') {
            ctx.set(
              'RateLimit',
              `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
                ev.resetMs / 1000
              )}`
            )
            ctx.set(
              'RateLimit-Policy',
              `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
            )
            if (!ev.allowed)
              ctx.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          } else {
            ctx.set('X-RateLimit-Limit', String(ev.limit))
            ctx.set('X-RateLimit-Remaining', String(ev.remaining))
            ctx.set(
              'X-RateLimit-Reset',
              String(Math.ceil((Date.now() + ev.resetMs) / 1000))
            )
            if (!ev.allowed)
              ctx.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          }
        }
        ctx.set('X-Request-Id', reqId)
        ctx.type = 'application/json'
        ctx.body = discoveryResponse
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await wrappedAuthenticator(ctx)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError(
            'RDCP_AUTH_REQUIRED',
            'Authentication required'
          )
          ctx.status = 401
          ctx.type = 'application/json'
          ctx.body = errorResponse
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
        ctx.status = 401
        ctx.type = 'application/json'
        ctx.body = errorResponse
        return
      }

      // Extract tenant context from Koa headers using custom utility
      const tenantContext = extractTenantContextFromKoa(ctx)
      // Store tenant context in Koa state following Context7 patterns
      ctx.state.rdcpTenant = tenantContext
      ;(ctx as KoaContextWithRDCP).rdcpTenant = tenantContext

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
        if (ctx.method !== 'POST') {
          response = createRDCPError(
            'RDCP_INVALID_ACTION',
            'POST method required'
          )
          statusCode = 405
        } else {
          // Following Context7 patterns - body parser middleware adds body property
          const body = ctx.request.body ?? {}
          const meta: {
            requestId: string
            authMethod?: string
            clientId?: string
            ip?: string
          } = { requestId: reqId }
          const am = ctx.headers['x-rdcp-auth-method'] as string | undefined
          const cid = ctx.headers['x-rdcp-client-id'] as string | undefined
          if (am) meta.authMethod = am
          if (cid) meta.clientId = cid
          if (ctx.ip) meta.ip = ctx.ip
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

      // Map error to HTTP status
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
          ctx.set(
            'RateLimit',
            `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
              ev.resetMs / 1000
            )}`
          )
          ctx.set(
            'RateLimit-Policy',
            `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
          )
          if (!ev.allowed)
            ctx.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        } else {
          ctx.set('X-RateLimit-Limit', String(ev.limit))
          ctx.set('X-RateLimit-Remaining', String(ev.remaining))
          ctx.set(
            'X-RateLimit-Reset',
            String(Math.ceil((Date.now() + ev.resetMs) / 1000))
          )
          if (!ev.allowed)
            ctx.set('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        }
      }
      // Emit warnings
      const respWarn = response as { __rdcpWarnings?: string[] }
      const warnings = respWarn.__rdcpWarnings
      if (warnings?.includes('audit-write-failed')) {
        ctx.set('Warning', '199 rdcp "audit-write-failed"')
      }
      ctx.set('X-Request-Id', reqId)
      ctx.status = statusCode
      ctx.type = 'application/json'
      ctx.body = response
    } catch (error) {
      logger.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'Internal server error'
      )
      if (reqId) ctx.set('X-Request-Id', reqId)
      ctx.status = 500
      ctx.type = 'application/json'
      ctx.body = errorResponse
    } finally {
      if (reqId) rateEvents.delete(reqId)
    }
  }
}

/**
 * Creates Koa middleware with error boundary handling
 * Wraps the main RDCP middleware with additional error recovery
 * Following Context7 patterns for error handling
 */
export function createRDCPMiddlewareWithErrorBoundary(
  options: RDCPKoaMiddlewareOptions
): (ctx: KoaContextWithBody, next: Next) => Promise<void> {
  const middleware = createRDCPMiddleware(options)

  return async function rdcpMiddlewareWithErrorBoundary(
    ctx: KoaContextWithBody,
    next: Next
  ): Promise<void> {
    try {
      return await middleware(ctx, next)
    } catch (error) {
      // Secondary error boundary for catastrophic failures
      logger.error('RDCP middleware catastrophic error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'System error occurred'
      )
      ctx.status = 500
      ctx.type = 'application/json'
      ctx.body = errorResponse
    }
  }
}

// Context extension following Context7 patterns
declare module 'koa' {
  interface DefaultState {
    rdcpTenant?: RDCPTenantContext
  }

  interface DefaultContext {
    rdcpTenant?: RDCPTenantContext
  }
}
