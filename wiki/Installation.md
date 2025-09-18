# Installation

This guide covers installing and setting up the RDCP SDK in your Node.js application.

## Requirements

- **Node.js**: 16.0.0 or higher
- **Package Manager**: npm, yarn, or pnpm  
- **Framework**: Express 4.18+, Fastify 4.0+, Koa 2.0+, or Next.js 13+

## Install via npm

```bash
npm install @rdcp/server
```

## Install via yarn

```bash
yarn add @rdcp/server
```

## Install via pnpm

```bash
pnpm add @rdcp/server
```

## Verify Installation

Create a test file to verify the SDK is installed correctly:

```javascript
// test-rdcp.js
const { adapters, auth } = require('@rdcp/server')

console.log('✅ RDCP SDK installed successfully!')
console.log('Available adapters:', Object.keys(adapters))
console.log('Auth module loaded:', !!auth.validateRDCPAuth)
```

Run the test:

```bash
node test-rdcp.js
```

Expected output:
```
✅ RDCP SDK installed successfully!
Available adapters: [ 'express', 'fastify', 'koa' ]
Auth module loaded: true
```

## Environment Setup

### Required Environment Variables

Set up your API key for authentication:

```bash
# .env file
RDCP_API_KEY="your-secure-32-plus-character-api-key-here"
```

The API key must be at least 32 characters for security compliance.

### Optional Environment Variables

```bash
# Authentication level (default: basic)
RDCP_AUTH_LEVEL="basic"

# JWT secret for standard/enterprise auth
JWT_SECRET="your-jwt-signing-secret"

# Server configuration
NODE_ENV="development"
PORT="3000"
```

## Package Exports

The RDCP SDK provides multiple export paths for different use cases:

```javascript
// Main SDK exports
const { adapters, auth, utils } = require('@rdcp/server')

// Framework-specific adapters
const express = require('@rdcp/server/server/adapters/express')
const fastify = require('@rdcp/server/server/adapters/fastify') 
const koa = require('@rdcp/server/server/adapters/koa')

// Authentication modules
const auth = require('@rdcp/server/auth')

// Endpoint implementations
const { protocolDiscovery, debugSystemDiscovery } = require('@rdcp/server/endpoints/discovery')
const { runtimeControl } = require('@rdcp/server/endpoints/control')

// Utilities
const { extractTenantContext } = require('@rdcp/server/utils/tenant')
```

## TypeScript Support

The SDK includes full TypeScript type definitions:

```typescript
import { adapters, auth } from '@rdcp/server'
import type { RDCPClientConfig, ControlRequest } from '@rdcp/server'

const middleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})
```

## Development Dependencies

For development and testing, you may want to install additional packages:

```bash
# Testing framework used by RDCP SDK
npm install --save-dev jest supertest

# TypeScript support
npm install --save-dev typescript @types/node

# Framework dependencies (choose what you need)
npm install express fastify koa
```

## Peer Dependencies

The SDK has optional peer dependencies for different frameworks:

```json
{
  "peerDependencies": {
    "express": "^4.18.0",
    "fastify": "^4.0.0"
  },
  "peerDependenciesMeta": {
    "express": { "optional": true },
    "fastify": { "optional": true }
  }
}
```

Install only the framework you're using:

```bash
# For Express.js
npm install express

# For Fastify  
npm install fastify

# For Koa (no peer dependency)
npm install koa
```

## Docker Installation

If using Docker, add to your Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including RDCP SDK
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV RDCP_API_KEY="your-production-api-key-32-characters-minimum"
ENV NODE_ENV="production"

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Installation Issues

**Issue**: `Cannot find module '@rdcp/server'`
**Solution**: Ensure you've run `npm install @rdcp/server` and the package is listed in your `package.json`

**Issue**: `RDCP_API_KEY must be at least 32 characters`  
**Solution**: Set a longer API key in your environment variables

**Issue**: TypeScript errors with imports
**Solution**: Ensure you have `@types/node` installed and proper TypeScript configuration

### Verify Framework Compatibility

Test your specific framework integration:

```javascript
// For Express
const express = require('express')
const { adapters } = require('@rdcp/server')
console.log('Express adapter:', !!adapters.express)

// For Fastify
const fastify = require('fastify')
const { adapters } = require('@rdcp/server')  
console.log('Fastify adapter:', !!adapters.fastify)
```

## Next Steps

Once installation is complete:

1. **[Basic Usage](Basic-Usage)** - Add RDCP endpoints to your application
2. **[Authentication Setup](Authentication-Setup)** - Configure security for your endpoints
3. **Framework Integration** - Choose your framework-specific guide:
   - **[Express.js Integration](Express-Integration)**
   - **[Fastify Integration](Fastify-Integration)** 
   - **[Koa Integration](Koa-Integration)**
   - **[Next.js Integration](NextJS-Integration)**

Also helpful:
- Quick local demo with Jaeger Dependencies graph: [RDCP Demo App](examples/RDCP-Demo-App)
- Copy/paste checklist for agents/automation: [AI Agent Quick Reference](AI-Agent-Quick-Reference)
