# @rdcp.dev/client

Typed RDCP client SDK for Node 18+ and modern browsers. Uses native fetch; no polyfills.

- Node.js 18+ (native fetch)
- Browsers (native fetch)

## Install

```
npm install @rdcp.dev/client @rdcp.dev/core zod
```

## Quick start

```ts
import { createRDCPClient } from '@rdcp.dev/client'

const rdcp = createRDCPClient({ baseUrl: 'http://localhost:3000' })

const discovery = await rdcp.getDiscovery()
const status = await rdcp.getStatus()
await rdcp.postControl({ action: 'enable', categories: ['DATABASE'] })
```

## API

- createRDCPClient(options)
  - options.baseUrl: string
  - options.headers?: Record<string, string>
  - options.fetch?: typeof fetch (optional override)

Methods:
- getDiscovery(): Promise<DiscoveryResponse>
- getStatus(): Promise<StatusResponse>
- postControl(body: ControlRequest): Promise<ControlResponse>

## Errors

Errors are thrown as RDCPClientError with fields:
- code?: RDCP error code (string)
- status?: HTTP status
- details?: unknown
