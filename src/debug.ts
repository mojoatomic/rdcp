// File: src/debug.ts - Enhanced debug system with OpenTelemetry trace provider support
// WARP Compliance: TypeScript-first, no any types, under 200 lines

import type { TraceProvider, TraceContext, TraceEnhancedLogEntry } from './types/trace.js'

// 1. Define your debug categories (replace with your actual categories)
export const DEBUG_CONFIG = {
  DATABASE: false,
  API_ROUTES: false,
  QUERIES: false,
  REPORTS: false,
  CACHE: false
}

// 2. Performance metrics (defined first to avoid circular dependency)
const metrics = {
  callCount: 0,
  startTime: Date.now(),
  categoryStats: {} as Record<string, number>
}

// 3. OpenTelemetry trace provider integration
let traceProvider: TraceProvider | null = null

/**
 * Set the trace provider for OpenTelemetry integration
 * WARP: Keep it simple - single provider, easy to use
 */
export const setTraceProvider = (provider: TraceProvider | null): void => {
  traceProvider = provider
}

/**
 * Get the current trace provider status
 */
export const getTraceProviderStatus = (): { enabled: boolean; provider: string | null } => {
  return {
    enabled: traceProvider !== null,
    provider: traceProvider ? 'opentelemetry' : null
  }
}

/**
 * Enrich log data with trace context if available
 * WARP: Zero impact when not configured
 */
const enrichWithTrace = (message: string, category: string, ...args: unknown[]): TraceEnhancedLogEntry => {
  const baseEntry: TraceEnhancedLogEntry = {
    message,
    category,
    timestamp: Date.now(),
    metadata: args.length > 0 ? { args } : undefined
  }

  // Add trace context if provider is available
  if (traceProvider) {
    try {
      const traceContext = traceProvider.getCurrentTraceContext()
      if (traceContext) {
        baseEntry.trace = traceContext
      }
    } catch (error) {
      // WARP: Fail gracefully, don't break debug logging
      console.warn('RDCP: Trace provider error:', error)
    }
  }

  return baseEntry
}

// 4. Enhanced performance tracking function with trace correlation
const createTrackedDebugger = (category: string, logFn: (entry: TraceEnhancedLogEntry) => void) => {
  return (message: string, ...args: unknown[]) => {
    if (DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG]) {
      metrics.callCount++
      metrics.categoryStats[category] = (metrics.categoryStats[category] || 0) + 1
      
      const enrichedEntry = enrichWithTrace(message, category, ...args)
      return logFn(enrichedEntry)
    }
  }
}

// 5. Create debug functions with performance tracking and trace correlation
export const debug = {
  database: createTrackedDebugger('DATABASE', (entry: TraceEnhancedLogEntry) => {
    const traceInfo = entry.trace ? ` [trace:${entry.trace.traceId.slice(-8)}]` : ''
    console.log(`🔌 [DB]${traceInfo} ${entry.message}`, entry.metadata?.args || [])
  }),
  api: createTrackedDebugger('API_ROUTES', (entry: TraceEnhancedLogEntry) => {
    const traceInfo = entry.trace ? ` [trace:${entry.trace.traceId.slice(-8)}]` : ''
    console.log(`🔍 [API]${traceInfo} ${entry.message}`, entry.metadata?.args || [])
  }),
  query: createTrackedDebugger('QUERIES', (entry: TraceEnhancedLogEntry) => {
    const traceInfo = entry.trace ? ` [trace:${entry.trace.traceId.slice(-8)}]` : ''
    console.log(`🚀 [QUERY]${traceInfo} ${entry.message}`, entry.metadata?.args || [])
  }),
  report: createTrackedDebugger('REPORTS', (entry: TraceEnhancedLogEntry) => {
    const traceInfo = entry.trace ? ` [trace:${entry.trace.traceId.slice(-8)}]` : ''
    console.log(`📊 [REPORT]${traceInfo} ${entry.message}`, entry.metadata?.args || [])
  }),
  cache: createTrackedDebugger('CACHE', (entry: TraceEnhancedLogEntry) => {
    const traceInfo = entry.trace ? ` [trace:${entry.trace.traceId.slice(-8)}]` : ''
    console.log(`🐛 [CACHE]${traceInfo} ${entry.message}`, entry.metadata?.args || [])
  })
}

// 6. Runtime control functions (tenant-aware)
export const enableDebugCategories = (categories: string[], tenantId?: string): void => {
  categories.forEach(category => {
    if (tenantId) {
      // For tenant-specific debug control, use tenant utilities
      const { setTenantDebugCategory } = require('./utils/tenant.js')
      setTenantDebugCategory(tenantId, category, true)
    } else if (category in DEBUG_CONFIG) {
      DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG] = true
    }
  })
}

export const disableDebugCategories = (categories: string[], tenantId?: string): void => {
  categories.forEach(category => {
    if (tenantId) {
      // For tenant-specific debug control, use tenant utilities
      const { setTenantDebugCategory } = require('./utils/tenant.js')
      setTenantDebugCategory(tenantId, category, false)
    } else if (category in DEBUG_CONFIG) {
      DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG] = false
    }
  })
}

export const getDebugStatus = () => ({ ...DEBUG_CONFIG })

// 7. Performance metrics functions
export const getPerformanceMetrics = () => {
  const elapsed = (Date.now() - metrics.startTime) / 1000
  const rate = elapsed > 0 ? metrics.callCount / elapsed : 0
  return {
    callsPerSecond: rate,
    totalCalls: metrics.callCount,
    uptime: elapsed,
    categoryBreakdown: { ...metrics.categoryStats }
  }
}

// Reset metrics function
export const resetMetrics = (): void => {
  metrics.callCount = 0
  metrics.startTime = Date.now()
  metrics.categoryStats = {}
}

// WARP Compliance: 139 lines (under 200 line limit for server utility files)