/**
 * @fileoverview Framework adapters for RDCP server middleware
 * Exports all framework-specific middleware adapters with proper TypeScript types
 *
 * Context7 Compliance:
 * - Uses ESM export patterns with proper TypeScript interfaces
 * - Provides comprehensive type definitions for all adapters
 * - Follows TypeScript module export best practices
 * - Ensures framework-specific types are properly exposed
 *
 * @example
 * ```typescript
 * // Import specific adapter
 * import { createRDCPMiddleware as fastifyRDCP } from '@rdcp/server/adapters/fastify'
 *
 * // Or import all adapters
 * import * as adapters from '@rdcp/server/adapters'
 * const middleware = adapters.fastify.createRDCPMiddleware(options)
 * ```
 */

// Import all adapter modules with their types
import * as express from './express.js'
import * as fastify from './fastify.js'
import * as koa from './koa.js'

/**
 * Framework adapter exports with proper TypeScript types
 * Following Context7 patterns for module organization
 */
export { express, fastify, koa }

/**
 * Default export for CommonJS compatibility
 * Maintains backward compatibility while providing TypeScript safety
 */
export default {
  express,
  fastify,
  koa,
}

/**
 * Re-export specific adapter functions for convenience
 * Following Context7 patterns for flexible imports
 */
export { createRDCPMiddleware as createExpressMiddleware } from './express.js'
export { createRDCPPlugin as createFastifyPlugin } from './fastify.js'
export { createRDCPMiddleware as createKoaMiddleware } from './koa.js'

/**
 * Type definitions for all adapters
 * Following Context7 patterns for comprehensive typing
 */
export type {
  RDCPAuthenticator as RDCPExpressAuthenticator,
  RDCPMiddlewareOptions as RDCPExpressMiddlewareOptions,
} from './express.js'

export type {
  RDCPFastifyAuthenticator,
  RDCPFastifyPluginOptions,
} from './fastify.js'

export type { RDCPKoaAuthenticator, RDCPKoaMiddlewareOptions } from './koa.js'
