/**
 * @fileoverview Working Express example using RDCP SDK
 * Demonstrates actual working implementation
 */

const express = require('express')
const { adapters } = require('../src/index.js')

const app = express()
app.use(express.json())

// Simple API key authenticator
const authenticator = async (req) => {
  const apiKey = req.headers['x-api-key']
  // In production, use secure comparison
  return apiKey === 'demo-key-change-in-production-min-32-chars'
}

// Add RDCP middleware
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator,
  debugConfig: {
    DATABASE: false,
    API_ROUTES: true,
    QUERIES: false
  }
})

app.use(rdcpMiddleware)

// Add a test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Express server with RDCP support' })
})

const PORT = process.env.PORT || 3000

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Express server with RDCP running on port ${PORT}`)
    console.log(`📋 Test RDCP endpoints:`)
    console.log(`   /.well-known/rdcp (no auth)`)
    console.log(`   /rdcp/v1/discovery (needs X-API-Key header)`) 
    console.log(`   /rdcp/v1/status (needs X-API-Key header)`)
    console.log(`   /rdcp/v1/health (needs X-API-Key header)`)
    console.log(`   /rdcp/v1/control (POST, needs X-API-Key header)`)
    console.log(`\n🔑 Use X-API-Key: demo-key-change-in-production-min-32-chars`)
  })
}

module.exports = app