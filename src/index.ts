/**
 * @fileoverview RDCP SDK main exports
 * Public API for the RDCP TypeScript SDK
 * Combined JavaScript and TypeScript exports for backward compatibility
 */

// ============================================================================
// Core RDCP Types and Interfaces (primary source)
// ============================================================================

export * from './types/index.js'

// ============================================================================
// Authentication System
// ============================================================================

export { validateRDCPAuth } from './auth/index.js'
export * from './auth/basic.js'
export * from './auth/standard.js'
export * from './auth/enterprise.js'

// ============================================================================
// RDCP Endpoints
// ============================================================================

export {
  protocolDiscovery,
  debugSystemDiscovery,
} from './endpoints/discovery.js'
export { runtimeControl } from './endpoints/control.js'
export * from './endpoints/status.js'
export * from './endpoints/health.js'
export * from './endpoints/protocol-discovery.js'

// ============================================================================
// Validation System (schemas and functions only, types come from /types/)
// ============================================================================

export {
  // Zod schemas
  protocolVersionSchema,
  controlRequestSchema,
  controlResponseSchema,
  discoveryResponseSchema,
  statusResponseSchema,
  healthResponseSchema,
  protocolDiscoverySchema,
  errorResponseSchema,
  safeValidate,
  // Error handling
  RDCP_ERROR_CODES,
  createRDCPError,
  createRDCPErrorWithStatus,
  createValidationError,
  createAuthError,
  isValidRDCPErrorCode,
  RDCPErrorClass,
  // Middleware
  validateControlRequest,
  validateRequest,
  handleValidationError,
  // Response creators
  createRDCPResponse,
  createControlResponse,
  createDiscoveryResponse,
  createStatusResponse,
  createHealthResponse,
  createProtocolDiscoveryResponse,
} from './validation/index.js'

// ============================================================================
// Utilities (specific exports to avoid conflicts)
// ============================================================================

export {
  // HTTP Client
  RDCPHttpClient,
  RDCPClientError,
  // Tenant utilities
  extractTenantContext,
  createTenantResponse,
  getTenantDebugConfig,
  setTenantDebugConfig,
  getAllTenantConfigs,
  clearTenantConfig,
} from './utils/index.js'

// ============================================================================
// Middleware
// ============================================================================

export { rdcpMiddleware } from './middleware.js'
export type { RDCPRequest } from './middleware.js'

// ============================================================================
// Client SDK
// ============================================================================

export * from './client/index.js'

// ============================================================================
// Debug System
// ============================================================================

export * from './debug.js'

// ============================================================================
// Legacy Compatibility Exports (CommonJS-style)
// ============================================================================

import { RDCPHttpClient } from './utils/http.js'
import { extractTenantContext, createTenantResponse } from './utils/tenant.js'
import { createRDCPError } from './validation/errors.js'
import { validateRDCPAuth } from './auth/index.js'
import { extractApiKey as extractApiKeyFromBasic } from './auth/basic.js'

/**
 * Framework adapters interface for legacy compatibility
 * Note: Actual adapter files are in JavaScript and will be converted separately
 */
export interface FrameworkAdapters {
  express?: unknown // Will be typed properly when converted
  fastify?: unknown // Will be typed properly when converted
  koa?: unknown // Will be typed properly when converted
}

// Framework Adapters - properly imported using named imports following Context7 TypeScript ESM patterns
// Using .js extensions as required for TypeScript ESM (imports from compiled .js output)
import {
  createRDCPMiddleware as createExpressMiddleware,
  createRDCPRouter,
  createRDCPErrorHandler,
} from './server/adapters/express.js'
import {
  createRDCPMiddleware as createFastifyMiddleware,
  createRDCPPlugin,
} from './server/adapters/fastify.js'
import {
  createRDCPMiddleware as createKoaMiddleware,
  createRDCPMiddlewareWithErrorBoundary,
} from './server/adapters/koa.js'

/**
 * Framework adapters organized by framework following Context7 patterns
 * Each adapter exports its specific functions with proper TypeScript types
 */
export const adapters = {
  express: {
    createRDCPMiddleware: createExpressMiddleware,
    createRDCPRouter,
    createRDCPErrorHandler,
  },
  fastify: {
    createRDCPMiddleware: createFastifyMiddleware,
    createRDCPPlugin,
  },
  koa: {
    createRDCPMiddleware: createKoaMiddleware,
    createRDCPMiddlewareWithErrorBoundary,
  },
}

/**
 * Auth utilities organized following Context7 patterns
 */
export const auth = {
  validateRDCPAuth,
  basicAuthenticator: validateRDCPAuth,
  extractApiKey: (req: unknown): string | undefined => {
    // Delegate to the robust extractor used by the basic authenticator
    // Accept a minimal shape to satisfy typing while reusing logic
    const requestLike = req as unknown as { headers: unknown }
    return extractApiKeyFromBasic(
      requestLike as unknown as import('express').Request
    )
  },
}

/**
 * Utilities organized following Context7 patterns
 */
export const utils = {
  RDCPHttpClient,
  extractTenantContext,
  createTenantResponse,
  createRDCPError,
}

/**
 * Legacy compatibility object for JavaScript consumers
 * Provides CommonJS-style exports for backward compatibility
 */
export const rdcpSdk = {
  // Core functionality
  validateRDCPAuth,
  createRDCPError,
  RDCPHttpClient,

  // Tenant utilities
  extractTenantContext,
  createTenantResponse,

  // Organized exports
  adapters,
  auth,
  utils,
}

// Export rdcpSdk as the main export (no default export to avoid mixed exports warning)
export { rdcpSdk as main }
