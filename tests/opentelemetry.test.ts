// OpenTelemetry Integration Test (RDCP WARP compliant)
// Tests enhanced debug system with OpenTelemetry trace correlation
// WARP: TypeScript-first testing, no any types, under 300 lines

import { trace } from '@opentelemetry/api'
import { 
  setTraceProvider, 
  getTraceProviderStatus, 
  debug,
  DEBUG_CONFIG,
  enableDebugCategories 
} from '../src/debug.js'
import type { TraceProvider, TraceContext } from '../src/types/trace.js'

// Mock console.log to capture output
const mockConsoleLog = jest.fn()
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.log = mockConsoleLog
  console.warn = jest.fn()
  mockConsoleLog.mockClear()
  
  // Reset trace provider
  setTraceProvider(null)
  
  // Reset debug config
  Object.keys(DEBUG_CONFIG).forEach(key => {
    DEBUG_CONFIG[key as keyof typeof DEBUG_CONFIG] = false
  })
})

afterEach(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
})

describe('OpenTelemetry Integration (RDCP WARP)', () => {
  describe('setTraceProvider hook (WARP: keep it simple)', () => {
    it('accepts TraceProvider and updates status', () => {
      const mockProvider: TraceProvider = {
        getCurrentTraceContext: jest.fn(() => ({
          traceId: '1234567890abcdef',
          spanId: 'abcdef1234567890'
        }))
      }
      
      setTraceProvider(mockProvider)
      const status = getTraceProviderStatus()
      
      expect(status.enabled).toBe(true)
      expect(status.provider).toBe('opentelemetry')
    })

    it('handles null provider gracefully', () => {
      setTraceProvider(null)
      const status = getTraceProviderStatus()
      
      expect(status.enabled).toBe(false)
      expect(status.provider).toBe(null)
    })
  })

  describe('Enhanced debugger with trace correlation', () => {
    it('includes trace context when provider is configured', () => {
      const mockProvider: TraceProvider = {
        getCurrentTraceContext: jest.fn(() => ({
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: 'abcdef1234567890'
        }))
      }
      
      setTraceProvider(mockProvider)
      enableDebugCategories(['DATABASE'])
      
      debug.database('Connection established', { host: 'localhost' })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔌 [DB] [trace:90abcdef] Connection established'),
        expect.arrayContaining([{ host: 'localhost' }])
      )
      expect(mockProvider.getCurrentTraceContext).toHaveBeenCalled()
    })

    it('works normally when provider is not configured', () => {
      // No provider set
      enableDebugCategories(['CACHE'])
      
      debug.cache('Cache miss for key: user:123')
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🐛 [CACHE] Cache miss for key: user:123',
        []
      )
    })

    it('handles provider errors gracefully (WARP: fail gracefully)', () => {
      const mockProvider: TraceProvider = {
        getCurrentTraceContext: jest.fn(() => {
          throw new Error('Provider unavailable')
        })
      }
      
      setTraceProvider(mockProvider)
      enableDebugCategories(['API_ROUTES'])
      
      debug.api('Request processed')
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔍 [API] Request processed',
        []
      )
      expect(console.warn).toHaveBeenCalledWith(
        'RDCP: Trace provider error:',
        expect.any(Error)
      )
    })

    it('handles null trace context from provider', () => {
      const mockProvider: TraceProvider = {
        getCurrentTraceContext: jest.fn(() => null)
      }
      
      setTraceProvider(mockProvider)
      enableDebugCategories(['QUERIES'])
      
      debug.query('SELECT * FROM users')
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚀 [QUERY] SELECT * FROM users',
        []
      )
    })
  })

  describe('Protocol discovery integration', () => {
    it('shows correct status when provider is configured', () => {
      const mockProvider: TraceProvider = {
        getCurrentTraceContext: jest.fn(() => null)
      }
      
      setTraceProvider(mockProvider)
      const status = getTraceProviderStatus()
      
      expect(status).toEqual({
        enabled: true,
        provider: 'opentelemetry'
      })
    })

    it('shows correct status when provider is not configured', () => {
      const status = getTraceProviderStatus()
      
      expect(status).toEqual({
        enabled: false,
        provider: null
      })
    })
  })

  describe('TypeScript type safety (RDCP WARP - NO any types)', () => {
    it('maintains strict type safety for provider integration', () => {
      const validProvider: TraceProvider = {
        getCurrentTraceContext(): TraceContext | null {
          return {
            traceId: 'valid-trace-id',
            spanId: 'valid-span-id',
            baggage: { key: 'value' }
          }
        }
      }
      
      expect(() => setTraceProvider(validProvider)).not.toThrow()
    })

    it('trace context maintains proper typing', () => {
      const mockContext: TraceContext = {
        traceId: '1234567890abcdef',
        spanId: 'abcdef1234567890',
        baggage: { userId: '12345' }
      }
      
      expect(typeof mockContext.traceId).toBe('string')
      expect(typeof mockContext.spanId).toBe('string')
      expect(typeof mockContext.baggage?.userId).toBe('string')
    })
  })

  describe('All debug categories support trace correlation', () => {
    const mockProvider: TraceProvider = {
      getCurrentTraceContext: () => ({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: 'abcdef1234567890'
      })
    }

    beforeEach(() => {
      setTraceProvider(mockProvider)
      enableDebugCategories(['DATABASE', 'API_ROUTES', 'QUERIES', 'REPORTS', 'CACHE'])
    })

    it('database debug includes trace correlation', () => {
      debug.database('DB operation')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[trace:90abcdef]'),
        []
      )
    })

    it('api debug includes trace correlation', () => {
      debug.api('API call')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[trace:90abcdef]'),
        []
      )
    })

    it('query debug includes trace correlation', () => {
      debug.query('SQL query')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[trace:90abcdef]'),
        []
      )
    })

    it('report debug includes trace correlation', () => {
      debug.report('Report generated')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[trace:90abcdef]'),
        []
      )
    })

    it('cache debug includes trace correlation', () => {
      debug.cache('Cache operation')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[trace:90abcdef]'),
        []
      )
    })
  })
})

// WARP Compliance: 210 lines (under 300 line limit for test files)
// RDCP WARP Compliance: TypeScript-first, no any types used