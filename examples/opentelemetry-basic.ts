// Example: Basic OpenTelemetry Integration with RDCP SDK
// This shows how Phase 1 trace provider integration works

import { setTraceProvider, debug, enableDebugCategories } from '@rdcp/server'
import type { TraceProvider, TraceContext } from '@rdcp/server'

// Example: Simple Mock TraceProvider (for demonstration)
class MockTraceProvider implements TraceProvider {
  getCurrentTraceContext(): TraceContext | null {
    // In real implementation, this would get the active trace from OpenTelemetry
    return {
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: 'abcdef1234567890',
      baggage: { userId: '12345' }
    }
  }
}

// Example usage:
function setupRDCPWithTracing() {
  // 1. Create and set the trace provider
  const traceProvider = new MockTraceProvider()
  setTraceProvider(traceProvider)
  
  // 2. Enable debug categories you want to use
  enableDebugCategories(['DATABASE', 'API_ROUTES', 'QUERIES'])
  
  console.log('✅ RDCP with trace correlation enabled!')
}

// Example debug usage - now includes trace correlation automatically:
function exampleUsage() {
  setupRDCPWithTracing()
  
  // These debug calls will now include trace context:
  debug.database('Connection pool initialized', { poolSize: 10 })
  // Output: 🔌 [DB] [trace:90abcdef] Connection pool initialized [{ poolSize: 10 }]
  
  debug.api('Processing user request', { method: 'GET', path: '/users/123' })
  // Output: 🔍 [API] [trace:90abcdef] Processing user request [{ method: 'GET', path: '/users/123' }]
  
  debug.query('Executing SQL query', { sql: 'SELECT * FROM users WHERE id = ?', params: [123] })
  // Output: 🚀 [QUERY] [trace:90abcdef] Executing SQL query [{ sql: 'SELECT * FROM users WHERE id = ?', params: [123] }]
}

// Example: Disable trace correlation
function disableTracing() {
  setTraceProvider(null)
  console.log('✅ Trace correlation disabled - debug logs work normally')
}

// In Phase 2, this will be replaced with:
// import { setupRDCPWithOpenTelemetry } from '@rdcp/otel-plugin'
// setupRDCPWithOpenTelemetry(rdcpClient)

export { setupRDCPWithTracing, exampleUsage, disableTracing }