import { RDCPHttpClient } from '../utils/http.js'
import {
  RDCPClientConfig,
  RDCPDiscoveryResponse,
  DebugDiscoveryResponse,
  ControlRequest,
  ControlResponse,
  StatusResponse,
  HealthResponse,
} from '../utils/types.js'

/**
 * RDCP Client SDK - Protocol compliant client for RDCP v1.0
 *
 * Implements all required RDCP endpoints with strict protocol compliance.
 * Supports all three security levels: basic, standard, enterprise.
 * Handles multi-tenancy and provides comprehensive error handling.
 */
export class RDCPClient {
  private httpClient: RDCPHttpClient
  private config: RDCPClientConfig
  private discoveryCache?: RDCPDiscoveryResponse | undefined
  private cacheExpiry?: number | undefined

  constructor(config: RDCPClientConfig) {
    this.config = config
    this.validateConfig(config)

    this.httpClient = new RDCPHttpClient(config.baseUrl, config.auth, {
      ...(config.timeout !== undefined && { timeout: config.timeout }),
      ...(config.retries !== undefined && { retries: config.retries }),
    })
  }

  private validateConfig(config: RDCPClientConfig): void {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required in RDCP client config')
    }

    if (!config.auth?.level) {
      throw new Error('auth configuration is required')
    }

    // Validate auth based on security level
    switch (config.auth.level) {
      case 'basic':
        if (!config.auth.apiKey || config.auth.apiKey.length < 32) {
          throw new Error(
            'API key must be at least 32 characters for basic auth'
          )
        }
        break
      case 'standard':
        if (!config.auth.bearerToken) {
          throw new Error('Bearer token is required for standard auth')
        }
        break
      case 'enterprise':
        if (!config.auth.clientCert && !config.auth.bearerToken) {
          throw new Error(
            'Client certificate or bearer token required for enterprise auth'
          )
        }
        break
    }
  }

  /**
   * Protocol Discovery - Get RDCP server capabilities
   * Endpoint: /.well-known/rdcp
   */
  async discover(useCache = true): Promise<RDCPDiscoveryResponse> {
    // Return cached result if valid and cache requested
    if (
      useCache &&
      this.discoveryCache &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    ) {
      return this.discoveryCache
    }

    const response = await this.httpClient.request<RDCPDiscoveryResponse>(
      'GET',
      '/.well-known/rdcp',
      undefined,
      undefined,
      this.config.tenant
    )

    // Cache for 5 minutes to reduce network calls
    this.discoveryCache = response
    this.cacheExpiry = Date.now() + 300000

    return response
  }

  /**
   * Debug System Discovery - Get debug categories and performance info
   * Endpoint: /rdcp/v1/discovery
   */
  async getDebugInfo(): Promise<DebugDiscoveryResponse> {
    return await this.httpClient.request<DebugDiscoveryResponse>(
      'GET',
      '/rdcp/v1/discovery',
      undefined,
      undefined,
      this.config.tenant
    )
  }

  /**
   * Runtime Control - Enable/disable debug categories
   * Endpoint: /rdcp/v1/control
   */
  async control(request: ControlRequest): Promise<ControlResponse> {
    // Validate control request
    this.validateControlRequest(request)

    return await this.httpClient.request<ControlResponse>(
      'POST',
      '/rdcp/v1/control',
      request,
      undefined,
      this.config.tenant
    )
  }

  /**
   * Enable debug categories
   */
  async enable(
    categories: string | string[],
    options?: ControlRequest['options']
  ): Promise<ControlResponse> {
    return this.control({
      action: 'enable',
      categories,
      options,
    })
  }

  /**
   * Disable debug categories
   */
  async disable(
    categories: string | string[],
    options?: ControlRequest['options']
  ): Promise<ControlResponse> {
    return this.control({
      action: 'disable',
      categories,
      options,
    })
  }

  /**
   * Toggle debug categories
   */
  async toggle(
    categories: string | string[],
    options?: ControlRequest['options']
  ): Promise<ControlResponse> {
    return this.control({
      action: 'toggle',
      categories,
      options,
    })
  }

  /**
   * Reset all debug categories to disabled state
   */
  async reset(options?: ControlRequest['options']): Promise<ControlResponse> {
    return this.control({
      action: 'reset',
      categories: '*',
      options,
    })
  }

  /**
   * Status Monitoring - Get current debug status
   * Endpoint: /rdcp/v1/status
   */
  async getStatus(): Promise<StatusResponse> {
    return await this.httpClient.request<StatusResponse>(
      'GET',
      '/rdcp/v1/status',
      undefined,
      undefined,
      this.config.tenant
    )
  }

  /**
   * Health Check - Get system health status
   * Endpoint: /rdcp/v1/health
   */
  async getHealth(): Promise<HealthResponse> {
    return await this.httpClient.request<HealthResponse>(
      'GET',
      '/rdcp/v1/health',
      undefined,
      undefined,
      this.config.tenant
    )
  }

  private validateControlRequest(request: ControlRequest): void {
    if (!request.action) {
      throw new Error('Control action is required')
    }

    if (!['enable', 'disable', 'toggle', 'reset'].includes(request.action)) {
      throw new Error('Invalid control action')
    }

    if (!request.categories) {
      throw new Error('Categories are required for control requests')
    }

    if (request.options?.duration && request.options.duration <= 0) {
      throw new Error('Duration must be positive if specified')
    }
  }

  /**
   * Test connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const discovery = await this.discover(false)

      // Try to access a protected endpoint
      await this.getStatus()

      return {
        success: true,
        message: `Connected to RDCP server (${discovery.security.level} security)`,
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown connection error',
      }
    }
  }

  /**
   * Get available debug categories
   */
  async getCategories(): Promise<
    Array<{ id: string; enabled: boolean; description: string }>
  > {
    const debugInfo = await this.getDebugInfo()
    return debugInfo.categories.map(cat => ({
      id: cat.id,
      enabled: cat.enabled,
      description: cat.description,
    }))
  }

  /**
   * Clear discovery cache to force fresh protocol discovery
   */
  clearCache(): void {
    this.discoveryCache = undefined
    this.cacheExpiry = undefined
  }
}
