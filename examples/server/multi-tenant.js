/**
 * @fileoverview Multi-tenant RDCP examples
 * Demonstrates tenant context integration with different auth systems
 * Following RDCP v1.0 protocol specification patterns
 */

const express = require('express')
const { basicApiKeyAuth } = require('../../src/auth/basic.js')
const { standardJWTAuth } = require('../../src/auth/standard.js')
const { express: expressAdapter } = require('../../src/server/adapters/index.js')
const { extractTenantContext } = require('../../src/utils/tenant.js')

// Example 1: JWT-Based Multi-Tenancy (following implementation guide pattern)
function createJWTTenantExample() {
  const app = express()
  app.use(express.json())

  // JWT authenticator that includes tenant context
  const authenticator = (req) => {
    // First authenticate the JWT
    const jwtAuth = standardJWTAuth({
      jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
      requiredScopes: ['rdcp:read', 'rdcp:control']
    })
    
    return jwtAuth(req).then(isValid => {
      if (!isValid) return false
      
      // Extract tenant from JWT payload and set RDCP standard headers
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        try {
          // Mock JWT decode - in real app use proper JWT library
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
          
          // Set RDCP standard headers from JWT (implementation guide pattern)
          req.headers['x-rdcp-tenant-id'] = payload.org_id || payload.tenant_id || 'default'
          req.headers['x-rdcp-isolation-level'] = 'organization'
          req.headers['x-rdcp-tenant-name'] = payload.org_name || payload.tenant_name
        } catch (e) {
          console.warn('Failed to extract tenant from JWT:', e.message)
        }
      }
      
      return true
    })
  }

  // Create RDCP middleware with tenant support
  const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
    authenticator,
    debugConfig: {
      categories: ['DATABASE', 'API_ROUTES', 'QUERIES'],
      enabled: true
    },
    tenant: {
      supported: true,
      defaultIsolation: 'organization',
      enforceIsolation: true
    }
  })

  app.use(rdcpMiddleware)

  app.get('/', (req, res) => {
    res.json({ 
      message: 'JWT Multi-tenant RDCP server',
      tenant: extractTenantContext(req)
    })
  })

  return app
}

// Example 2: Session-Based Multi-Tenancy (implementation guide pattern)
function createSessionTenantExample() {
  const app = express()
  app.use(express.json())

  // Mock session middleware
  app.use((req, res, next) => {
    // Mock session data
    req.session = {
      userId: 'user_123',
      organizationId: 'org_456',
      organizationName: 'Acme Corp'
    }
    next()
  })

  const authenticator = (req) => {
    // Check session authentication
    if (!req.session?.userId) {
      return Promise.resolve(false)
    }

    // Set RDCP standard headers from session (implementation guide pattern)
    req.headers['x-rdcp-tenant-id'] = req.session.organizationId || 'default'
    req.headers['x-rdcp-isolation-level'] = 'organization'
    req.headers['x-rdcp-tenant-name'] = req.session.organizationName

    return Promise.resolve(true)
  }

  const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
    authenticator,
    debugConfig: {
      categories: ['DATABASE', 'CACHE', 'INTEGRATIONS'],
      enabled: true
    }
  })

  app.use(rdcpMiddleware)

  app.get('/', (req, res) => {
    res.json({ 
      message: 'Session Multi-tenant RDCP server',
      session: req.session,
      tenant: extractTenantContext(req)
    })
  })

  return app
}

// Example 3: API Key Multi-Tenancy (implementation guide pattern)
function createAPIKeyTenantExample() {
  const app = express()
  app.use(express.json())

  // Mock API key metadata lookup
  const API_KEY_METADATA = {
    'tenant-a-32-char-api-key-here123': {
      tenantId: 'tenant_a',
      tenantName: 'Tenant A Corp',
      isolationLevel: 'organization'
    },
    'tenant-b-32-char-api-key-here456': {
      tenantId: 'tenant_b', 
      tenantName: 'Tenant B Inc',
      isolationLevel: 'namespace'
    }
  }

  const authenticator = (req) => {
    // First validate API key
    const apiKey = req.headers['x-api-key']
    if (!apiKey || !API_KEY_METADATA[apiKey]) {
      return Promise.resolve(false)
    }

    // Get tenant metadata from API key
    const metadata = API_KEY_METADATA[apiKey]
    
    // Set RDCP standard headers from API key metadata (implementation guide pattern)
    req.headers['x-rdcp-tenant-id'] = metadata.tenantId
    req.headers['x-rdcp-isolation-level'] = metadata.isolationLevel
    req.headers['x-rdcp-tenant-name'] = metadata.tenantName

    return Promise.resolve(true)
  }

  const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
    authenticator,
    debugConfig: {
      categories: ['API_ROUTES', 'AUTH', 'REPORTS'],
      enabled: true
    }
  })

  app.use(rdcpMiddleware)

  app.get('/', (req, res) => {
    res.json({ 
      message: 'API Key Multi-tenant RDCP server',
      tenant: extractTenantContext(req)
    })
  })

  return app
}

// Example 4: Multi-Framework Multi-Tenant Servers
async function runMultiTenantExample() {
  console.log('Starting multi-tenant RDCP example servers...')

  // JWT-based server on port 4001
  const jwtApp = createJWTTenantExample()
  jwtApp.listen(4001, () => {
    console.log('JWT Multi-tenant RDCP server running on port 4001')
    console.log('Test: curl -H "Authorization: Bearer <jwt>" http://localhost:4001/.well-known/rdcp')
  })

  // Session-based server on port 4002
  const sessionApp = createSessionTenantExample()
  sessionApp.listen(4002, () => {
    console.log('Session Multi-tenant RDCP server running on port 4002')
    console.log('Test: curl http://localhost:4002/.well-known/rdcp')
  })

  // API key-based server on port 4003
  const apiKeyApp = createAPIKeyTenantExample()
  apiKeyApp.listen(4003, () => {
    console.log('API Key Multi-tenant RDCP server running on port 4003')
    console.log('Test: curl -H "X-API-Key: tenant-a-32-char-api-key-here123" http://localhost:4003/.well-known/rdcp')
  })

  // Print example requests
  console.log('\n--- Example Multi-Tenant Requests ---')
  console.log('\n1. Test tenant isolation with control endpoint:')
  console.log('curl -X POST -H "X-API-Key: tenant-a-32-char-api-key-here123" \\')
  console.log('  -H "Content-Type: application/json" \\')
  console.log('  -d \'{"action":"enable","categories":["DATABASE","API_ROUTES"]}\' \\')
  console.log('  http://localhost:4003/rdcp/v1/control')
  
  console.log('\n2. Check status for specific tenant:')
  console.log('curl -H "X-API-Key: tenant-a-32-char-api-key-here123" \\')
  console.log('  http://localhost:4003/rdcp/v1/status')
}

module.exports = {
  createJWTTenantExample,
  createSessionTenantExample,
  createAPIKeyTenantExample,
  runMultiTenantExample
}

// Run examples if called directly
if (require.main === module) {
  runMultiTenantExample().catch(console.error)
}