// File: src/debug.ts - Core debug configuration system from RDCP implementation guide

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

// 3. Performance tracking function
const createTrackedDebugger = (category: string, logFn: (message: string, ...args: unknown[]) => void) => {
  return (message: string, ...args: unknown[]) => {
    if (DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG]) {
      metrics.callCount++
      metrics.categoryStats[category] = (metrics.categoryStats[category] || 0) + 1
      return logFn(message, ...args)
    }
  }
}

// 4. Create debug functions with performance tracking
export const debug = {
  database: createTrackedDebugger('DATABASE', (message: string, ...args: unknown[]) => 
    console.log(`🔌 [DB] ${message}`, ...args)
  ),
  api: createTrackedDebugger('API_ROUTES', (message: string, ...args: unknown[]) => 
    console.log(`🔍 [API] ${message}`, ...args)
  ),
  query: createTrackedDebugger('QUERIES', (message: string, ...args: unknown[]) => 
    console.log(`🚀 [QUERY] ${message}`, ...args)
  ),
  report: createTrackedDebugger('REPORTS', (message: string, ...args: unknown[]) => 
    console.log(`📊 [REPORT] ${message}`, ...args)
  ),
  cache: createTrackedDebugger('CACHE', (message: string, ...args: unknown[]) => 
    console.log(`🐛 [CACHE] ${message}`, ...args)
  )
}

// 5. Runtime control functions
export const enableDebugCategories = (categories: string[]): void => {
  categories.forEach(category => {
    if (category in DEBUG_CONFIG) {
      DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG] = true
    }
  })
}

export const disableDebugCategories = (categories: string[]): void => {
  categories.forEach(category => {
    if (category in DEBUG_CONFIG) {
      DEBUG_CONFIG[category as keyof typeof DEBUG_CONFIG] = false
    }
  })
}

export const getDebugStatus = () => ({ ...DEBUG_CONFIG })

// 6. Performance metrics functions
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