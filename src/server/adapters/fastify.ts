/**
 * @fileoverview Fastify adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Fastify-compatible middleware
 * following the preHandler pattern for authentication and RDCP endpoint handling
 */

import {
  FastifyRequest,
  FastifyReply,
  FastifyPluginCallback,
  FastifyInstance,
} from 'fastify'
import fp from 'fastify-plugin'
import { RDCPServer } from '../index.js'
import { createRDCPError, ERROR_STATUS_MAP } from '../../validation/errors.js'
import { extractTenantContext, RDCPTenantContext } from '../../utils/tenant.js'
import { logger } from '../../utils/logger.js'
import { createKeyring } from '../keyring.js'
import { prepareJWKSResponse, etagMatches } from '../../utils/etag.js'
import { RDCP_PATHS } from '@rdcp.dev/core'

/**
 * RDCP Authenticator function interface for Fastify
 * Must return boolean indicating if request is authenticated
 */
export type RDCPFastifyAuthenticator = (
  req: FastifyRequest
) => Promise<boolean> | boolean

/**
 * RDCP middleware configuration options for Fastify
 */
export interface RDCPFastifyMiddlewareOptions {
  authenticator: RDCPFastifyAuthenticator
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
 * RDCP Control request body interface
 * Following Context7 type safety patterns
 */
interface RDCPControlRequestBody {
  action: string
  categories?: string[]
}

/**
 * Route generic interface for RDCP requests following Context7 patterns
 */
interface RDCPRouteGeneric {
  Body: RDCPControlRequestBody
}

/**
 * Type alias for RDCP Fastify request following Context7 patterns
 */
type RDCPFastifyRequest = FastifyRequest<RDCPRouteGeneric> & {
  rdcpTenant?: RDCPTenantContext
}

/**
 * Creates RDCP middleware for Fastify applications
 * Uses preHandler pattern for authentication and route-specific middleware
 * Following Context7 Fastify patterns
 */
export function createRDCPMiddleware(
  options: RDCPFastifyMiddlewareOptions
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
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

  const wrappedAuthenticator = async (
    req: FastifyRequest
  ): Promise<boolean> => {
    if (!keyring) return !!(await Promise.resolve(authenticator(req)))
    const method = (req.headers['x-rdcp-auth-method'] as string) || ''
    if (method === 'bearer') {
      const authHeader = req.headers['authorization'] as string | undefined
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
    return !!(await Promise.resolve(authenticator(req)))
  }

  // Fastify middleware function - preHandler pattern (Context7 pattern)
  return async function rdcpMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    let reqId = ''
    try {
      // Extract path from Fastify request
      const pathname = request.url.split('?')[0]

      // Validate optional X-RDCP-Request-ID header (must be a UUID)
      const reqIdHeader = request.headers['x-rdcp-request-id'] as
        | string
        | undefined
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
          reply.status(status).type('application/json').send(errorResponse)
          return
        }
      }

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
        return // Continue to next handler
      }

      // Prometheus metrics endpoint (no auth)
      if (isMetrics) {
        const text = rdcpServer.getPrometheusMetrics()
        reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        reply.send(text)
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
          (request.headers['if-none-match'] as string | undefined) ?? ''
        reply.header('ETag', prepared.etag)
        reply.header('Cache-Control', `public, max-age=${maxAge}`)
        const jwksOpts = options.capabilities?.security?.tokenLifecycle?.jwks
        if (jwksOpts?.emitLastModified) {
          reply.header('Last-Modified', new Date().toUTCString())
        }
        if (jwksOpts?.varyHeader) {
          reply.header('Vary', jwksOpts.varyHeader)
        }
        reply.header('Content-Type', 'application/json')
        if (ifNoneMatch && etagMatches(ifNoneMatch, prepared.etag)) {
          reply.code(304).send()
          return
        }
        reply.code(200).send(prepared.body)
        return
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
        // Headers
        const ev = rateEvents.get(reqId)
        if (ev && options.capabilities?.rateLimit?.headers) {
          if (options.capabilities.rateLimit.headersMode === 'draft-7') {
            reply.header(
              'RateLimit',
              `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
                ev.resetMs / 1000
              )}`
            )
            reply.header(
              'RateLimit-Policy',
              `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
            )
            if (!ev.allowed)
              reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          } else {
            reply.header('X-RateLimit-Limit', String(ev.limit))
            reply.header('X-RateLimit-Remaining', String(ev.remaining))
            reply.header(
              'X-RateLimit-Reset',
              String(Math.ceil((Date.now() + ev.resetMs) / 1000))
            )
            if (!ev.allowed)
              reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          }
        }
        reply.header('X-Request-Id', reqId)
        reply.type('application/json').send(discoveryResponse)
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await wrappedAuthenticator(request)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError(
            'RDCP_AUTH_REQUIRED',
            'Authentication required'
          )
          reply.header('X-Request-Id', reqId)
          reply.status(401).type('application/json').send(errorResponse)
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
        reply.header('X-Request-Id', reqId)
        reply.status(401).type('application/json').send(errorResponse)
        return
      }

      // Extract tenant context from Fastify headers using utility
      const tenantContext = extractTenantContext(request as RDCPFastifyRequest)
      ;(request as RDCPFastifyRequest).rdcpTenant = tenantContext

      // Handle authenticated RDCP endpoints
      let response
      let statusCode = 200

      if (pathname === `${basePath}/discovery`) {
        response = rdcpServer.handleDebugDiscovery({
          basePath,
          tenant: tenantContext,
          requestId: reqId,
        })
      } else if (pathname === `${basePath}/control`) {
        if (request.method !== 'POST' && request.method !== 'PUT') {
          response = createRDCPError(
            'RDCP_INVALID_ACTION',
            'POST or PUT method required'
          )
          statusCode = 405
        } else {
          const body = request.body ?? {}
          const meta: {
            requestId: string
            authMethod?: string
            clientId?: string
            ip?: string
          } = { requestId: reqId }
          const am = request.headers['x-rdcp-auth-method'] as string | undefined
          const cid = request.headers['x-rdcp-client-id'] as string | undefined
          if (am) meta.authMethod = am
          if (cid) meta.clientId = cid
          const rip = (request as unknown as { ip?: string }).ip
          if (rip) meta.ip = rip
          response = await rdcpServer.handleControl(body, tenantContext, meta)
        }
      } else if (pathname === `${basePath}/status`) {
        response = rdcpServer.handleStatusV1(tenantContext, {
          requestId: reqId,
        })
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
      const ev = rateEvents.get(reqId)
      if (ev && options.capabilities?.rateLimit?.headers) {
        if (options.capabilities.rateLimit.headersMode === 'draft-7') {
          reply.header(
            'RateLimit',
            `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(
              ev.resetMs / 1000
            )}`
          )
          reply.header(
            'RateLimit-Policy',
            `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`
          )
          if (!ev.allowed)
            reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        } else {
          reply.header('X-RateLimit-Limit', String(ev.limit))
          reply.header('X-RateLimit-Remaining', String(ev.remaining))
          reply.header(
            'X-RateLimit-Reset',
            String(Math.ceil((Date.now() + ev.resetMs) / 1000))
          )
          if (!ev.allowed)
            reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        }
      }
      // Emit warnings
      const respWarn = response as { __rdcpWarnings?: string[] }
      const warnings = respWarn.__rdcpWarnings
      if (warnings?.includes('audit-write-failed')) {
        reply.header('Warning', '199 rdcp "audit-write-failed"')
      }
      reply.header('X-Request-Id', reqId)
      reply.status(statusCode).type('application/json').send(response)
    } catch (error) {
      logger.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'Internal server error'
      )
      if (reqId) reply.header('X-Request-Id', reqId)
      reply.status(500).type('application/json').send(errorResponse)
    } finally {
      if (reqId) rateEvents.delete(reqId)
    }
  }
}

/**
 * RDCP Plugin options for Fastify
 * Extends middleware options for plugin-specific configuration
 */
export interface RDCPFastifyPluginOptions extends RDCPFastifyMiddlewareOptions {
  // Can add plugin-specific options here if needed
}

/**
 * Creates a Fastify plugin that registers RDCP routes and middleware
 * This provides an alternative approach using Fastify's plugin system
 * Following Context7 Fastify plugin patterns with proper typing
 */
export function createRDCPPlugin(
  options: RDCPFastifyPluginOptions
): FastifyPluginCallback<RDCPFastifyPluginOptions> {
  const rdcpPlugin: FastifyPluginCallback<RDCPFastifyPluginOptions> = (
    fastify: FastifyInstance,
    opts,
    done
  ) => {
    try {
      const middleware = createRDCPMiddleware(options)

      // Register as preHandler for all RDCP routes using Context7 pattern
      fastify.addHook('preHandler', middleware)

      // Decorate fastify instance with RDCP utilities if needed
      fastify.decorate('rdcpServer', new RDCPServer(options))

      done()
    } catch (error) {
      done(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // Use fastify-plugin for proper encapsulation
  return fp(rdcpPlugin, {
    name: 'rdcp-plugin',
    fastify: '4.x',
  })
}

// Type augmentation following Context7 declaration merging patterns
declare module 'fastify' {
  interface FastifyRequest {
    rdcpTenant?: RDCPTenantContext
  }

  interface FastifyInstance {
    rdcpServer?: RDCPServer
  }
}
