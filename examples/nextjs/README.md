# Next.js App Router Integration

Copy-paste route handlers for adding RDCP to your Next.js 14+ App Router application.

## File Structure

Create these files in your Next.js `app` directory:

```
app/
├── .well-known/
│   └── rdcp/
│       └── route.ts              # Protocol discovery
├── rdcp/
│   └── v1/
│       ├── discovery/
│       │   └── route.ts          # Debug system discovery
│       ├── control/
│       │   └── route.ts          # Runtime control
│       ├── status/
│       │   └── route.ts          # Status monitoring
│       └── health/
│           └── route.ts          # Health check
```

## Setup Steps

1. **Install dependencies:**
   ```bash
   npm install @rdcp/server
   ```

2. **Set environment variables:**
   ```bash
   # Required for authentication
   RDCP_API_KEY=your-32-character-or-longer-api-key-here
   
   # Optional: Set auth level (default: basic)
   RDCP_AUTH_LEVEL=basic  # or standard, enterprise
   ```

3. **Copy route handlers from examples above**

4. **Adjust import paths** in each route handler:
   ```typescript
   // Change these paths to match your project structure
   import { validateRDCPAuth } from '../../../../src/auth'
   import { DEBUG_CONFIG, getPerformanceMetrics } from '../../../../src/debug'
   ```

## Critical Rules (WARP)

- ✅ **Use relative imports** - NO `@/` imports in API routes
- ✅ **All functions are async** - Follow Next.js 14+ patterns  
- ✅ **Return Response objects** - Use `Response.json()` format
- ✅ **Each file under 100 lines** - Maintain readability

## Usage

After setup, test your endpoints:

```bash
# Protocol discovery
curl http://localhost:3000/.well-known/rdcp

# Enable debug category (requires API key)
curl -X POST http://localhost:3000/rdcp/v1/control \
  -H "X-API-Key: your-32-character-or-longer-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable","categories":["DATABASE"]}'

# Check status
curl -H "X-API-Key: your-32-character-or-longer-api-key-here" \
  http://localhost:3000/rdcp/v1/status
```

Your Next.js app now supports runtime debug control via RDCP protocol!