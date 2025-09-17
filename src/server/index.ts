/**
 * @fileoverview RDCP server utilities
 * Provides RDCPServer class with tenant-aware endpoint handling
 * Following RDCP v1.0 protocol specification
 */

import { 
  extractTenantContext, 
  getTenantDebugConfig, 
  setTenantDebugConfig,
  createTenantResponse, 
  RDCPTenantContext,
  TenantDebugConfig
} from '../utils/tenant.js'
import { createRDCPError } from '../validation/errors.js'
import { RDCPResponse, TenantContext } from '../utils/types.js'

/**
 * RDCP Server configuration options
 */
export interface RDCPServerOptions {
  debugConfig?: Record<string, boolean>
  performance?: Record<string, unknown>
  tenant?: Record<string, unknown>
}

/**
 * Discovery endpoint options
 */
interface DiscoveryOptions {
  basePath?: string
  tenant?: RDCPTenantContext
}

/**
 * RDCP Discovery response structure
 */
interface RDCPDiscoveryResponse extends RDCPResponse {
  endpoints: {
    discovery: string
    control: string
    status: string
    health: string
  }
  capabilities: {
    authentication: string[]
    isolation: string[]
    categories: string[]
  }
  tenant?: TenantContext
}

/**
 * Control request body structure
 */
interface ControlRequestBody {
  action: string
  categories?: string[]
}

/**
 * Control response change
 */
interface ControlChange {
  category: string
  action: 'enabled' | 'disabled'
  tenantScope: string
  isolationLevel: string
}

/**
 * RDCP Control response structure
 */
interface RDCPControlResponse extends RDCPResponse {
  tenant: TenantContext
  changes: ControlChange[]
  status: 'success' | 'failed'
}

/**
 * Category status information
 */
interface CategoryStatus {
  enabled: boolean
  tenantScope: string
}

/**
 * RDCP Status response structure
 */
interface RDCPStatusResponse extends RDCPResponse {
  tenant: TenantContext
  categories: Record<string, CategoryStatus>
  performance: {
    impact: {
      cpu: string
      memory: string
    }
    activeCategories: number
  }
}

/**
 * RDCP Health response structure
 */
interface RDCPHealthResponse extends RDCPResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  system: {
    nodeVersion: string
    platform: string
    arch: string
  }
}

/**
 * RDCP Server utility class
 * Handles all RDCP v1.0 endpoints with tenant context support
 */
export class RDCPServer {
  private debugConfig: Record<string, boolean>
  private performance: Record<string, unknown>
  private tenant: Record<string, unknown>

  constructor(options: RDCPServerOptions = {}) {
    this.debugConfig = options.debugConfig || {}
    this.performance = options.performance || {}
    this.tenant = options.tenant || {}
  }

  /**
   * Handle RDCP discovery endpoint
   * Returns available endpoints and capabilities
   */
  handleDiscovery(options: DiscoveryOptions = {}): RDCPDiscoveryResponse {
    const { basePath = '/rdcp/v1', tenant } = options

    const response: RDCPDiscoveryResponse = {
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
   */
  async handleControl(body: ControlRequestBody, tenantContext: RDCPTenantContext): Promise<RDCPControlResponse | ReturnType<typeof createRDCPError>> {
    const { action, categories = [] } = body
    
    if (!action) {
      return createRDCPError('RDCP_VALIDATION_ERROR', 'Missing action parameter')
    }

    // Get tenant-specific configuration
    const tenantConfig = getTenantDebugConfig(tenantContext.tenantId)
    const changes: ControlChange[] = []

    try {
      switch (action) {
        case 'enable':
          categories.forEach(category => {
            if (category in tenantConfig) {
              const updatedConfig: Partial<TenantDebugConfig> = { [category]: true }
              setTenantDebugConfig(tenantContext.tenantId, updatedConfig)
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
              const updatedConfig: Partial<TenantDebugConfig> = { [category]: false }
              setTenantDebugConfig(tenantContext.tenantId, updatedConfig)
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return createRDCPError('RDCP_SERVER_ERROR', `Control operation failed: ${errorMessage}`)
    }
  }

  /**
   * Handle RDCP status endpoint
   * Returns current debug status with tenant isolation
   */
  handleStatus(tenantContext: RDCPTenantContext): RDCPStatusResponse {
    // Get tenant-specific configuration
    const tenantConfig = getTenantDebugConfig(tenantContext.tenantId)
    
    const categories: Record<string, CategoryStatus> = {}
    Object.keys(tenantConfig).forEach(category => {
      categories[category] = {
        enabled: tenantConfig[category as keyof TenantDebugConfig],
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
        activeCategories: Object.keys(tenantConfig).filter(cat => tenantConfig[cat as keyof TenantDebugConfig]).length
      }
    }
  }

  /**
   * Handle RDCP health endpoint
   * Returns system health status (global, not tenant-specific)
   */
  handleHealth(): RDCPHealthResponse {
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