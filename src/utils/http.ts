import fetch from 'node-fetch'
import { AuthConfig, AuthHeaders, RDCPError, RDCP_ERROR_CODES } from './types.js'

// RDCP HTTP Client - Protocol compliant request handling
export class RDCPHttpClient {
  private baseUrl: string
  private auth: AuthConfig
  private timeout: number
  private retries: number

  constructor(
    baseUrl: string,
    auth: AuthConfig,
    options: { timeout?: number; retries?: number } = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.auth = auth
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 3
  }

  // Generate authentication headers based on security level
  private generateAuthHeaders(): AuthHeaders {
    const headers: AuthHeaders = {
      'Content-Type': 'application/json',
      'X-RDCP-Client-ID': 'rdcp-sdk-js',
      'X-RDCP-Request-ID': this.generateRequestId(),
    }

    // Add method-specific headers based on auth level
    switch (this.auth.level) {
      case 'basic':
        if (this.auth.apiKey) {
          headers['X-API-Key'] = this.auth.apiKey
          headers['X-RDCP-Auth-Method'] = 'api-key'
          headers['X-RDCP-Key-Version'] = 'v1'
        }
        break

      case 'standard':
        if (this.auth.bearerToken) {
          headers['Authorization'] = `Bearer ${this.auth.bearerToken}`
          headers['X-RDCP-Auth-Method'] = 'bearer'
          headers['X-RDCP-Token-Type'] = 'jwt'
        }
        break

      case 'enterprise':
        if (this.auth.clientCert) {
          // mTLS headers (implementation depends on certificate handling)
          headers['X-RDCP-Auth-Method'] = 'mtls'
          headers['X-Client-Cert'] = Buffer.from(
            this.auth.clientCert.cert
          ).toString('base64')
        }
        if (this.auth.bearerToken) {
          // Hybrid mode: mTLS + JWT
          headers['Authorization'] = `Bearer ${this.auth.bearerToken}`
          headers['X-RDCP-Auth-Method'] = 'hybrid'
        }
        break
    }

    return headers
  }

  // Add tenant context headers if configured
  public addTenantHeaders(
    headers: AuthHeaders,
    tenant?: {
      id: string
      isolationLevel?: string
      name?: string
    }
  ): AuthHeaders {
    if (tenant) {
      headers['X-RDCP-Tenant-ID'] = tenant.id
      if (tenant.isolationLevel) {
        headers['X-RDCP-Isolation-Level'] = tenant.isolationLevel
      }
      if (tenant.name) {
        headers['X-RDCP-Tenant-Name'] = tenant.name
      }
    }
    return headers
  }

  // Generate unique request ID for audit trails
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate response contains required RDCP protocol field
  private validateRDCPResponse(data: unknown): void {
    if (
      !data ||
      typeof data !== 'object' ||
      !('protocol' in data) ||
      (data as { protocol: string }).protocol !== 'rdcp/1.0'
    ) {
      throw new Error('Invalid RDCP response: missing or incorrect protocol')
    }
  }

  // Handle RDCP error responses
  private handleRDCPError(status: number, data: unknown): never {
    if (data && typeof data === 'object' && 'error' in data) {
      const error = (data as RDCPError).error
      throw new RDCPClientError(error.code, error.message, status, error.details)
    }

    // Fallback error handling
    const errorCode = this.getErrorCodeFromStatus(status)
    throw new RDCPClientError(
      errorCode,
      `HTTP ${status} error`,
      status
    )
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 401:
        return RDCP_ERROR_CODES.AUTH_REQUIRED
      case 403:
        return RDCP_ERROR_CODES.FORBIDDEN
      case 404:
        return RDCP_ERROR_CODES.NOT_FOUND
      case 400:
        return RDCP_ERROR_CODES.VALIDATION_ERROR
      case 429:
        return RDCP_ERROR_CODES.RATE_LIMITED
      default:
        return RDCP_ERROR_CODES.INTERNAL_ERROR
    }
  }

  // Execute HTTP request with retry logic and protocol validation
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
    tenant?: {
      id: string
      isolationLevel?: string
      name?: string
    }
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        let headers = this.generateAuthHeaders()

        // Add tenant context if provided
        if (tenant) {
          headers = this.addTenantHeaders(headers, tenant)
        }

        // Add any additional headers
        if (additionalHeaders) {
          headers = { ...headers, ...additionalHeaders }
        }

        const url = `${this.baseUrl}${endpoint}`
        const config = {
          method,
          headers,
          timeout: this.timeout,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }

        const response = await fetch(url, config)
        const data = (await response.json()) as unknown

        if (!response.ok) {
          this.handleRDCPError(response.status, data)
        }

        // Validate RDCP protocol compliance
        this.validateRDCPResponse(data)

        return data as T
      } catch (error) {
        lastError = error as Error

        // Don't retry on authentication or validation errors
        if (
          error instanceof RDCPClientError &&
          (error.code === RDCP_ERROR_CODES.AUTH_REQUIRED ||
            error.code === RDCP_ERROR_CODES.FORBIDDEN ||
            error.code === RDCP_ERROR_CODES.VALIDATION_ERROR)
        ) {
          throw error
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.retries) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError!
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Custom error class for RDCP client errors
export class RDCPClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RDCPClientError'
  }
}