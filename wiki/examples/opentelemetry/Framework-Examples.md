# Framework Examples: RDCP + OpenTelemetry Integration

**🚀 Production-ready, copy-paste examples that work in under 10 minutes!**

Each example includes:
- ✅ Complete setup with OpenTelemetry auto-instrumentation
- ✅ RDCP integration with trace correlation
- ✅ Real endpoint examples showing debug categories
- ✅ Docker setup for easy testing
- ✅ Environment configuration

---

## Express.js - Most Popular Choice

### Complete Express Setup (7 minutes)

**📁 File: `server.js`**
```javascript
// OpenTelemetry MUST be imported first for auto-instrumentation
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
})
sdk.start()

// Now import your application code
const express = require('express')
const { debug, enableDebugCategories } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp.dev/otel-plugin')

const app = express()
app.use(express.json())

// Enable categories in development
enableDebugCategories(['API_ROUTES', 'DATABASE'])

// ✨ Magic: One line enables trace correlation
setupRDCPWithOpenTelemetry()

// Simulated database
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

// Example endpoints with RDCP debug logging
app.get('/users', async (req, res) => {
debug.api('Users list requested', { 
    userAgent: req.headers['user-agent'],
    ip: req.ip 
  })
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 50))
  
debug.database('Users query executed', { 
    table: 'users',
    count: users.length,
    duration: '50ms' 
  })
  
  res.json({ users, total: users.length })
})

app.get('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id)
  
debug.api('User detail requested', {
  
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    rdcp.debug.api('User not found', { userId, available: users.map(u => u.id) })
    return res.status(404).json({ error: 'User not found' })
  }
  
debug.cache('User cache checked', { 
    userId, 
    cacheHit: false,
    ttl: 3600 
  })
  
debug.database('User retrieved', { 
    userId: user.id,
    found: true,
    query: `SELECT * FROM users WHERE id = ${userId}` 
  })
  
  res.json(user)
})

app.post('/users', async (req, res) => {
  const newUser = { 
    id: users.length + 1, 
    ...req.body 
  }
  
debug.api('User creation requested', { 
    userData: newUser,
    validation: 'passed' 
  })
  
  // Simulate validation
  if (!newUser.name || !newUser.email) {
debug.validation('User validation failed', { 
      missing: !newUser.name ? ['name'] : [] + !newUser.email ? ['email'] : [],
      provided: Object.keys(req.body)
    })
    return res.status(400).json({ error: 'Name and email required' })
  }
  
  users.push(newUser)
  
debug.database('User created', { 
    userId: newUser.id,
    table: 'users',
    operation: 'INSERT' 
  })
  
debug.integration('User created notification sent', {
    userId: newUser.id,
    webhook: 'user-service',
    status: 'success'
  })
  
  res.status(201).json(newUser)
})

// Error handling with RDCP debugging
app.use((err, req, res, next) => {
debug.api('Request error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  })
  
  res.status(500).json({ error: 'Internal server error' })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Express server running on port ${port}`)
  console.log('OpenTelemetry + RDCP integration active!')
  console.log('Try: curl http://localhost:3000/users')
})
```

**📁 File: `package.json`**
```json
{
  "name": "express-rdcp-opentelemetry-example",
  "version": "1.0.0",
  "description": "Express.js with RDCP + OpenTelemetry integration",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "curl http://localhost:3000/users"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@rdcp/server": "latest",
"@rdcp.dev/otel-plugin": "latest",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/api": "^1.6.0",
    "@opentelemetry/instrumentation-express": "^0.34.0",
    "@opentelemetry/instrumentation-http": "^0.45.0",
    "@opentelemetry/exporter-jaeger": "^1.17.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**🐳 File: `docker-compose.yml` (Local Testing)**
```yaml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # HTTP collector
    environment:
      - COLLECTOR_OTLP_ENABLED=true
  
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - RDCP_API_KEY=dev-key-32-characters-minimum-length
    depends_on:
      - jaeger
```

### Test Your Integration (2 minutes)
```bash
# 1. Start Jaeger and your app
docker-compose up

# 2. Make some requests
curl http://localhost:3000/users
curl http://localhost:3000/users/1
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Charlie","email":"charlie@example.com"}'

# 3. Open Jaeger UI: http://localhost:16686
# 4. Find your traces and see correlated debug logs!
```

---

## Next.js App Router - Modern React Choice

### Complete Next.js Setup (8 minutes)

**📁 File: `instrumentation.js` (Required for App Router)**
```javascript
// This file is required for Next.js App Router OpenTelemetry integration
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger')
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http')
    
    const sdk = new NodeSDK({
      traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      }),
      instrumentations: [new HttpInstrumentation()]
    })
    
    sdk.start()
    console.log('OpenTelemetry SDK initialized for Next.js')
  }
}
```

**📁 File: `lib/rdcp.js` (RDCP Client Setup)**
```javascript
import { debug, enableDebugCategories } from '@rdcp/server'
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

// Enable categories in development
enableDebugCategories(['API_ROUTES', 'DATABASE'])

// Enable trace correlation
setupRDCPWithOpenTelemetry()

export { debug }
```

**📁 File: `app/api/users/route.js` (API Routes)**
```javascript
import { debug } from '../../../lib/rdcp-debug'
import { NextResponse } from 'next/server'

// Simulated user data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  
  rdcp.debug.api('Next.js API route called', { 
    route: '/api/users',
    userId,
    userAgent: request.headers.get('user-agent')
  })
  
  if (userId) {
    const user = users.find(u => u.id === parseInt(userId))
    
    if (!user) {
debug.api('User not found', {
        userId,
        availableIds: users.map(u => u.id)
      })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    rdcp.debug.database('Single user retrieved', { 
      userId: user.id,
      operation: 'SELECT',
      table: 'users'
    })
    
    return NextResponse.json(user)
  }
  
  rdcp.debug.database('All users retrieved', { 
    count: users.length,
    operation: 'SELECT',
    table: 'users'
  })
  
  return NextResponse.json({ users, total: users.length })
}

export async function POST(request) {
  const body = await request.json()
  const newUser = { 
    id: users.length + 1, 
    ...body 
  }
  
  rdcp.debug.api('User creation via Next.js API', { 
    userData: newUser,
    contentType: request.headers.get('content-type')
  })
  
  // Validation
  if (!newUser.name || !newUser.email) {
    rdcp.debug.validation('Next.js API validation failed', {
      missing: [],
      provided: Object.keys(body)
    })
    
    if (!newUser.name) rdcp.debug.validation('Missing required field', { field: 'name' })
    if (!newUser.email) rdcp.debug.validation('Missing required field', { field: 'email' })
    
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
  }
  
  users.push(newUser)
  
  rdcp.debug.database('User created via Next.js', { 
    userId: newUser.id,
    operation: 'INSERT',
    table: 'users'
  })
  
  rdcp.debug.integration('Next.js user webhook triggered', {
    userId: newUser.id,
    webhook: 'user-created',
    status: 'queued'
  })
  
  return NextResponse.json(newUser, { status: 201 })
}
```

**📁 File: `app/users/page.js` (React Component)**
```javascript
'use client'
import { useState, useEffect } from 'react'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUser, setNewUser] = useState({ name: '', email: '' })
  
  useEffect(() => {
    fetchUsers()
  }, [])
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const createUser = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      
      if (response.ok) {
        setNewUser({ name: '', email: '' })
        fetchUsers() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Users Management</h1>
      
      <form onSubmit={createUser} style={{ marginBottom: '20px' }}>
        <h2>Add New User</h2>
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          style={{ margin: '5px', padding: '8px' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          style={{ margin: '5px', padding: '8px' }}
        />
        <button type="submit" style={{ margin: '5px', padding: '8px' }}>
          Add User
        </button>
      </form>
      
      <h2>Current Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id} style={{ margin: '10px 0' }}>
            <strong>{user.name}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**📁 File: `next.config.js`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // Required for OpenTelemetry
  }
}

module.exports = nextConfig
```

**📁 File: `package.json`**
```json
{
  "name": "nextjs-rdcp-opentelemetry-example",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "@rdcp/server": "latest",
"@rdcp.dev/otel-plugin": "latest",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/api": "^1.6.0",
    "@opentelemetry/instrumentation-http": "^0.45.0",
    "@opentelemetry/exporter-jaeger": "^1.17.0"
  }
}
```

---

## Fastify - High Performance Choice

### Complete Fastify Setup (6 minutes)

**📁 File: `server.js`**
```javascript
// OpenTelemetry initialization MUST come first
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation()
  ]
})
sdk.start()

// Now import application code
const fastify = require('fastify')({ logger: true })
const { debug, enableDebugCategories } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp.dev/otel-plugin')

// Initialize RDCP with OpenTelemetry
// Enable categories in development
enableDebugCategories(['API_ROUTES', 'DATABASE'])

setupRDCPWithOpenTelemetry()

// User data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

// Schemas for validation
const userSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' }
  }
}

const getUsersSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        users: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' }
      }
    }
  }
}

// Routes with RDCP debugging
fastify.get('/users', { schema: getUsersSchema }, async (request, reply) => {
debug.api('Fastify users list requested', {
    requestId: request.id,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  })
  
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 30))
  
debug.database('Fastify users query executed', {
    table: 'users',
    count: users.length,
    duration: '30ms',
    query: 'SELECT * FROM users'
  })
  
debug.cache('Users cache status checked', {
    cacheKey: 'users:all',
    hit: false,
    ttl: 300
  })
  
  return { users, total: users.length }
})

fastify.get('/users/:id', async (request, reply) => {
  const userId = parseInt(request.params.id)
  
debug.api('Fastify user detail requested', {
    userId,
    requestId: request.id,
    route: '/users/:id'
  })
  
  const user = users.find(u => u.id === userId)
  
  if (!user) {
debug.api('Fastify user not found', {
      userId,
      available: users.map(u => u.id),
      searched: 'memory_store'
    })
    
    return reply.status(404).send({ error: 'User not found' })
  }
  
debug.database('Fastify user retrieved', {
    userId: user.id,
    found: true,
    query: `SELECT * FROM users WHERE id = ${userId}`,
    duration: '15ms'
  })
  
  return user
})

fastify.post('/users', {
  schema: { body: userSchema }
}, async (request, reply) => {
  const newUser = {
    id: users.length + 1,
    ...request.body
  }
  
debug.api('Fastify user creation requested', {
    userData: newUser,
    validation: 'schema_validated',
    requestId: request.id
  })
  
debug.validation('Fastify user validation passed', {
    fields: Object.keys(request.body),
    schema: 'userSchema',
    valid: true
  })
  
  users.push(newUser)
  
debug.database('Fastify user created', {
    userId: newUser.id,
    operation: 'INSERT',
    table: 'users',
    duration: '25ms'
  })
  
debug.integration('Fastify user webhook dispatched', {
    userId: newUser.id,
    webhook: 'user-created-webhook',
    status: 'queued',
    priority: 'normal'
  })
  
  return reply.status(201).send(newUser)
})

// Error handler with RDCP debugging
fastify.setErrorHandler((error, request, reply) => {
debug.api('Fastify error occurred', {
    error: error.message,
    statusCode: error.statusCode || 500,
    requestId: request.id,
    url: request.url,
    method: request.method
  })
  
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error'
  })
})

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    
    console.log(`Fastify server running on port ${port}`)
    console.log('OpenTelemetry + RDCP integration active!')
    console.log('Try: curl http://localhost:3000/users')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

---

## Koa - Minimalist Choice

### Complete Koa Setup (5 minutes)

**📁 File: `server.js`**
```javascript
// OpenTelemetry initialization first
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { KoaInstrumentation } = require('@opentelemetry/instrumentation-koa')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new KoaInstrumentation()
  ]
})
sdk.start()

// Application imports
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { debug, enableDebugCategories } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp.dev/otel-plugin')

const app = new Koa()
const router = new Router()

// RDCP setup
// Enable categories in development
enableDebugCategories(['API_ROUTES', 'DATABASE'])

setupRDCPWithOpenTelemetry()

// Sample data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

// Middleware for request logging
app.use(async (ctx, next) => {
  const start = Date.now()
  
debug.api('Koa request started', {
    method: ctx.method,
    url: ctx.url,
    userAgent: ctx.headers['user-agent'],
    ip: ctx.ip
  })
  
  await next()
  
  const duration = Date.now() - start
  
debug.api('Koa request completed', {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`
  })
})

// Routes
router.get('/users', async (ctx) => {
  rdcp.debug.api('Koa users list requested', {
    query: ctx.query,
    route: '/users'
  })
  
  // Simulate database operation
  await new Promise(resolve => setTimeout(resolve, 40))
  
debug.database('Koa users query completed', {
    table: 'users',
    operation: 'SELECT',
    count: users.length,
    duration: '40ms'
  })
  
debug.cache('Koa users cache checked', {
    key: 'users:list',
    hit: false,
    reason: 'expired'
  })
  
  ctx.body = { users, total: users.length }
})

router.get('/users/:id', async (ctx) => {
  const userId = parseInt(ctx.params.id)
  
debug.api('Koa user detail requested', {
    userId,
    params: ctx.params
  })
  
  const user = users.find(u => u.id === userId)
  
  if (!user) {
debug.api('Koa user not found', {
      userId,
      available: users.map(u => u.id)
    })
    
    ctx.status = 404
    ctx.body = { error: 'User not found' }
    return
  }
  
debug.database('Koa user retrieved', {
    userId: user.id,
    query: `SELECT * FROM users WHERE id = ${userId}`,
    found: true
  })
  
  ctx.body = user
})

router.post('/users', async (ctx) => {
  const { name, email } = ctx.request.body
  
  rdcp.debug.api('Koa user creation requested', {
    bodySize: JSON.stringify(ctx.request.body).length,
    contentType: ctx.headers['content-type']
  })
  
  // Validation
  if (!name || !email) {
    rdcp.debug.validation('Koa user validation failed', {
      missing: [
        !name ? 'name' : null,
        !email ? 'email' : null
      ].filter(Boolean),
      provided: Object.keys(ctx.request.body)
    })
    
    ctx.status = 400
    ctx.body = { error: 'Name and email are required' }
    return
  }
  
  rdcp.debug.validation('Koa user validation passed', {
    fields: ['name', 'email'],
    valid: true
  })
  
  const newUser = {
    id: users.length + 1,
    name,
    email
  }
  
  users.push(newUser)
  
  rdcp.debug.database('Koa user created', {
    userId: newUser.id,
    operation: 'INSERT',
    table: 'users'
  })
  
  rdcp.debug.integration('Koa webhook triggered', {
    userId: newUser.id,
    event: 'user.created',
    async: true
  })
  
  ctx.status = 201
  ctx.body = newUser
})

// Error handling
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
debug.api('Koa error occurred', {
      error: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
      status: err.status || 500
    })
    
    ctx.status = err.status || 500
    ctx.body = { error: err.message || 'Internal Server Error' }
  }
})

app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Koa server running on port ${port}`)
  console.log('OpenTelemetry + RDCP integration active!')
  console.log('Try: curl http://localhost:3000/users')
})
```

---

## Quick Test Commands for All Frameworks

### Universal Test Script
```bash
#!/bin/bash
# File: test-integration.sh

echo "Testing RDCP + OpenTelemetry Integration..."

# Test GET all users
echo "\n1. Getting all users:"
curl -s http://localhost:3000/users | jq

# Test GET single user  
echo "\n2. Getting user 1:"
curl -s http://localhost:3000/users/1 | jq

# Test POST new user
echo "\n3. Creating new user:"
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}' | jq

# Test 404 error
echo "\n4. Testing 404 error:"
curl -s http://localhost:3000/users/999 | jq

# Test validation error
echo "\n5. Testing validation error:"
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Invalid"}' | jq

echo "\n✅ Integration test complete!"
echo "🔍 Check Jaeger UI at http://localhost:16686"
echo "🔍 All debug logs now include trace correlation!"
```

### Performance Test
```bash
# File: performance-test.sh
echo "Performance testing RDCP + OpenTelemetry..."

# Warm up
curl -s http://localhost:3000/users > /dev/null

# Performance test
time {
  for i in {1..100}; do
    curl -s http://localhost:3000/users > /dev/null
  done
}

echo "✅ Performance test complete - check overhead in traces!"
```

---

## Next Steps

1. **Pick your framework** and copy-paste the complete setup
2. **Run the tests** to verify trace correlation works
3. **Configure your backend** with [Backend Configurations](Backend-Configurations)
4. **Migrate existing code** with [Migration Guides](Migration-Guides)

**🎯 The result:** Enterprise-grade observability with perfect trace correlation in under 10 minutes!