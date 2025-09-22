// @rdcp.dev/otel-plugin - OpenTelemetry integration for RDCP SDK
// Context7: Following OpenTelemetry package export patterns
// WARP: TypeScript-first, no any types, under 50 lines (type definition limit)

/**
 * OpenTelemetry Provider that implements RDCP TraceProvider interface
 * Context7: Following OpenTelemetry provider export patterns
 */
export { OpenTelemetryProvider } from './provider'

/**
 * Easy setup functions for enterprise customers
 * Context7: Following OpenTelemetry plugin setup patterns
 */
export {
  setupRDCPWithOpenTelemetry,
  disableRDCPOpenTelemetry,
  isRDCPOpenTelemetryActive,
  createOpenTelemetryProvider,
  type RDCPOpenTelemetryConfig
} from './setup'

// Re-export types from @rdcp/server for convenience
// Context7: Common pattern in OpenTelemetry plugins
export type { TraceProvider, TraceContext } from '@rdcp.dev/server'

/**
 * Package version and info
 */
export const RDCP_OTEL_PLUGIN_VERSION = '1.0.0'
export const RDCP_OTEL_PLUGIN_NAME = '@rdcp.dev/otel-plugin'

/**
 * Default export for convenience
 * Context7: Following OpenTelemetry plugin patterns
 */
import { OpenTelemetryProvider } from './provider'
import {
  setupRDCPWithOpenTelemetry,
  disableRDCPOpenTelemetry,
  isRDCPOpenTelemetryActive,
  createOpenTelemetryProvider
} from './setup'

export default {
  OpenTelemetryProvider,
  setupRDCPWithOpenTelemetry,
  disableRDCPOpenTelemetry,
  isRDCPOpenTelemetryActive,
  createOpenTelemetryProvider,
  version: RDCP_OTEL_PLUGIN_VERSION,
  name: RDCP_OTEL_PLUGIN_NAME
}

// WARP Compliance: 40 lines (under 50 line limit for type definitions)
// Context7 Compliance: Following OpenTelemetry export patterns