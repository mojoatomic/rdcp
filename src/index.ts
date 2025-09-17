/**
 * @fileoverview RDCP SDK TypeScript exports
 * Public API for the RDCP TypeScript SDK
 */

// Framework middleware
export { rdcpMiddleware } from './middleware.js'

// Authentication
export { validateRDCPAuth } from './auth/basic.js'

// Discovery endpoints
export { protocolDiscovery, debugSystemDiscovery } from './endpoints/discovery.js'

// Control endpoints
export { runtimeControl } from './endpoints/control.js'

// Types (from respective modules)
export type { RDCPRequest } from './middleware.js'
