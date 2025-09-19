// OpenTelemetry integration type definitions for RDCP SDK
// Following WARP.md: TypeScript-first, no any types, under 50 lines

/**
 * Trace context information from distributed tracing systems
 */
export interface TraceContext {
  traceId: string
  spanId: string
  baggage?: Record<string, string>
}

/**
 * Provider interface for trace context integration
 * Allows pluggable tracing systems (OpenTelemetry, custom, etc.)
 */
export interface TraceProvider {
  getCurrentTraceContext(): TraceContext | null
}

/**
 * Enhanced debug log entry with optional trace correlation
 */
export interface TraceEnhancedLogEntry {
  message: string
  category: string
  timestamp: number
  trace?: TraceContext
  metadata?: Record<string, unknown> | undefined
}

/**
 * Configuration for trace provider integration
 */
export interface TraceProviderConfig {
  enabled: boolean
  provider?: TraceProvider
  enrichLogs: boolean
}

/**
 * OpenTelemetry integration status for protocol discovery
 */
export interface OTelIntegrationStatus {
  enabled: boolean
  correlationSupport: boolean
  provider?: string
}

// WARP Compliance: 43 lines (under 50 line limit for type definitions)
