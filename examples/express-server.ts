/**
 * @fileoverview Express server with RDCP support - TypeScript ESM implementation
 * Demonstrates RDCP v1.0 compliance with TypeScript and ESM imports
 * Follows WARP.md rules: no any types, strict TypeScript
 * Uses Context7 recommended Express import patterns with esModuleInterop
 */

import express from 'express'
import type { Request, Response, NextFunction, Application } from 'express'
import type { RDCPAuthResult } from '../src/auth/types.js'
import { validateRDCPAuth } from '../src/auth/index.js'
import { protocolDiscovery, debugSystemDiscovery } from '../src/endpoints/discovery.js'
import { runtimeControl } from '../src/endpoints/control.js'
import { debug, getDebugStatus } from '../src/debug.js'
import { createRDCPError } from '../src/validation/errors.js'

// Extend Express Request interface for RDCP auth context
declare global {
  namespace Express {
    interface Request {
      rdcpAuth?: RDCPAuthResult
    }
  }
}

const app: Application = express()
app.use(express.json())

// RDCP Authentication middleware following Context7 patterns
const rdcpAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip auth for protocol discovery endpoint (per RDCP spec)
  if (req.path === '/.well-known/rdcp') {
    return next()
  }
  
  // Validate RDCP authentication for all other endpoints
  const authResult = validateRDCPAuth(req)
  if (!authResult.valid) {
    res.status(401).json({
      error: {
        code: 'RDCP_AUTH_REQUIRED',
        message: authResult.error || 'Authentication required',
        protocol: 'rdcp/1.0'
      }
    })
    return
  }
  
  // Attach auth context to request for downstream use
  req.rdcpAuth = authResult
  next()
}

// Apply authentication middleware
app.use(rdcpAuthMiddleware)

// RDCP v1.0 Required Endpoints
app.get('/.well-known/rdcp', protocolDiscovery)
app.get('/rdcp/v1/discovery', debugSystemDiscovery)
app.post('/rdcp/v1/control', runtimeControl)

// Status endpoint
app.get('/rdcp/v1/status', (req: Request, res: Response): void => {
  const status = getDebugStatus()
  res.json({
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    categories: status
  })
})

// Health endpoint
app.get('/rdcp/v1/health', (req: Request, res: Response): void => {
  res.json({
    protocol: 'rdcp/1.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      debugSystem: 'operational',
      persistence: 'operational'
    }
  })
})

// Demo application routes
app.get('/', (req: Request, res: Response): void => {
  debug.api('Root endpoint accessed', { timestamp: Date.now() })
  res.json({ 
    message: 'Express server with RDCP v1.0 support',
    rdcpEndpoints: {
      protocolDiscovery: '/.well-known/rdcp',
      debugDiscovery: '/rdcp/v1/discovery',
      runtimeControl: '/rdcp/v1/control',
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health'
    }
  })
})

// Test endpoint to demonstrate debug categories
app.get('/test/database', (req: Request, res: Response): void => {
  debug.database('Database test endpoint accessed', { 
    query: 'SELECT * FROM test',
    timestamp: Date.now()
  })
  res.json({ message: 'Database test - check debug output' })
})

app.get('/test/cache', (req: Request, res: Response): void => {
  debug.cache('Cache test endpoint accessed', {
    key: 'test-key',
    hit: true,
    timestamp: Date.now()
  })
  res.json({ message: 'Cache test - check debug output' })
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Server error:', err)
  res.status(500).json(createRDCPError('RDCP_INTERNAL_ERROR', 'Internal server error'))
})

// Start server
const PORT = process.env.PORT || 3000

const server = app.listen(PORT, (): void => {
  console.log(`🚀 Express RDCP v1.0 server running on port ${PORT}`)
  console.log(``)
  console.log(`📋 RDCP Endpoints:`)
  console.log(`   GET  /.well-known/rdcp (no auth required)`)
  console.log(`   GET  /rdcp/v1/discovery (requires auth)`)
  console.log(`   POST /rdcp/v1/control (requires auth)`)
  console.log(`   GET  /rdcp/v1/status (requires auth)`)
  console.log(`   GET  /rdcp/v1/health (requires auth)`)
  console.log(``)
  console.log(`🔑 Authentication: Set environment variables:`)
  console.log(`   RDCP_API_KEY=your-32-character-or-longer-api-key`)
  console.log(`   RDCP_AUTH_LEVEL=basic (default)`)
  console.log(``)
  console.log(`🧪 Test endpoints:`)
  console.log(`   GET  / (demo)`)
  console.log(`   GET  /test/database (triggers debug.database if enabled)`)
  console.log(`   GET  /test/cache (triggers debug.cache if enabled)`)
  console.log(``)
  console.log(`✅ Ready for RDCP v1.0 compliance testing`)
})

// Graceful shutdown
process.on('SIGTERM', (): void => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close((): void => {
    console.log('Process terminated')
    process.exit(0)
  })
})

export default app