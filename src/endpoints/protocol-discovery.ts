import { Request, Response } from 'express'
import { getTraceProviderStatus } from '../debug.js'

/**
 * Protocol Discovery Endpoint - /.well-known/rdcp
 * Per RDCP v1.0 Protocol Specification Section 5.1
 * Enhanced with OpenTelemetry integration status
 */
export function protocolDiscovery(req: Request, res: Response): void {
  const traceStatus = getTraceProviderStatus()

  const response = {
    protocol: 'rdcp/1.0',
    endpoints: {
      discovery: '/rdcp/v1/discovery',
      control: '/rdcp/v1/control',
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health',
    },
    capabilities: {
      multiTenancy: false, // Start with basic implementation
      performanceMetrics: true,
      temporaryControls: false, // Not implemented yet
      auditTrail: false, // Not implemented yet
    },
    security: {
      level: 'basic', // Current implementation level
      methods: ['api-key'], // Currently supported auth methods
      scopes: ['discovery', 'status', 'control', 'admin'],
      required: true, // Authentication is required
      keyRotation: false, // Not implemented yet
      tokenRefresh: false, // Not implemented yet
    },
    integrations: {
      opentelemetry: {
        enabled: traceStatus.enabled,
        correlationSupport: true,
        provider: traceStatus.provider,
      },
    },
  }

  res.json(response)
}
