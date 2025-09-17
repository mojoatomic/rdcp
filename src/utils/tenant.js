/**
 * @fileoverview RDCP tenant context utilities
 * Provides standard tenant header extraction and context handling
 * Following RDCP v1.0 protocol specification for multi-tenancy
 */

/**
 * RDCP Standard: Extract tenant context from standard headers
 * Follows the exact pattern from the implementation guide
 * 
 * @param {Object} request - Request object with headers
 * @returns {Object} Tenant context object
 */
function extractTenantContext(request) {
  return {
    tenantId: request.headers.get?.('x-rdcp-tenant-id') || 
              request.headers['x-rdcp-tenant-id'] || 
              'default',
    isolationLevel: request.headers.get?.('x-rdcp-isolation-level') || 
                    request.headers['x-rdcp-isolation-level'] || 
                    'global',
    tenantName: request.headers.get?.('x-rdcp-tenant-name') || 
                request.headers['x-rdcp-tenant-name']
  }
}

/**
 * RDCP Standard: Tenant-scoped configuration storage
 * Each tenant gets isolated debug configuration
 */
const TENANT_DEBUG_CONFIGS = new Map()

/**
 * Get tenant-specific debug configuration
 * Creates default config if tenant doesn't exist
 * 
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Tenant debug configuration
 */
function getTenantDebugConfig(tenantId) {
  if (!TENANT_DEBUG_CONFIGS.has(tenantId)) {
    TENANT_DEBUG_CONFIGS.set(tenantId, {
      DATABASE: false,
      API_ROUTES: false,
      QUERIES: false,
      REPORTS: false,
      CACHE: false,
      AUTH: false,
      INTEGRATIONS: false
    })
  }
  return TENANT_DEBUG_CONFIGS.get(tenantId)
}

/**
 * Set tenant-specific debug configuration
 * Updates existing configuration or creates new one
 * 
 * @param {string} tenantId - Tenant identifier
 * @param {Object} config - Debug configuration object
 */
function setTenantDebugConfig(tenantId, config) {
  const currentConfig = getTenantDebugConfig(tenantId)
  TENANT_DEBUG_CONFIGS.set(tenantId, { ...currentConfig, ...config })
}

/**
 * Create RDCP standard tenant response object
 * Used in all RDCP endpoint responses
 * 
 * @param {Object} tenantContext - Tenant context from extractTenantContext
 * @returns {Object} Standard RDCP tenant response object
 */
function createTenantResponse(tenantContext) {
  const scope = tenantContext.isolationLevel === 'global' ? 'global' : 'tenant-isolated'
  
  return {
    id: tenantContext.tenantId,
    isolationLevel: tenantContext.isolationLevel,
    scope,
    name: tenantContext.tenantName
  }
}

/**
 * Get all tenant configurations
 * Used for admin/management purposes
 * 
 * @returns {Array} Array of tenant configurations
 */
function getAllTenantConfigs() {
  const configs = []
  for (const [tenantId, config] of TENANT_DEBUG_CONFIGS.entries()) {
    configs.push({
      tenantId,
      config,
      isolationLevel: 'organization' // Default for stored tenants
    })
  }
  return configs
}

/**
 * Clear tenant configuration
 * Removes tenant from memory (does not persist)
 * 
 * @param {string} tenantId - Tenant identifier
 * @returns {boolean} True if tenant was removed
 */
function clearTenantConfig(tenantId) {
  return TENANT_DEBUG_CONFIGS.delete(tenantId)
}

module.exports = {
  extractTenantContext,
  getTenantDebugConfig,
  setTenantDebugConfig,
  createTenantResponse,
  getAllTenantConfigs,
  clearTenantConfig
}