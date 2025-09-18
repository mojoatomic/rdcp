// Source-based test for @rdcp/otel-plugin
// Tests TypeScript source directly without module system issues

import { OpenTelemetryProvider } from '../src/provider'
import { 
  setupRDCPWithOpenTelemetry,
  disableRDCPOpenTelemetry,
  isRDCPOpenTelemetryActive,
  createOpenTelemetryProvider
} from '../src/setup'

// Mock the @rdcp/server dependency for source testing
jest.mock('@rdcp/server', () => ({
  setTraceProvider: jest.fn(),
  getTraceProviderStatus: jest.fn(() => ({ enabled: true, provider: 'opentelemetry' }))
}))

// Mock OpenTelemetry API
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: jest.fn(() => ({
      spanContext: jest.fn(() => ({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: 'abcdef1234567890'
      }))
    })),
    isSpanContextValid: jest.fn(() => true),
    getTracer: jest.fn(() => ({ name: 'test-tracer' }))
  },
  propagation: {
    getActiveBaggage: jest.fn(() => ({
      getAllEntries: jest.fn(() => [
        ['userId', { value: '12345' }],
        ['sessionId', { value: 'session-abc' }]
      ])
    }))
  }
}))

describe('@rdcp/otel-plugin Source Tests', () => {
  describe('OpenTelemetryProvider', () => {
    it('can be instantiated and has expected methods', () => {
      const provider = new OpenTelemetryProvider()
      
      expect(provider).toBeInstanceOf(OpenTelemetryProvider)
      expect(typeof provider.getCurrentTraceContext).toBe('function')
      expect(typeof provider.isConfigured).toBe('function')
      expect(typeof provider.getProviderInfo).toBe('function')
    })

    it('extracts trace context when available', () => {
      const provider = new OpenTelemetryProvider()
      const context = provider.getCurrentTraceContext()
      
      expect(context).toEqual({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: 'abcdef1234567890',
        baggage: {
          userId: '12345',
          sessionId: 'session-abc'
        }
      })
    })

    it('provides debug information', () => {
      const provider = new OpenTelemetryProvider()
      const info = provider.getProviderInfo()
      
      expect(info).toEqual({
        name: 'OpenTelemetryProvider',
        version: '1.0.0',
        configured: true
      })
    })
  })

  describe('Setup Functions', () => {
    it('createOpenTelemetryProvider factory works', () => {
      const provider = createOpenTelemetryProvider()
      expect(provider).toBeInstanceOf(OpenTelemetryProvider)
    })

    it('setup functions exist and are callable', () => {
      expect(typeof setupRDCPWithOpenTelemetry).toBe('function')
      expect(typeof disableRDCPOpenTelemetry).toBe('function')
      expect(typeof isRDCPOpenTelemetryActive).toBe('function')
    })

    it('setup functions can be called without throwing', () => {
      expect(() => {
        setupRDCPWithOpenTelemetry({ enableTraceCorrelation: false })
      }).not.toThrow()
      
      expect(() => {
        disableRDCPOpenTelemetry()
      }).not.toThrow()
      
      expect(() => {
        const isActive = isRDCPOpenTelemetryActive()
        expect(typeof isActive).toBe('boolean')
      }).not.toThrow()
    })
  })

  describe('TypeScript Type Safety (WARP Compliance)', () => {
    it('maintains strict type safety - no any types', () => {
      const provider: OpenTelemetryProvider = new OpenTelemetryProvider()
      const context = provider.getCurrentTraceContext()
      
      if (context) {
        // TypeScript will catch any typing issues here
        expect(typeof context.traceId).toBe('string')
        expect(typeof context.spanId).toBe('string')
        expect(typeof context.baggage).toBe('object')
      }
    })
  })
})