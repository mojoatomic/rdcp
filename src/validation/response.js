/**
 * @fileoverview RDCP response format utilities
 * Simple functions to format RDCP responses correctly
 */

/**
 * Creates standard RDCP response with protocol and timestamp
 */
function createRDCPResponse(data) {
  return {
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    ...data
  }
}

/**
 * Creates RDCP control response
 */
function createControlResponse(action, categories, status, changes = []) {
  return createRDCPResponse({
    action,
    categories: Array.isArray(categories) ? categories : [categories],
    status,
    changes
  })
}

/**
 * Creates RDCP discovery response
 */
function createDiscoveryResponse(categories, performance) {
  return createRDCPResponse({
    categories,
    performance
  })
}

/**
 * Creates RDCP status response
 */
function createStatusResponse(enabled, categories, performance) {
  return createRDCPResponse({
    enabled,
    categories,
    performance
  })
}

/**
 * Creates RDCP health response
 */
function createHealthResponse(status, checks) {
  return createRDCPResponse({
    status,
    checks
  })
}

/**
 * Creates protocol discovery response
 */
function createProtocolDiscoveryResponse(endpoints, capabilities, security) {
  return {
    protocol: 'rdcp/1.0',
    endpoints,
    capabilities,
    security
  }
}

module.exports = {
  createRDCPResponse,
  createControlResponse,
  createDiscoveryResponse,
  createStatusResponse,
  createHealthResponse,
  createProtocolDiscoveryResponse
}