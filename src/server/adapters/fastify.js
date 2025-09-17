/**
 * @fileoverview Fastify adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Fastify-compatible middleware
 * following the preHandler pattern for authentication and RDCP endpoint handling
 */

const { RDCPServer } = require('../index.js')
const { RDCPAuthError, createRDCPError } = require('../../validation/errors.js')

/**
 * Creates RDCP middleware for Fastify applications
 * Uses preHandler pattern for authentication and route-specific middleware
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.authenticator - Authentication function (req) => Promise<boolean>
 * @param {Object} options.debugConfig - Debug configuration object
 * @param {string} [options.basePath='/rdcp/v1'] - Base path for RDCP endpoints
 * @param {Object} [options.performance={}] - Performance configuration
 * @param {Object} [options.tenant] - Multi-tenancy configuration
 * @returns {Function} Fastify middleware function
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

  // Fastify middleware function - preHandler pattern
  return async function rdcpMiddleware(request, reply) {
    try {
      // Extract path from Fastify request
      const pathname = request.url.split('?')[0]
      
      // Only handle RDCP endpoints
      if (!pathname.startsWith('/.well-known/rdcp') && !pathname.startsWith(basePath)) {
        return // Continue to next handler
      }

      // Handle .well-known/rdcp discovery endpoint (no auth required)
      if (pathname === '/.well-known/rdcp') {
        const discoveryResponse = rdcpServer.handleDiscovery({ basePath })
        reply.type('application/json').send(discoveryResponse)
        return
      }

      // All other RDCP endpoints require authentication
      try {
        const isAuthenticated = await authenticator(request)
        if (!isAuthenticated) {
          const errorResponse = createRDCPError('RDCP_AUTH_REQUIRED', 'Authentication required')
          reply.status(401).type('application/json').send(errorResponse)
          return
        }
      } catch (authError) {
        const errorResponse = createRDCPError(
          'RDCP_AUTH_ERROR', 
          `Authentication failed: ${authError.message}`
        )
        reply.status(401).type('application/json').send(errorResponse)
        return
      }

      // Extract tenant context from Fastify headers
      const tenantContext = {
        tenantId: request.headers['x-rdcp-tenant-id'],
        isolationLevel: request.headers['x-rdcp-isolation-level'] || 'global'
      }

      // Handle authenticated RDCP endpoints
      let response
      let statusCode = 200

      if (pathname === `${basePath}/discovery`) {
        response = rdcpServer.handleDiscovery({ basePath, tenant: tenantContext })
      } else if (pathname === `${basePath}/control`) {
        if (request.method !== 'POST') {
          response = createRDCPError('RDCP_METHOD_NOT_ALLOWED', 'POST method required')
          statusCode = 405
        } else {
          const body = request.body || {}
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

      reply.status(statusCode).type('application/json').send(response)
    } catch (error) {
      console.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError('RDCP_INTERNAL_ERROR', 'Internal server error')
      reply.status(500).type('application/json').send(errorResponse)
    }
  }
}

/**
 * Creates a Fastify plugin that registers RDCP routes and middleware
 * This provides an alternative approach using Fastify's plugin system
 * 
 * @param {Object} options - Configuration options (same as createRDCPMiddleware)
 * @returns {Function} Fastify plugin function
 */
function createRDCPPlugin(options = {}) {
  return function rdcpPlugin(fastify, opts, done) {
    const middleware = createRDCPMiddleware(options)
    
    // Register as preHandler for all RDCP routes
    fastify.addHook('preHandler', middleware)
    
    done()
  }
}

module.exports = {
  createRDCPMiddleware,
  createRDCPPlugin
}