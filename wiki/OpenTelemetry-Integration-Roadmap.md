# OpenTelemetry Integration Roadmap

**Enterprise SDK Architecture for RDCP OpenTelemetry Integration**

## Vision: Clean Abstraction for Enterprise Customers

The goal is to create a flexible, enterprise-grade integration that allows customers to choose their level of OpenTelemetry integration without forcing dependencies.

---

## 📦 Planned SDK Architecture

### Core Package Structure
```
@rdcp/server                 # Core RDCP functionality (current)
@rdcp.dev/otel-plugin           # OpenTelemetry integration (planned)
@rdcp/examples              # Integration examples (planned)
```

### Benefits of This Approach
- **✅ Optional Dependency**: Customers without OpenTelemetry aren't forced to install it
- **✅ Version Flexibility**: OTel plugin can support multiple OpenTelemetry versions
- **✅ Performance Control**: Enable/disable correlation based on requirements
- **✅ Vendor Agnostic**: Works with any OpenTelemetry-compatible backend
- **✅ Clean Testing**: Each package can be tested independently

---

## 🏗️ Implementation Phases

### Phase 1: Core SDK with Hooks ⚠️ (In Progress)
**Goal**: Add trace provider interface to existing RDCP SDK

#### Core Interface Design
```typescript
export interface TraceProvider {
  getCurrentTraceContext(): TraceContext | null
}

export interface TraceContext {
  traceId: string
  spanId: string
  baggage?: Record<string, string>
}

// Enhanced RDCP debug system
export class RDCPDebugger {
  private traceProvider?: TraceProvider

  setTraceProvider(provider: TraceProvider): void
  
  private enrichWithTrace(logData: any): any {
    if (!this.traceProvider) return logData
    
    const context = this.traceProvider.getCurrentTraceContext()
    if (!context) return logData

    return {
      ...logData,
      trace: {
        traceId: context.traceId,
        spanId: context.spanId
      }
    }
  }
}
```

**Status**: 🔄 Starting implementation
**Files Modified**: 
- `src/debug.ts` - Add trace provider hooks
- `src/types/debug.ts` - Add trace interfaces
- `tests/opentelemetry.test.ts` - Test trace integration

---

### Phase 2: OpenTelemetry Plugin Package ⏳ (Planned)
**Goal**: Create separate `@rdcp.dev/otel-plugin` package

#### Plugin Implementation
```typescript
import { trace } from '@opentelemetry/api'
import { TraceProvider, TraceContext } from '@rdcp/server'

export class OpenTelemetryProvider implements TraceProvider {
  getCurrentTraceContext(): TraceContext | null {
    const activeSpan = trace.getActiveSpan()
    if (!activeSpan) return null

    const spanContext = activeSpan.spanContext()
    if (!spanContext || !trace.isSpanContextValid(spanContext)) {
      return null
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      baggage: this.extractBaggage()
    }
  }
}

// Easy setup function
export function setupRDCPWithOpenTelemetry() {
  // Internally sets the OpenTelemetry provider for RDCP debug system
  setTraceProvider(new OpenTelemetryProvider())
}
```

**Package.json Features**:
- `peerDependencies`: `@opentelemetry/api`
- Supports multiple OpenTelemetry versions
- Zero impact on core SDK bundle size

---

### Phase 3: Customer Integration Examples ⏳ (Planned)
**Goal**: Provide clear integration patterns for enterprise customers

#### Simple Integration
```typescript
// Customer code - Basic RDCP
import { RDCPClient } from '@rdcp/server'

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: 'https://debug.mycompany.com'
})

// Debug logs work normally
rdcp.debug.database('Query executed', { sql: 'SELECT...' })
```

#### Enhanced Integration with OpenTelemetry
```typescript
// Customer code - With OpenTelemetry correlation
import { RDCPClient } from '@rdcp/server'
import { setupRDCPWithOpenTelemetry } from '@rdcp.dev/otel-plugin'

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: 'https://debug.mycompany.com'
})

// Optional: Enable OpenTelemetry correlation
setupRDCPWithOpenTelemetry(rdcp)

// Debug logs now include trace context automatically
rdcp.debug.database('Query executed', { 
  sql: 'SELECT...',
  // Automatically added:
  // trace: { traceId: 'abc123', spanId: 'def456' }
})
```

---

## 🎯 Enterprise Customer Benefits

### Flexibility
- **Gradual Adoption**: Start with basic RDCP, add OpenTelemetry later
- **Performance Tuning**: Enable/disable correlation per environment
- **Version Control**: Upgrade OpenTelemetry independently from RDCP

### Vendor Agnostic
Works with any OpenTelemetry-compatible backend:
- ✅ Jaeger
- ✅ Zipkin  
- ✅ DataDog
- ✅ New Relic
- ✅ Honeycomb
- ✅ AWS X-Ray
- ✅ Google Cloud Trace

### Enterprise Ready
- **Clean Dependencies**: No forced OpenTelemetry installation
- **Testable**: Each package independently testable
- **Scalable**: Performance control for high-volume environments
- **Compliant**: Maintains RDCP v1.0 protocol compliance

---

## 📋 Implementation Checklist

### Phase 1: Core Hooks ✅ (COMPLETED)
- [x] Add `TraceProvider` interface to core SDK
- [x] Add `TraceContext` interface
- [x] Modify debug system to support trace enrichment
- [x] Add `setTraceProvider()` method
- [x] Update protocol discovery to show OTel capabilities
- [x] Add comprehensive tests (15 tests covering all scenarios)
- [x] Update TypeScript types (no `any` types)
- [x] Maintain RDCP v1.0 compliance

### Phase 2: Plugin Package ✅ (COMPLETED)
- [x] Create `@rdcp.dev/otel-plugin` package structure
- [x] Implement `OpenTelemetryProvider` class following Context7 patterns
- [x] Create easy setup function (`setupRDCPWithOpenTelemetry`)
- [x] Add peer dependency management (OpenTelemetry API)
- [x] Write comprehensive plugin-specific tests (15 tests)
- [x] Create plugin documentation and README
- [x] Follow WARP.md compliance (all files under limits)
- [x] Enterprise-ready error handling and configuration

### Phase 3: Examples & Documentation ⏳
- [x] Create customer integration examples
- [x] Write migration guide (basic → enhanced)
- [x] Performance benchmarking documentation
- [x] Enterprise deployment guides
- [x] Multi-backend configuration examples
- [x] DataDog Quickstart (10-minute setup)
- [x] New Relic Quickstart (10-minute setup)
- [ ] **TODO**: Honeycomb Quickstart (10-minute setup)
- [ ] **TODO**: AWS X-Ray Quickstart (10-minute setup)
- [ ] **TODO**: Expand Security & Compliance docs with vendor-specific notes

---

## 🚀 Current Status

**Phase 1**: ✅ **COMPLETED** - Core trace provider hooks implemented
**Phase 2**: ✅ **COMPLETED** - OpenTelemetry plugin package created  
**Branch**: `feature/opentelemetry`  
**Next Steps**: Phase 3 - Enhanced examples and enterprise deployment guides

### What's Available Now

**Core SDK (`@rdcp/server`):**
- ✅ `TraceProvider` interface
- ✅ `setTraceProvider()` function
- ✅ Enhanced debug system with trace correlation
- ✅ Protocol discovery shows OpenTelemetry status

**Plugin Package (`@rdcp.dev/otel-plugin`):**
- ✅ `OpenTelemetryProvider` class
- ✅ `setupRDCPWithOpenTelemetry()` one-line setup
- ✅ Enterprise configuration options
- ✅ Comprehensive error handling
- ✅ Full TypeScript support

---

*This roadmap ensures we build enterprise-grade OpenTelemetry integration while maintaining the simplicity and protocol compliance that makes RDCP successful.*