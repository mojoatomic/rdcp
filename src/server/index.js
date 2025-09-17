/**
 * @fileoverview RDCP server utilities
 * Provides RDCPServer class with tenant-aware endpoint handling
 * Following RDCP v1.0 protocol specification
 */

const { extractTenantContext, getTenantDebugConfig, createTenantResponse } = require('../utils/tenant.js')
const { createRDCPError } = require('../validation/errors.js')

/**
 * RDCP Server utility class
 * Handles all RDCP v1.0 endpoints with tenant context support
 */
class RDCPServer {
  constructor(options = {}) {
    this.debugConfig = options.debugConfig || {}
    this.performance = options.performance || {}
    this.tenant = options.tenant || {}
  }

  /**
   * Handle RDCP discovery endpoint
   * Returns available endpoints and capabilities
   * 
   * @param {Object} options - Discovery options
   * @param {string} options.basePath - Base path for RDCP endpoints
   * @param {Object} options.tenant - Tenant context (optional)
   * @returns {Object} RDCP discovery response
   */
  handleDiscovery({ basePath = '/rdcp/v1', tenant } = {}) {
    const response = {
      protocol: 'rdcp/1.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        discovery: `${basePath}/discovery`,
        control: `${basePath}/control`,
        status: `${basePath}/status`,
        health: `${basePath}/health`
      },
      capabilities: {
        authentication: ['basic', 'standard', 'enterprise'],
        isolation: ['global', 'process', 'namespace', 'organization'],
        categories: ['DATABASE', 'API_ROUTES', 'QUERIES', 'REPORTS', 'CACHE', 'AUTH', 'INTEGRATIONS']
      }
    }

    // Include tenant context if provided
    if (tenant) {
      response.tenant = createTenantResponse(tenant)
    }

    return response
  }

  /**
   * Handle RDCP control endpoint
   * Processes debug control operations with tenant isolation
   * 
   * @param {Object} body - Request body
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} RDCP control response
   */
  async handleControl(body, tenantContext) {
    const { action, categories = [] } = body
    
    if (!action) {
      return createRDCPError('RDCP_VALIDATION_ERROR', 'Missing action parameter')
    }

    // Get tenant-specific configuration
    const tenantConfig = getTenantDebugConfig(tenantContext.tenantId)
    const changes = []

    try {
      switch (action) {
        case 'enable':
          categories.forEach(category => {
            if (category in tenantConfig) {
              tenantConfig[category] = true
              changes.push({
                category,
                action: 'enabled',
                tenantScope: tenantContext.tenantId,
                isolationLevel: tenantContext.isolationLevel
              })
            }
          })
          break

        case 'disable':
          categories.forEach(category => {
            if (category in tenantConfig) {
              tenantConfig[category] = false
              changes.push({
                category,
                action: 'disabled',
                tenantScope: tenantContext.tenantId,
                isolationLevel: tenantContext.isolationLevel
              })
            }
          })
          break

        default:
          return createRDCPError('RDCP_VALIDATION_ERROR', `Unknown action: ${action}`)
      }

      return {
        protocol: 'rdcp/1.0',
        timestamp: new Date().toISOString(),
        tenant: createTenantResponse(tenantContext),
        changes,
        status: 'success'
      }
    } catch (error) {
      return createRDCPError('RDCP_CONTROL_ERROR', `Control operation failed: ${error.message}`)
    }
  }

  /**
   * Handle RDCP status endpoint
   * Returns current debug status with tenant isolation
   * 
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} RDCP status response
   */
  handleStatus(tenantContext) {
    // Get tenant-specific configuration
    const tenantConfig = getTenantDebugConfig(tenantContext.tenantId)
    
    const categories = {}
    Object.keys(tenantConfig).forEach(category => {
      categories[category] = {
        enabled: tenantConfig[category],
        tenantScope: tenantContext.tenantId
      }
    })

    return {
      protocol: 'rdcp/1.0',
      timestamp: new Date().toISOString(),
      tenant: createTenantResponse(tenantContext),
      categories,
      performance: {
        impact: {
          cpu: '0.1%',
          memory: '1MB'
        },
        activeCategories: Object.keys(tenantConfig).filter(cat => tenantConfig[cat]).length
      }
    }
  }

  /**
   * Handle RDCP health endpoint
   * Returns system health status (global, not tenant-specific)
   * 
   * @returns {Object} RDCP health response
   */
  handleHealth() {
    return {
      protocol: 'rdcp/1.0',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }
  }
}

module.exports = {
  RDCPServer
}