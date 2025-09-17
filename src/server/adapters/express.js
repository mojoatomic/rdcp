/**
 * @fileoverview Express adapter for RDCP server middleware
 * Provides createRDCPMiddleware function that returns Express-compatible middleware
 * following standard Express middleware signature (req, res, next)
 */

const { RDCPServer } = require('../index.js')
const { RDCPAuthError, createRDCPError } = require('../../validation/errors.js')

/**
 * Creates RDCP middleware for Express applications
 * Uses standard Express middleware pattern with req, res, next parameters
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.authenticator - Authentication function (req) => Promise<boolean>
 * @param {Object} options.debugConfig - Debug configuration object
 * @param {string} [options.basePath='/rdcp/v1'] - Base path for RDCP endpoints
 * @param {Object} [options.performance={}] - Performance configuration
 * @param {Object} [options.tenant] - Multi-tenancy configuration
 * @returns {Function} Express middleware function
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

  // Express middleware function - standard pattern
  return async function rdcpMiddleware(req, res, next) {
    try {
      // Extract path from Express request
      const pathname = req.path
      
      // Only handle RDCP endpoints
      if (!pathname.startsWith('/.well-known/rdcp') && !pathname.startsWith(basePath)) {
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
          const errorResponse = createRDCPError('RDCP_AUTH_REQUIRED', 'Authentication required')
          res.status(401).json(errorResponse)
          return
        }
      } catch (authError) {
        const errorResponse = createRDCPError(
          'RDCP_AUTH_ERROR', 
          `Authentication failed: ${authError.message}`
        )
        res.status(401).json(errorResponse)
        return
      }

      // Extract tenant context from Express headers
      const tenantContext = {
        tenantId: req.headers['x-rdcp-tenant-id'],
        isolationLevel: req.headers['x-rdcp-isolation-level'] || 'global'
      }

      // Handle authenticated RDCP endpoints
      let response
      let statusCode = 200

      if (pathname === `${basePath}/discovery`) {
        response = rdcpServer.handleDiscovery({ basePath, tenant: tenantContext })
      } else if (pathname === `${basePath}/control`) {
        if (req.method !== 'POST') {
          response = createRDCPError('RDCP_METHOD_NOT_ALLOWED', 'POST method required')
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
      console.error('RDCP middleware error:', error)
      const errorResponse = createRDCPError('RDCP_INTERNAL_ERROR', 'Internal server error')
      res.status(500).json(errorResponse)
    }
  }
}

/**
 * Creates Express router with RDCP routes pre-configured
 * Alternative approach using Express Router for modular mounting
 * 
 * @param {Object} options - Configuration options (same as createRDCPMiddleware)
 * @returns {Object} Express router with RDCP routes
 */
function createRDCPRouter(options = {}) {
  const express = require('express')
  const router = express.Router()
  const middleware = createRDCPMiddleware(options)
  
  // Apply middleware to all routes
  router.use(middleware)
  
  return router
}

/**
 * Creates Express error handler middleware for RDCP errors
 * Should be used after RDCP middleware to catch any unhandled errors
 * 
 * @returns {Function} Express error handler middleware
 */
function createRDCPErrorHandler() {
  return function rdcpErrorHandler(error, req, res, next) {
    // Only handle RDCP-related errors
    if (!(error instanceof RDCPAuthError)) {
      return next(error)
    }

    console.error('RDCP error handler:', error)
    const errorResponse = createRDCPError(
      error.code || 'RDCP_ERROR',
      error.message
    )
    res.status(error.statusCode || 500).json(errorResponse)
  }
}

module.exports = {
  createRDCPMiddleware,
  createRDCPRouter,
  createRDCPErrorHandler
}