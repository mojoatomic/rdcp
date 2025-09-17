/**
 * @fileoverview RDCP tenant context utilities
 * Provides standard tenant header extraction and context handling
 * Following RDCP v1.0 protocol specification for multi-tenancy
 */

import { TenantContext } from './types.js'

/**
 * RDCP Tenant Context from HTTP headers
 * Must match specification isolation levels
 */
export interface RDCPTenantContext {
  tenantId: string
  isolationLevel: 'global' | 'process' | 'namespace' | 'organization'
  tenantName?: string
}

/**
 * Debug configuration for a tenant
 * Must include all standard debug categories
 */
export interface TenantDebugConfig {
  DATABASE: boolean
  API_ROUTES: boolean
  QUERIES: boolean
  REPORTS: boolean
  CACHE: boolean
  AUTH: boolean
  INTEGRATIONS: boolean
}

/**
 * Request object with headers interface
 * Works with both Express and Next.js request objects
 */
interface RequestWithHeaders {
  headers: {
    get?: (name: string) => string | null | undefined
    [key: string]: any
  }
}

/**
 * RDCP Standard: Extract tenant context from standard headers
 * Follows the exact pattern from the implementation guide
 */
export function extractTenantContext(request: RequestWithHeaders): RDCPTenantContext {
  return {
    tenantId: request.headers.get?.('x-rdcp-tenant-id') || 
              request.headers['x-rdcp-tenant-id'] || 
              'default',
    isolationLevel: (request.headers.get?.('x-rdcp-isolation-level') || 
                    request.headers['x-rdcp-isolation-level'] || 
                    'global') as 'global' | 'process' | 'namespace' | 'organization',
    tenantName: request.headers.get?.('x-rdcp-tenant-name') || 
                request.headers['x-rdcp-tenant-name']
  }
}

/**
 * RDCP Standard: Tenant-scoped configuration storage
 * Each tenant gets isolated debug configuration
 */
const TENANT_DEBUG_CONFIGS = new Map<string, TenantDebugConfig>()

/**
 * Get tenant-specific debug configuration
 * Creates default config if tenant doesn't exist
 */
export function getTenantDebugConfig(tenantId: string): TenantDebugConfig {
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
  return TENANT_DEBUG_CONFIGS.get(tenantId)!
}

/**
 * Set tenant-specific debug configuration
 * Updates existing configuration or creates new one
 */
export function setTenantDebugConfig(tenantId: string, config: Partial<TenantDebugConfig>): void {
  const currentConfig = getTenantDebugConfig(tenantId)
  TENANT_DEBUG_CONFIGS.set(tenantId, { ...currentConfig, ...config })
}

/**
 * Set individual tenant debug category
 * Used by runtime control operations
 */
export function setTenantDebugCategory(tenantId: string, category: string, enabled: boolean): void {
  const currentConfig = getTenantDebugConfig(tenantId)
  if (category in currentConfig) {
    currentConfig[category as keyof TenantDebugConfig] = enabled
    TENANT_DEBUG_CONFIGS.set(tenantId, currentConfig)
  }
}

/**
 * Create RDCP standard tenant response object
 * Wraps response with tenant context when multi-tenancy is active
 */
export function createTenantResponse<T extends Record<string, any>>(
  response: T, 
  tenantContext: RDCPTenantContext
): T & { tenant: TenantContext } {
  const scope = tenantContext.isolationLevel === 'global' ? 'global' : 'tenant-isolated'
  
  return {
    ...response,
    tenant: {
      id: tenantContext.tenantId,
      isolationLevel: tenantContext.isolationLevel,
      scope,
      name: tenantContext.tenantName
    }
  }
}

/**
 * Tenant configuration with ID and isolation level
 */
export interface TenantConfigInfo {
  tenantId: string
  config: TenantDebugConfig
  isolationLevel: 'global' | 'process' | 'namespace' | 'organization'
}

/**
 * Get all tenant configurations
 * Used for admin/management purposes
 */
export function getAllTenantConfigs(): TenantConfigInfo[] {
  const configs: TenantConfigInfo[] = []
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
 */
export function clearTenantConfig(tenantId: string): boolean {
  return TENANT_DEBUG_CONFIGS.delete(tenantId)
}