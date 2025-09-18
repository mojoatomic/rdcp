# RDCP SDK Wiki

**Complete JavaScript/TypeScript SDK for Runtime Debug Control Protocol v1.0**

[![npm version](https://badge.fury.io/js/@rdcp%2Fserver.svg)](https://badge.fury.io/js/@rdcp%2Fserver)
[![Tests](https://github.com/mojoatomic/rdpc/workflows/test/badge.svg)](https://github.com/mojoatomic/rdpc/actions)
[![Protocol Compliance](https://img.shields.io/badge/RDCP-v1.0%20Compliant-green)](https://github.com/mojoatomic/rdpc/blob/main/PROTOCOL-COMPLIANCE-REPORT.md)

## What is RDCP SDK?

**RDCP** stands for **Runtime Debug Control Protocol** - a standardized HTTP-based protocol for controlling configurable behaviors in distributed applications at runtime.

While RDCP started as a protocol for debug logging control, it has evolved into enterprise-grade runtime system control infrastructure. The protocol defines 5 required endpoints (discovery, control, status, health, plus protocol discovery) that allow external tools to enable/disable categorized behaviors without requiring application restarts.

### Core Use Cases

**🔧 Performance & Profiling Controls**
- Enable/disable CPU profiling and memory allocation tracking
- Control database query timing and expensive instrumentation
- Toggle stack trace collection and adjust sampling rates

**🚀 Feature Flag Management** 
- Runtime enable/disable of experimental features
- A/B testing controls adjustable without deployments
- Circuit breaker controls for external services

**🔒 Security & Audit Controls**
- Detailed security logging for auth attempts and authorization failures
- PII logging levels for compliance requirements  
- Request/response logging for security analysis

**⚙️ Development vs Production Behaviors**
- Switch between dev-friendly and production-safe error messages
- Control mock vs real external API usage
- Toggle local vs cloud storage backends

**📊 Resource Usage Controls**
- Enable/disable caching mechanisms and connection pool behaviors
- Control sync vs async processing modes
- Toggle retry mechanisms and timeout behaviors

**🌐 Third-party Integration Controls**
- Enable/disable specific external service integrations
- Toggle between primary and backup service endpoints
- Control service discovery and load balancing behaviors

The RDCP SDK provides a complete implementation of RDCP v1.0, making it easy to add these standardized runtime control capabilities to any JavaScript/Node.js application with zero overhead when controls are disabled.

## Quick Start

```bash
npm install @rdcp/server
```

```javascript
const { adapters, auth } = require('@rdcp/server')
const express = require('express')

const app = express()
app.use(express.json())

// Add RDCP endpoints with authentication
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth
})

app.use(rdcpMiddleware)
app.listen(3000)

// ✅ RDCP endpoints now available:
// GET  /.well-known/rdcp
// GET  /rdcp/v1/discovery 
// POST /rdcp/v1/control
// GET  /rdcp/v1/status
// GET  /rdcp/v1/health
```

## Documentation

### Start Here
- [AI Agent Quick Reference](AI-Agent-Quick-Reference) — copy/paste setup for agents and automation
- [RDCP Demo App (In-Memory Jaeger)](examples/RDCP-Demo-App) — one-command local demo with Dependencies graph
- [Implementation Status](Implementation-Status) — current state, demos, and observability

### Getting Started
- **[Installation](Installation)** - Install and setup the RDCP SDK
- **[Basic Usage](Basic-Usage)** - Quick integration examples for all supported frameworks

### Framework Integration
- **[Express.js Integration](Express-Integration)** - Complete Express.js middleware setup
- **[Fastify Integration](Fastify-Integration)** - Fastify plugin and middleware patterns  
- **[Koa Integration](Koa-Integration)** - Koa middleware integration
- **[Next.js Integration](NextJS-Integration)** - Next.js App Router implementation

### OpenTelemetry Integration
- [Trace Propagation Demo](examples/Trace-Propagation-Demo) — upstream → rdcp-demo-app with cross-service tracing
- **[OpenTelemetry Overview](examples/opentelemetry/Overview)** - Enterprise-grade trace correlation with RDCP debug logs
- **[Framework Examples](examples/opentelemetry/Framework-Examples)** - Production-ready integrations for Express, Next.js, Fastify, Koa
- **[Migration Guides](examples/opentelemetry/Migration-Guides)** - Step-by-step migration from existing logging to RDCP + OpenTelemetry
- **[Backend Configurations](examples/opentelemetry/Backend-Configurations)** - Working examples for Jaeger, DataDog, New Relic, and more
- **[DataDog Quickstart](examples/opentelemetry/DataDog-Quickstart)** - 10-minute path to Datadog APM + RDCP correlation
- **[New Relic Quickstart](examples/opentelemetry/NewRelic-Quickstart)** - 10-minute path to New Relic + RDCP correlation
- **[Performance Analysis](examples/opentelemetry/Performance-Analysis)** - Benchmarks, overhead measurement, and production tuning

### Enterprise Deployment
- **[Security and Compliance](enterprise/Security-and-Compliance)** - Data protection, audit trails, retention, and regulatory mapping
- **[Operational Production Guide](enterprise/Operational-Production-Guide)** - Authentication at scale, rate limiting, multi-tenancy
- **[Enterprise Deployment Patterns](enterprise/Enterprise-Deployment-Patterns)** - Kubernetes, service mesh, and collector architectures

### Authentication & Security
- **[Authentication Setup](Authentication-Setup)** - All 3 security levels: Basic, Standard, Enterprise
- **[Multi-Tenancy](Multi-Tenancy)** - Tenant isolation and context management

### Migration & Advanced
- **[Migration Guide](Migration-Guide)** - Migrate from manual RDCP implementation to SDK
- **[Client SDK](Client-SDK)** - Use the client SDK to consume RDCP endpoints
- **[Protocol Compliance](Protocol-Compliance)** - RDCP v1.0 protocol compliance details

### API Reference
- **[API Documentation](API-Reference)** - Complete API reference and endpoint specifications
- **[Error Handling](Error-Handling)** - Standard error codes and response formats

### Protocol Reference (Advanced)
- Primary spec: [rdcp-protocol-specification.md](../docs/rdcp-protocol-specification.md)
- Implementation guide: [rdcp-implementation-guide.md](../docs/rdcp-implementation-guide.md)

Notes:
- These are authoritative but dense. Most users should start with the Quick Reference and Demo App pages above.

### Development
- **[Testing](Testing)** - Run and develop tests for the SDK
- **[Contributing](Contributing)** - Development setup and contribution guidelines

## Features

✅ **Complete RDCP v1.0 Protocol Compliance**  
✅ **All 3 Security Levels** - Basic (API Key), Standard (JWT), Enterprise (mTLS)  
✅ **Multi-Framework Support** - Express, Fastify, Koa, Next.js  
✅ **Client & Server SDKs** - Full bidirectional RDCP implementation  
✅ **Multi-Tenancy Support** - Organization, namespace, and process isolation  
✅ **Zero Configuration** - Works out of the box with sensible defaults  
✅ **TypeScript Support** - Full type definitions included  

## Protocol Compliance

This SDK achieves **Level 2: Standard compliance** with RDCP v1.0 Protocol Specification:

- ✅ All required endpoints implemented with correct response formats
- ✅ All 3 authentication security levels supported  
- ✅ Multi-tenancy with standard header support
- ✅ Protocol-compliant error handling
- ✅ 73 passing tests across 7 test suites
- ✅ Production-ready with security hardening

See [Protocol Compliance Report](https://github.com/mojoatomic/rdpc/blob/main/PROTOCOL-COMPLIANCE-REPORT.md) for detailed analysis.

## Requirements

- **Node.js**: 16.0.0 or higher
- **Frameworks**: Express 4.18+, Fastify 4.0+, or Koa 2.0+

## License

MIT License - see [LICENSE](https://github.com/mojoatomic/rdpc/blob/main/LICENSE) file for details.