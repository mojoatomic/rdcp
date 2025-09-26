declare module '@rdcp.dev/server' {
  export type TraceContext = {
    traceId: string
    spanId: string
    baggage?: Record<string, string>
  }

  export interface TraceProvider {
    getCurrentTraceContext(): TraceContext | null
    isConfigured?(): boolean
    getProviderInfo?(): { name: string; version: string; configured: boolean }
  }

  export function setTraceProvider(provider: TraceProvider | null): void

  export function getTraceProviderStatus(): {
    enabled: boolean
    provider: string
  }
}
