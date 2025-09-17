/**
 * @fileoverview Koa adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Koa-compatible middleware
 * following async/await patterns and Koa context conventions
 */

const { RDCPServer } = require('../index.js')
const { RDCPAuthError, createRDCPError } = require('../../validation/errors.js')

/**
 * Creates RDCP middleware for Koa applications
 * Uses Koa's async middleware pattern with ctx and next parameters
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.authenticator - Authentication function (ctx) => Promise<boolean>
 * @param {Object} options.debugConfig - Debug configuration object
 * @param {string} [options.basePath='/rdcp/v1'] - Base path for RDCP endpoints
 * @param {Object} [options.performance={}] - Performance configuration
 * @param {Object} [options.tenant] - Multi-tenancy configuration
 * @returns {Function} Koa middleware function
 */
function createRDCPMiddleware(options = {}) {
  const {
    authenticator,
    debugConfig = {},
    basePath = '/rdcp/v1',
    performance = {},
    tenant = {}
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
    tenant
  })

  // Koa middleware function - async pattern
  return async function rdcpMiddleware(ctx, next) {
    try {
      // Extract path from Koa context
      const pathname = ctx.path
      
      // Only handle RDCP endpoints
      if (!pathname.startsWith('/.well-known/rdcp') && !pathname.startsWith(basePath)) {
        return await next() // Continue to next middleware
      }

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === '/.well-known/rdcp') {
        const discoveryResponse = rdcpServer.handleDiscovery({ basePath })
        ctx.type = 'application/json'
        ctx.body = discoveryResponse
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await authenticator(ctx)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError('RDCP_AUTH_REQUIRED', 'Authentication required')
          ctx.status = 401
          ctx.type = 'application/json'
          ctx.body = errorResponse
          return
        }
      } catch (authError) {
        const errorResponse = createRDCPError(
          'RDCP_AUTH_ERROR', 
          `Authentication failed: ${authError.message}`
        )
        ctx.status = 401
        ctx.type = 'application/json'
        ctx.body = errorResponse
        return
      }

      // Extract tenant context from Koa headers
      const tenantContext = {
        tenantId: ctx.headers['x-rdcp-tenant-id'],
        isolationLevel: ctx.headers['x-rdcp-isolation-level'] || 'global'
      }

      // Handle authenticated RDCP endpoints
      let response
      let statusCode = 200

      if (pathname === `${basePath}/discovery`) {
        response = rdcpServer.handleDiscovery({ basePath, tenant: tenantContext })
      } else if (pathname === `${basePath}/control`) {
        if (ctx.method !== 'POST') {
          response = createRDCPError('RDCP_METHOD_NOT_ALLOWED', 'POST method required')
          statusCode = 405
        } else {
          const body = ctx.request.body || {}
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

      ctx.status = statusCode
      ctx.type = 'application/json'
      ctx.body = response
    } catch (error) {
      console.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError('RDCP_INTERNAL_ERROR', 'Internal server error')
      ctx.status = 500
      ctx.type = 'application/json'
      ctx.body = errorResponse
    }
  }
}

/**
 * Creates Koa middleware with error boundary handling
 * Wraps the main RDCP middleware with additional error recovery
 * 
 * @param {Object} options - Configuration options (same as createRDCPMiddleware)
 * @returns {Function} Koa middleware function with error handling
 */
function createRDCPMiddlewareWithErrorBoundary(options = {}) {
  const middleware = createRDCPMiddleware(options)
  
  return async function rdcpMiddlewareWithErrorBoundary(ctx, next) {
    try {
      return await middleware(ctx, next)
    } catch (error) {
      // Secondary error boundary for catastrophic failures
      console.error('RDCP middleware catastrophic error:', error)
      const errorResponse = createRDCPError('RDCP_SYSTEM_ERROR', 'System error occurred')
      ctx.status = 500
      ctx.type = 'application/json'
      ctx.body = errorResponse
    }
  }
}

module.exports = {
  createRDCPMiddleware,
  createRDCPMiddlewareWithErrorBoundary
}