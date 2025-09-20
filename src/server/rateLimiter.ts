/*
 * In-memory token bucket rate limiter for RDCP core
 */

export interface RateLimitRule {
  windowMs: number
  maxRequests: number
}

export interface RateLimitConfig {
  enabled: boolean
  defaultRule: RateLimitRule
  perEndpoint?: Record<string, Partial<RateLimitRule>>
  perTenant?: Record<string, Partial<RateLimitRule>>
}

interface BucketState {
  tokens: number
  lastRefill: number
  capacity: number
  refillPerMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
  limit: number
}

export class TokenBucketLimiter {
  private buckets: Map<string, BucketState>
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    this.buckets = new Map()
  }

  private resolveRule(keyParts: { endpoint: string; tenantId: string | null }): RateLimitRule {
    const { endpoint, tenantId } = keyParts
    const fromEndpoint = this.config.perEndpoint?.[endpoint] ?? {}
    const fromTenant = tenantId ? this.config.perTenant?.[tenantId] ?? {} : {}
    const rule = {
      windowMs: this.config.defaultRule.windowMs,
      maxRequests: this.config.defaultRule.maxRequests,
      ...fromEndpoint,
      ...fromTenant,
    }
    // Coerce to numbers and sensible minimums
    const windowMs = Math.max(1, Math.floor(Number(rule.windowMs)))
    const maxRequests = Math.max(1, Math.floor(Number(rule.maxRequests)))
    return { windowMs, maxRequests }
  }

  private bucketFor(key: string, rule: RateLimitRule): BucketState {
    let b = this.buckets.get(key)
    const now = Date.now()
    if (!b) {
      const refillPerMs = rule.maxRequests / rule.windowMs
      b = {
        tokens: rule.maxRequests,
        lastRefill: now,
        capacity: rule.maxRequests,
        refillPerMs,
      }
      this.buckets.set(key, b)
      return b
    }
    // Refill based on elapsed time
    const elapsed = now - b.lastRefill
    if (elapsed > 0) {
      b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMs)
      b.lastRefill = now
    }
    // If capacity changed due to rule update, adjust
    if (b.capacity !== rule.maxRequests) {
      b.capacity = rule.maxRequests
      b.refillPerMs = rule.maxRequests / rule.windowMs
      b.tokens = Math.min(b.capacity, b.tokens)
    }
    return b
  }

  check(keyParts: { endpoint: string; tenantId: string | null }): RateLimitResult {
    const rule = this.resolveRule(keyParts)
    const key = `${keyParts.tenantId ?? 'global'}|${keyParts.endpoint}`
    const b = this.bucketFor(key, rule)

    const allowed = b.tokens >= 1
    if (allowed) {
      b.tokens -= 1
      const remaining = Math.floor(b.tokens)
      const deficit = Math.max(0, 1 - b.tokens)
      // time until we get 1 token again
      const resetMs = Math.ceil(deficit / b.refillPerMs)
      return { allowed: true, remaining, resetMs, limit: b.capacity }
    }
    // Not allowed: compute time until next token
    const deficit = 1 - b.tokens
    const resetMs = Math.ceil(deficit / b.refillPerMs)
    const remaining = 0
    return { allowed: false, remaining, resetMs, limit: b.capacity }
  }
}