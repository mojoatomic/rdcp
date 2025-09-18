# OpenTelemetry Integration Roadmap

**Enterprise SDK Architecture for RDCP OpenTelemetry Integration**

## Vision: Clean Abstraction for Enterprise Customers

The goal is to create a flexible, enterprise-grade integration that allows customers to choose their level of OpenTelemetry integration without forcing dependencies.

---

## 📦 Planned SDK Architecture

### Core Package Structure
```
@rdcp/server                 # Core RDCP functionality (current)
@rdcp/otel-plugin           # OpenTelemetry integration (planned)
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
**Goal**: Create separate `@rdcp/otel-plugin` package

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
export function setupRDCPWithOpenTelemetry(rdcpClient: RDCPClient) {
  rdcpClient.setTraceProvider(new OpenTelemetryProvider())
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
import { setupRDCPWithOpenTelemetry } from '@rdcp/otel-plugin'

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

### Phase 1: Core Hooks ⚠️
- [ ] Add `TraceProvider` interface to core SDK
- [ ] Add `TraceContext` interface
- [ ] Modify debug system to support trace enrichment
- [ ] Add `setTraceProvider()` method
- [ ] Update protocol discovery to show OTel capabilities
- [ ] Add comprehensive tests
- [ ] Update TypeScript types (no `any` types)
- [ ] Maintain RDCP v1.0 compliance

### Phase 2: Plugin Package ⏳
- [ ] Create `@rdcp/otel-plugin` package structure
- [ ] Implement `OpenTelemetryProvider` class
- [ ] Create easy setup function
- [ ] Add peer dependency management
- [ ] Write plugin-specific tests
- [ ] Create plugin documentation
- [ ] Publish to npm registry

### Phase 3: Examples & Documentation ⏳
- [ ] Create customer integration examples
- [ ] Write migration guide (basic → enhanced)
- [ ] Performance benchmarking documentation
- [ ] Enterprise deployment guides
- [ ] Multi-backend configuration examples

---

## 🚀 Current Status

**Phase 1**: Starting implementation of core trace provider hooks
**Branch**: `feature/opentelemetry`  
**Next Steps**: Modify `src/debug.ts` to add trace provider interface

---

*This roadmap ensures we build enterprise-grade OpenTelemetry integration while maintaining the simplicity and protocol compliance that makes RDCP successful.*