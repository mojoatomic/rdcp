# @rdcp.dev/otel-plugin

**OpenTelemetry integration plugin for RDCP SDK** - Enterprise-grade trace correlation

[![npm version](https://img.shields.io/npm/v/@rdcp.dev/otel-plugin)](https://www.npmjs.com/package/@rdcp.dev/otel-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

The `@rdcp.dev/otel-plugin` provides seamless integration between the RDCP SDK and OpenTelemetry, enabling automatic trace correlation in debug logs. This enterprise-grade plugin allows you to correlate debug output with distributed traces across your entire system.

### Key Benefits

- **📊 Automatic Trace Correlation**: Debug logs automatically include trace IDs and span IDs
- **🔧 Zero Configuration**: Works out-of-the-box with existing OpenTelemetry setup
- **🚀 Performance Optimized**: Zero impact when OpenTelemetry is not available
- **🏢 Enterprise Ready**: Production-grade error handling and fallbacks
- **📦 Optional Dependency**: Core RDCP SDK works independently

## 🚀 Quick Start

### Installation

```bash
npm install @rdcp.dev/otel-plugin @opentelemetry/api
```

### Basic Usage

```typescript
import { debug, enableDebugCategories } from '@rdcp.dev/server'
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

// Enable OpenTelemetry integration
setupRDCPWithOpenTelemetry()

// Enable debug categories
enableDebugCategories(['DATABASE', 'API_ROUTES'])

// Debug logs now include trace correlation automatically
debug.database('Query executed', { sql: 'SELECT * FROM users' })
// Output: 🔌 [DB] [trace:90abcdef] Query executed [{ sql: 'SELECT * FROM users' }]

debug.api('Request processed', { method: 'GET', path: '/users/123' })
// Output: 🔍 [API] [trace:90abcdef] Request processed [{ method: 'GET', path: '/users/123' }]
```

## 📖 Documentation

### Setup Functions

#### `setupRDCPWithOpenTelemetry(config?)`

Enables OpenTelemetry integration with optional configuration.

```typescript
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

// Basic setup
setupRDCPWithOpenTelemetry()

// With configuration
setupRDCPWithOpenTelemetry({
  enableTraceCorrelation: true,
  enableBaggage: true
})
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableTraceCorrelation` | `boolean` | `true` | Enable automatic trace correlation |
| `enableBaggage` | `boolean` | `true` | Extract baggage from OpenTelemetry context |
| `customProvider` | `TraceProvider` | `undefined` | Use custom trace provider implementation |

#### `disableRDCPOpenTelemetry()`

Disables OpenTelemetry integration.

```typescript
import { disableRDCPOpenTelemetry } from '@rdcp.dev/otel-plugin'

disableRDCPOpenTelemetry()
```

#### `isRDCPOpenTelemetryActive()`

Checks if OpenTelemetry integration is currently active.

```typescript
import { isRDCPOpenTelemetryActive } from '@rdcp.dev/otel-plugin'

if (isRDCPOpenTelemetryActive()) {
  console.log('OpenTelemetry integration is active')
}
```

### Advanced Usage

#### Custom Provider

For advanced use cases, you can create your own trace provider:

```typescript
import { createOpenTelemetryProvider, setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'
import type { TraceProvider } from '@rdcp.dev/otel-plugin'

// Create provider instance
const provider = createOpenTelemetryProvider()

// Custom setup logic...
if (provider.isConfigured()) {
  setupRDCPWithOpenTelemetry({ customProvider: provider })
}
```

#### Integration with Popular OpenTelemetry Setups

**With @opentelemetry/sdk-node:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

// Initialize OpenTelemetry first
const sdk = new NodeSDK({
  // your OpenTelemetry configuration
})
sdk.start()

// Then enable RDCP integration
setupRDCPWithOpenTelemetry()
```

**With Custom Tracer Provider:**

```typescript
import { trace } from '@opentelemetry/api'
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base'
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

// Initialize OpenTelemetry
const provider = new BasicTracerProvider()
trace.setGlobalTracerProvider(provider)

// Enable RDCP integration
setupRDCPWithOpenTelemetry()
```

## 🏗️ Architecture

This plugin implements the `TraceProvider` interface from `@rdcp.dev/server`, providing a clean abstraction between RDCP and OpenTelemetry:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Your App     │    │   @rdcp.dev/server   │    │ @rdcp.dev/otel-plugin   │
│                │    │                  │    │                     │
│ debug.api(...)─┼────►│ TraceProvider ───┼────►│ OpenTelemetryProvider│
│                │    │ Interface        │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                                            │
                                                            ▼
                                                ┌─────────────────────┐
                                                │ OpenTelemetry API   │
                                                │ trace.getActiveSpan │
                                                └─────────────────────┘
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## 📦 Compatibility

- **Node.js**: >= 16.0.0
- **OpenTelemetry API**: >= 1.0.0 < 2.0.0
- **RDCP Server**: ^1.0.0

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT - see [LICENSE](../../LICENSE) for details.

## 🔗 Related Packages

- [`@rdcp/server`](../server) - Core RDCP SDK
- [`@opentelemetry/api`](https://www.npmjs.com/package/@opentelemetry/api) - OpenTelemetry API
- [`@opentelemetry/sdk-node`](https://www.npmjs.com/package/@opentelemetry/sdk-node) - OpenTelemetry Node.js SDK