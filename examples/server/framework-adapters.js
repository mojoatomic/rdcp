/**
 * @fileoverview Examples of using RDCP server with different frameworks
 * Demonstrates Express, Fastify, and Koa adapters with authentication
 */

// Express Example
async function expressExample() {
  const express = require('express')
  const { basicApiKeyAuth } = require('../../src/auth/basic.js')
  const { express: expressAdapter } = require('../../src/server/adapters/index.js')

  const app = express()
  app.use(express.json())

  // Create basic API key authenticator
  const authenticator = basicApiKeyAuth({
    apiKey: process.env.RDCP_API_KEY || 'your-32-character-api-key-here12'
  })

  // Create RDCP middleware for Express
  const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
    authenticator,
    debugConfig: {
      categories: ['DATABASE', 'API_ROUTES', 'QUERIES'],
      enabled: true
    },
    performance: {
      enabled: true,
      thresholds: { slow: 100, critical: 500 }
    }
  })

  // Apply RDCP middleware
  app.use(rdcpMiddleware)

  // Regular application routes
  app.get('/', (req, res) => {
    res.json({ message: 'Express app with RDCP support' })
  })

  return app
}

// Fastify Example
async function fastifyExample() {
  const fastify = require('fastify')({ logger: true })
  const { basicApiKeyAuth } = require('../../src/auth/basic.js')
  const { fastify: fastifyAdapter } = require('../../src/server/adapters/index.js')

  // Parse JSON bodies
  await fastify.register(require('@fastify/formbody'))

  // Create basic API key authenticator (adapted for Fastify request object)
  const authenticator = (request) => {
    return basicApiKeyAuth({
      apiKey: process.env.RDCP_API_KEY || 'your-32-character-api-key-here12'
    })(request)
  }

  // Create RDCP plugin for Fastify
  const rdcpPlugin = fastifyAdapter.createRDCPPlugin({
    authenticator,
    debugConfig: {
      categories: ['DATABASE', 'CACHE', 'INTEGRATIONS'],
      enabled: true
    },
    tenant: {
      supported: true,
      defaultIsolation: 'namespace'
    }
  })

  // Register RDCP plugin
  await fastify.register(rdcpPlugin)

  // Regular application routes
  fastify.get('/', async (request, reply) => {
    return { message: 'Fastify app with RDCP support' }
  })

  return fastify
}

// Koa Example
async function koaExample() {
  const Koa = require('koa')
  const bodyParser = require('koa-bodyparser')
  const { basicApiKeyAuth } = require('../../src/auth/basic.js')
  const { koa: koaAdapter } = require('../../src/server/adapters/index.js')

  const app = new Koa()
  
  // Parse JSON bodies
  app.use(bodyParser())

  // Create basic API key authenticator (adapted for Koa context)
  const authenticator = (ctx) => {
    // Convert Koa context to request-like object
    const requestLike = {
      headers: ctx.headers,
      get: (header) => ctx.get(header)
    }
    return basicApiKeyAuth({
      apiKey: process.env.RDCP_API_KEY || 'your-32-character-api-key-here12'
    })(requestLike)
  }

  // Create RDCP middleware for Koa
  const rdcpMiddleware = koaAdapter.createRDCPMiddlewareWithErrorBoundary({
    authenticator,
    debugConfig: {
      categories: ['API_ROUTES', 'AUTH', 'REPORTS'],
      enabled: true
    },
    performance: {
      enabled: true,
      sampling: 0.1 // Sample 10% of requests
    }
  })

  // Apply RDCP middleware
  app.use(rdcpMiddleware)

  // Regular application routes
  app.use(async (ctx, next) => {
    if (ctx.path === '/' && ctx.method === 'GET') {
      ctx.body = { message: 'Koa app with RDCP support' }
    } else {
      await next()
    }
  })

  return app
}

// Multi-Framework Server Example
async function multiFrameworkExample() {
  console.log('Starting multi-framework RDCP example servers...')

  // Start Express server
  const expressApp = await expressExample()
  expressApp.listen(3001, () => {
    console.log('Express RDCP server running on port 3001')
    console.log('RDCP endpoints: http://localhost:3001/.well-known/rdcp')
  })

  // Start Fastify server
  const fastifyApp = await fastifyExample()
  fastifyApp.listen({ port: 3002 }, (err) => {
    if (err) throw err
    console.log('Fastify RDCP server running on port 3002')
    console.log('RDCP endpoints: http://localhost:3002/.well-known/rdcp')
  })

  // Start Koa server
  const koaApp = await koaExample()
  koaApp.listen(3003, () => {
    console.log('Koa RDCP server running on port 3003')
    console.log('RDCP endpoints: http://localhost:3003/.well-known/rdcp')
  })
}

// Advanced authentication example with JWT
async function advancedAuthExample() {
  const express = require('express')
  const { standardJWTAuth } = require('../../src/auth/standard.js')
  const { express: expressAdapter } = require('../../src/server/adapters/index.js')

  const app = express()
  app.use(express.json())

  // Create JWT authenticator
  const authenticator = standardJWTAuth({
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
    requiredScopes: ['rdcp:read', 'rdcp:control']
  })

  // Create RDCP middleware with JWT auth
  const rdcpMiddleware = expressAdapter.createRDCPMiddleware({
    authenticator,
    debugConfig: {
      categories: ['DATABASE', 'API_ROUTES', 'AUTH'],
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
    res.json({ message: 'Express app with JWT RDCP auth' })
  })

  return app
}

module.exports = {
  expressExample,
  fastifyExample,
  koaExample,
  multiFrameworkExample,
  advancedAuthExample
}

// Run examples if called directly
if (require.main === module) {
  multiFrameworkExample().catch(console.error)
}