/**
 * @fileoverview RDCP server utilities
 * Provides RDCPServer class with tenant-aware endpoint handling
 * Following RDCP v1.0 protocol specification
 */

import {
  getTenantDebugConfig,
  setTenantDebugConfig,
  createTenantResponse,
  RDCPTenantContext,
  TenantDebugConfig,
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
  capabilities?: {
    temporaryControls?: boolean
    ttl?: {
      enabled?: boolean
      minDurationMs?: number
      maxDurationMs?: number
      maxActiveTTLs?: number
    }
  }
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
 * (Removed unused interface)
 */

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
  private ttlTimers: Map<string, NodeJS.Timeout>
  private temporaryControlsEnabled: boolean
  private ttlConfig: {
    minDurationMs: number
    maxDurationMs: number
    maxActiveTTLs: number | null
  }

  constructor(options: RDCPServerOptions = {}) {
    this.debugConfig = options.debugConfig ?? {}
    this.performance = options.performance ?? {}
    this.tenant = options.tenant ?? {}

    this.temporaryControlsEnabled =
      options.capabilities?.temporaryControls === true ||
      options.capabilities?.ttl?.enabled === true

    const minDurationMs = options.capabilities?.ttl?.minDurationMs ?? 1
    // Default: 1 hour
    const maxDurationMs =
      options.capabilities?.ttl?.maxDurationMs ?? 60 * 60 * 1000
    const maxActiveTTLs = options.capabilities?.ttl?.maxActiveTTLs ?? null

    this.ttlTimers = new Map()
    this.ttlConfig = {
      minDurationMs,
      maxDurationMs,
      maxActiveTTLs,
    }
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
        health: `${basePath}/health`,
      },
      capabilities: {
        authentication: ['basic', 'standard', 'enterprise'],
        isolation: ['global', 'process', 'namespace', 'organization'],
        categories: [
          'DATABASE',
          'API_ROUTES',
          'QUERIES',
          'REPORTS',
          'CACHE',
          'AUTH',
          'INTEGRATIONS',
        ],
      },
    }

    // Include tenant context if provided
    if (tenant) {
      return createTenantResponse(response, tenant)
    }

    return response
  }

  /**
   * Handle RDCP control endpoint
   * Processes debug control operations with tenant isolation
   */
  async handleControl(
    body: unknown,
    tenantContext: RDCPTenantContext
  ): Promise<RDCPControlResponse | ReturnType<typeof createRDCPError>> {
    // Type guard to ensure body has expected shape
    const requestBody = body as {
      action?: string
      categories?: string[]
      options?: { temporary?: boolean; duration?: number | string }
    }
    const { action, categories = [], options } = requestBody

    if (!action) {
      return createRDCPError(
        'RDCP_VALIDATION_ERROR',
        'Missing action parameter'
      )
    }

    // Get tenant-specific configuration
    const tenantConfig = getTenantDebugConfig(tenantContext.tenantId)
    const changes: ControlChange[] = []

    try {
      switch (action) {
        case 'enable':
          categories.forEach(category => {
            if (category in tenantConfig) {
              const updatedConfig: Partial<TenantDebugConfig> = {
                [category]: true,
              }
              setTenantDebugConfig(tenantContext.tenantId, updatedConfig)
              changes.push({
                category,
                action: 'enabled',
                tenantScope: tenantContext.tenantId,
                isolationLevel: tenantContext.isolationLevel,
              })
              // Schedule TTL if enabled and requested
              if (this.temporaryControlsEnabled && options?.temporary) {
                const durationMs = this.parseDurationToMs(options.duration)
                if (
                  durationMs >= this.ttlConfig.minDurationMs &&
                  durationMs <= this.ttlConfig.maxDurationMs
                ) {
                  this.scheduleCategoryTTL(
                    tenantContext.tenantId,
                    category,
                    durationMs
                  )
                }
              }
            }
          })
          break

        case 'disable':
          categories.forEach(category => {
            if (category in tenantConfig) {
              const updatedConfig: Partial<TenantDebugConfig> = {
                [category]: false,
              }
              setTenantDebugConfig(tenantContext.tenantId, updatedConfig)
              // Clear any pending TTL timers
              this.clearCategoryTTL(tenantContext.tenantId, category)
              changes.push({
                category,
                action: 'disabled',
                tenantScope: tenantContext.tenantId,
                isolationLevel: tenantContext.isolationLevel,
              })
            }
          })
          break

        case 'reset': {
          // Disable all categories and clear TTLs for this tenant
          Object.keys(tenantConfig).forEach(category => {
            const updatedConfig: Partial<TenantDebugConfig> = {
              [category]: false,
            }
            setTenantDebugConfig(tenantContext.tenantId, updatedConfig)
            this.clearCategoryTTL(tenantContext.tenantId, category)
            changes.push({
              category,
              action: 'disabled',
              tenantScope: tenantContext.tenantId,
              isolationLevel: tenantContext.isolationLevel,
            })
          })
          break
        }

        default:
          return createRDCPError(
            'RDCP_VALIDATION_ERROR',
            `Unknown action: ${action}`
          )
      }

      const response = {
        protocol: 'rdcp/1.0' as const,
        timestamp: new Date().toISOString(),
        changes,
        status: 'success' as const,
      }

      return createTenantResponse(response, tenantContext)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return createRDCPError(
        'RDCP_SERVER_ERROR',
        `Control operation failed: ${errorMessage}`
      )
    }
  }

  private keyFor(tenantId: string, category: string): string {
    return `${tenantId}:${category}`
  }

  private parseDurationToMs(input: number | string | undefined): number {
    if (input === undefined) return 0
    if (typeof input === 'number' && Number.isFinite(input)) {
      return Math.max(0, Math.floor(input))
    }
    const s = String(input).trim()
    const m = s.match(/^(\d+)(ms|s|m)?$/)
    if (!m) return 0
    const value = parseInt(m[1], 10)
    const unit = m[2] || 'ms'
    if (unit === 'ms') return value
    if (unit === 's') return value * 1000
    if (unit === 'm') return value * 60 * 1000
    return 0
  }

  private scheduleCategoryTTL(
    tenantId: string,
    category: string,
    ms: number
  ): void {
    const key = this.keyFor(tenantId, category)
    const existing = this.ttlTimers.get(key)
    if (existing) clearTimeout(existing)

    if (this.ttlConfig.maxActiveTTLs !== null) {
      if (this.ttlTimers.size >= this.ttlConfig.maxActiveTTLs) {
        // Do not schedule if over capacity
        return
      }
    }

    const t = setTimeout(() => {
      try {
        const updatedConfig: Partial<TenantDebugConfig> = {
          [category]: false,
        }
        setTenantDebugConfig(tenantId, updatedConfig)
      } finally {
        this.ttlTimers.delete(key)
      }
    }, ms)

    this.ttlTimers.set(key, t)
  }

  private clearCategoryTTL(tenantId: string, category: string): void {
    const key = this.keyFor(tenantId, category)
    const t = this.ttlTimers.get(key)
    if (t) {
      clearTimeout(t)
      this.ttlTimers.delete(key)
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
        tenantScope: tenantContext.tenantId,
      }
    })

    const response = {
      protocol: 'rdcp/1.0' as const,
      timestamp: new Date().toISOString(),
      categories,
      performance: {
        impact: {
          cpu: '0.1%',
          memory: '1MB',
        },
        activeCategories: Object.keys(tenantConfig).filter(
          cat => tenantConfig[cat as keyof TenantDebugConfig]
        ).length,
      },
    }

    return createTenantResponse(response, tenantContext)
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
        arch: process.arch,
      },
    }
  }
}
