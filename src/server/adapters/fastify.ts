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
import { createRDCPError } from '../../validation/errors.js'
import { extractTenantContext, RDCPTenantContext } from '../../utils/tenant.js'
import { logger } from '../../utils/logger.js'

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
    audit?: {
      enabled?: boolean
      sink?: 'console' | 'file' | 'none'
      file?: { path?: string; maxBytes?: number; maxFiles?: number }
      sampleRate?: number
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
  const rateEvents = new Map<string, {
    allowed: boolean
    remaining: number
    resetMs: number
    limit: number
  }>()

  // Initialize RDCP server utilities
  const rdcpServer = new RDCPServer({
    debugConfig,
    performance,
    tenant,
    onRateLimit: (e) => {
      if (options.capabilities?.rateLimit?.headers) {
        const key = e.requestId || `${e.endpoint}:${e.tenantId ?? 'global'}`
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

  // Fastify middleware function - preHandler pattern (Context7 pattern)
  return async function rdcpMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract path from Fastify request
      const pathname = request.url.split('?')[0]

      // Only handle RDCP endpoints
      if (
        !pathname.startsWith('/.well-known/rdcp') &&
        !pathname.startsWith(basePath)
      ) {
        return // Continue to next handler
      }

      // Generate request ID for rate limit tracking
      const reqId =
        (request.headers['x-rdcp-request-id'] as string) ||
        `req-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === '/.well-known/rdcp') {
        const discoveryResponse = rdcpServer.handleDiscovery({ basePath, requestId: reqId })
        // Headers
        const ev = rateEvents.get(reqId)
        if (ev && options.capabilities?.rateLimit?.headers) {
          if (options.capabilities.rateLimit.headersMode === 'draft-7') {
            reply.header('RateLimit', `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(ev.resetMs / 1000)}`)
            reply.header('RateLimit-Policy', `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`)
            if (!ev.allowed) reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          } else {
            reply.header('X-RateLimit-Limit', String(ev.limit))
            reply.header('X-RateLimit-Remaining', String(ev.remaining))
            reply.header('X-RateLimit-Reset', String(Math.ceil((Date.now() + ev.resetMs) / 1000)))
            if (!ev.allowed) reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
          }
        }
        reply.type('application/json').send(discoveryResponse)
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await authenticator(request)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError(
            'RDCP_AUTH_REQUIRED',
            'Authentication required'
          )
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
        response = rdcpServer.handleDiscovery({
          basePath,
          tenant: tenantContext,
          requestId: reqId,
        })
      } else if (pathname === `${basePath}/control`) {
        if (request.method !== 'POST') {
          response = createRDCPError(
            'RDCP_INVALID_ACTION',
            'POST method required'
          )
          statusCode = 405
        } else {
          const body = request.body || {}
          response = await rdcpServer.handleControl(body, tenantContext, { requestId: reqId })
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
      if ((response as any)?.error?.code) {
        const code = (response as any).error.code as string
        if (code === 'RDCP_RATE_LIMITED') statusCode = 429
        else if (code === 'RDCP_NOT_FOUND') statusCode = 404
        else if (code === 'RDCP_AUTH_REQUIRED') statusCode = 401
        else if (code === 'RDCP_FORBIDDEN') statusCode = 403
        else if (code.startsWith('RDCP_')) statusCode = 400
      }
      const ev = rateEvents.get(reqId)
      if (ev && options.capabilities?.rateLimit?.headers) {
        if (options.capabilities.rateLimit.headersMode === 'draft-7') {
          reply.header('RateLimit', `limit=${ev.limit}, remaining=${ev.remaining}, reset=${Math.ceil(ev.resetMs / 1000)}`)
          reply.header('RateLimit-Policy', `${ev.limit};w=${Math.ceil(ev.resetMs / 1000)}`)
          if (!ev.allowed) reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        } else {
          reply.header('X-RateLimit-Limit', String(ev.limit))
          reply.header('X-RateLimit-Remaining', String(ev.remaining))
          reply.header('X-RateLimit-Reset', String(Math.ceil((Date.now() + ev.resetMs) / 1000)))
          if (!ev.allowed) reply.header('Retry-After', String(Math.ceil(ev.resetMs / 1000)))
        }
      }
      reply.status(statusCode).type('application/json').send(response)
    } catch (error) {
      logger.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError(
        'RDCP_SERVER_ERROR',
        'Internal server error'
      )
      reply.status(500).type('application/json').send(errorResponse)
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
