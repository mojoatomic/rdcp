# OpenTelemetry Integration Overview

**🚀 Get enterprise-grade trace correlation with RDCP in under 10 minutes!**

## What You Get

**Before OpenTelemetry Integration:**
```javascript
// Basic RDCP debug logs
rdcp.debug.database('User query executed', { 
  userId: 123, 
  query: 'SELECT * FROM users WHERE id = ?' 
})
// Output: [DATABASE] User query executed { userId: 123, query: "SELECT..." }
```

**After OpenTelemetry Integration:**
```javascript
// Same code, but now automatically enriched with trace context
rdcp.debug.database('User query executed', { 
  userId: 123, 
  query: 'SELECT * FROM users WHERE id = ?' 
})
// Output: [DATABASE] User query executed { 
//   userId: 123, 
//   query: "SELECT...",
//   trace: {
//     traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
//     spanId: "00f067aa0ba902b7"
//   }
// }
```

**The Power:** Now your debug logs and distributed traces are perfectly correlated. Click on a trace in Jaeger/DataDog and immediately find the corresponding debug logs!

---

## ⚡ 10-Minute Quick Start

### Step 1: Install (30 seconds)
```bash
npm install @rdcp/server @rdcp/otel-plugin @opentelemetry/api
```

### Step 2: Enable Correlation (2 minutes)
```javascript
// Add these 3 lines to your existing RDCP setup
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

// Your existing RDCP client
const rdcp = new RDCPClient({ /* your config */ })

// Magic happens here - one line enables trace correlation
setupRDCPWithOpenTelemetry(rdcp)
```

### Step 3: Verify It Works (1 minute)
```javascript
// Your existing debug calls now include trace context automatically
rdcp.debug.api('Processing user request', { userId: req.userId })
rdcp.debug.database('Query executed', { table: 'users', duration: '23ms' })
rdcp.debug.cache('Cache miss', { key: 'user:123', ttl: 3600 })

// Check your logs - you'll see trace IDs automatically added!
```

### Step 4: Connect Your Backend (5 minutes)
Choose your observability backend:

- For a simple demo with Dependencies graph, use the in-memory Jaeger helper:
  ```bash
  ./packages/rdcp-demo-app/scripts/run-inmemory-demo.sh
  # Cleanup:
  ./packages/rdcp-demo-app/scripts/stop-inmemory-demo.sh
  ```
- **[Jaeger (Local Dev)](Backend-Configurations#jaeger-local-development)**
- **[DataDog (Production)](Backend-Configurations#datadog-apm)**  
- **[New Relic (Enterprise)](Backend-Configurations#new-relic)**
- **[Honeycomb](Backend-Configurations#honeycomb)**

**That's it!** You now have enterprise-grade observability with perfect correlation between traces and debug logs.

---

## Architecture: Zero Impact Design

### Plugin Architecture Benefits
```
┌─────────────────┐    ┌──────────────────────┐
│   @rdcp/server  │    │  @rdcp/otel-plugin   │
│                 │    │                      │
│ ✅ Works standalone│    │ ✅ Optional enhancement│
│ ✅ Zero OTel deps │    │ ✅ Peer dependencies   │
│ ✅ Fast & lean    │    │ ✅ Enterprise features │
└─────────────────┘    └──────────────────────┘
```

**Key Benefits:**
- **📦 Optional Dependency**: Teams without OpenTelemetry aren't forced to install it
- **🚀 Performance**: Zero overhead when OpenTelemetry isn't configured
- **🔄 Gradual Adoption**: Start with basic RDCP, add OpenTelemetry when ready
- **🏢 Enterprise Ready**: Works with any OpenTelemetry-compatible backend

---

## Framework Examples (Copy & Paste Ready)

### Express.js (Most Popular)
```javascript
const express = require('express')
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const app = express()
const rdcp = new RDCPClient({ /* config */ })

// One line enables trace correlation
setupRDCPWithOpenTelemetry(rdcp)

app.get('/users/:id', async (req, res) => {
  rdcp.debug.api('User request started', { userId: req.params.id })
  
  const user = await getUserById(req.params.id)
  rdcp.debug.database('User fetched', { userId: user.id, found: !!user })
  
  res.json(user)
})
```

### Next.js App Router
```javascript
// app/api/users/route.js
import { RDCPClient } from '@rdcp/server'
import { setupRDCPWithOpenTelemetry } from '@rdcp/otel-plugin'

const rdcp = new RDCPClient({ /* config */ })
setupRDCPWithOpenTelemetry(rdcp)

export async function GET(request) {
  rdcp.debug.api('API route called', { route: '/api/users' })
  
  const users = await fetchUsers()
  rdcp.debug.database('Users retrieved', { count: users.length })
  
  return Response.json(users)
}
```

**Want more frameworks?** See [Framework Examples](Framework-Examples) for Fastify, Koa, and more.

---

## Migration Scenarios (Enterprise Adoption Patterns)

### Scenario 1: "We have console.log everywhere"
**Before:**
```javascript
console.log('Processing user request', userId)
```

**After (10 minutes):**
```javascript
rdcp.debug.api('Processing user request', { userId })
// Now: Structured, categorized, controllable, traceable
```

### Scenario 2: "We use Winston/Pino logging"
**Before:**
```javascript
logger.info('Database query executed', { query, duration })
```

**After (10 minutes):**
```javascript
rdcp.debug.database('Query executed', { query, duration })
// Now: RDCP control + trace correlation + existing structured logging
```

### Scenario 3: "We already have OpenTelemetry traces"
**Before:**
```javascript
span.addEvent('Query executed', { query, duration })
```

**After (5 minutes):**
```javascript
rdcp.debug.database('Query executed', { query, duration })
// Now: Debug logs automatically correlated with your existing traces
```

**Need detailed migration steps?** See [Migration Guides](Migration-Guides).

---

## Real-World Impact: Enterprise Success Stories

### Debugging Distributed Systems
```javascript
// Before: Finding issues across services was a nightmare
// After: Click trace ID in any service, immediately see debug logs

// Service A
rdcp.debug.api('Request received', { orderId: 12345 })

// Service B  
rdcp.debug.payment('Payment processed', { orderId: 12345, amount: 99.99 })

// Service C
rdcp.debug.inventory('Stock updated', { orderId: 12345, items: 3 })

// All logs share the same traceId - perfect correlation!
```

### Performance Investigation
```javascript
// Trace shows slow database calls
// Debug logs show exact queries and parameters
rdcp.debug.database('Slow query detected', { 
  query: 'SELECT * FROM orders WHERE created_at > ?',
  duration: '2.3s',
  rowCount: 50000 
})
// traceId: "4bf92f3577b34da6a3ce929d0e0e4736"
```

### Production Incident Response
```javascript
// Alert fires in DataDog/New Relic
// Get trace ID from alert
// Search logs by trace ID
// Immediately see debug context from all services
```

---

## Next Steps

1. **[Quick Framework Setup](Framework-Examples)** - Copy-paste examples for your framework
2. **[Backend Configuration](Backend-Configurations)** - Connect to your observability platform  
3. **[Migration Guide](Migration-Guides)** - Step-by-step migration from current logging
4. **[OpenTelemetry Roadmap](../OpenTelemetry-Integration-Roadmap)** - See what's coming next

---

**Community Adoption → Enterprise Interest**

Developers learn RDCP + OpenTelemetry on side projects → Bring it to work → Enterprise procurement follows developer preference.

**Ready to get started?** Pick your framework: [Express](Framework-Examples#express) | [Next.js](Framework-Examples#nextjs) | [Fastify](Framework-Examples#fastify) | [Koa](Framework-Examples#koa)