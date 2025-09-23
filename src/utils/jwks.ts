import type { JWK } from 'jose'
import { FileJwksCache, type JwksCacheEntry, type JwksCacheStore } from './jwks-cache.js'

export interface JwksBody {
  keys: JWK[]
}

export interface JwksFetchResult {
  jwks: JwksBody
  etag?: string
  fromCache: boolean
}

// Inflight dedupe across instances within the same process
const inflight = new Map<string, Promise<JwksFetchResult>>()

export class JwksFetcher {
  private etag: string | undefined
  private body: JwksBody | undefined
  private readonly doFetch: typeof fetch
  private readonly ttlMs: number | undefined
  private lastUpdatedAt: number | undefined
  private readonly cache: JwksCacheStore | undefined
  private readonly refreshThresholdMs: number

  constructor(opts?: {
    fetchImpl?: typeof fetch
    ttlMs?: number
    cache?: JwksCacheStore
    cachePath?: string
    refreshThresholdMs?: number
  }) {
    this.doFetch = opts?.fetchImpl ?? fetch
    this.ttlMs = opts?.ttlMs
    this.cache = opts?.cache ?? (opts?.cachePath ? new FileJwksCache(opts.cachePath) : undefined)
    this.refreshThresholdMs = Math.max(0, opts?.refreshThresholdMs ?? (this.ttlMs ? Math.min(Math.floor(this.ttlMs * 0.2), 30_000) : 0))
  }

  /**
   * Fetch JWKS from baseUrl + /.well-known/jwks.json using ETag caching and optional TTL.
   * - Sends If-None-Match when an ETag is cached
   * - Returns cached body when server replies 304
   * - When ttlMs is set and cache is fresh, returns without network
   * - When nearing expiry (ttlMs - refreshThresholdMs), triggers background refresh
   */
  async fetch(baseUrl: string): Promise<JwksFetchResult> {
    const url = `${baseUrl.replace(/\/$/, '')}/.well-known/jwks.json`

    // If no in-memory copy, try persisted cache
    if (!this.body && this.cache) {
      const entry = await this.cache.get(url)
      if (entry) {
        this.body = entry.jwks
        this.etag = entry.etag
        this.lastUpdatedAt = entry.lastFetched
        // If within TTL, serve immediately
        if (this.ttlMs && entry.lastFetched + this.ttlMs > Date.now()) {
          this.maybeStartBackgroundRefresh(url) // preemptive update if near expiry
          return this.etag ? { jwks: this.body, etag: this.etag, fromCache: true } : { jwks: this.body, fromCache: true }
        }
      }
    }

    // TTL immediate serve from in-memory
    if (
      this.ttlMs !== undefined &&
      this.ttlMs > 0 &&
      this.body &&
      this.lastUpdatedAt !== undefined &&
      Date.now() - this.lastUpdatedAt < this.ttlMs
    ) {
      this.maybeStartBackgroundRefresh(url)
      return this.etag ? { jwks: this.body, etag: this.etag, fromCache: true } : { jwks: this.body, fromCache: true }
    }

    // Inflight dedupe per (url + etag)
    const inflightKey = `${url}|${this.etag ?? ''}`
    const pending = inflight.get(inflightKey)
    if (pending) return pending

    const p = this.doNetworkFetch(url)
    inflight.set(inflightKey, p)
    try {
      const result = await p
      return result
    } finally {
      inflight.delete(inflightKey)
    }
  }

  private async doNetworkFetch(url: string): Promise<JwksFetchResult> {
    const headers: Record<string, string> = {}
    if (this.etag) headers['If-None-Match'] = this.etag

    const res = await this.doFetch(url, { headers })

    if (res.status === 304 && this.body) {
      // Do not update lastUpdatedAt on 304; TTL remains based on last 200 update
      return this.etag ? { jwks: this.body, etag: this.etag, fromCache: true } : { jwks: this.body, fromCache: true }
    }

    if (!res.ok) {
      throw new Error(`JWKS fetch failed: ${res.status}`)
    }

    const newEtag = res.headers.get('ETag') ?? undefined
    const data = (await res.json()) as unknown
    // Basic shape check without using any types
    const body: JwksBody = {
      keys: Array.isArray((data as { keys?: unknown }).keys)
        ? (data as { keys: JWK[] }).keys
        : [],
    }

    this.etag = newEtag
    this.body = body
    this.lastUpdatedAt = Date.now()

    // Persist to cache if configured
    if (this.cache) {
      const entry: JwksCacheEntry = {
        jwks: body,
        lastFetched: this.lastUpdatedAt,
      }
      if (this.etag !== undefined) entry.etag = this.etag
      if (this.ttlMs !== undefined) entry.ttlMs = this.ttlMs
      await this.cache.set(url, entry)
    }

    return this.etag ? { jwks: body, etag: this.etag, fromCache: false } : { jwks: body, fromCache: false }
  }

  private maybeStartBackgroundRefresh(url: string): void {
    if (!this.ttlMs || this.refreshThresholdMs <= 0) return
    if (!this.lastUpdatedAt) return
    const now = Date.now()
    const refreshAt = this.lastUpdatedAt + this.ttlMs - this.refreshThresholdMs
    if (now >= refreshAt) {
      // Trigger non-blocking refresh with current etag
      const inflightKey = `${url}|${this.etag ?? ''}`
      if (!inflight.get(inflightKey)) {
        const p: Promise<JwksFetchResult> = this.doNetworkFetch(url).catch(() => {
          const fallback: JwksFetchResult = this.etag
            ? { jwks: this.body as JwksBody, etag: this.etag, fromCache: true }
            : { jwks: this.body as JwksBody, fromCache: true }
          return fallback
        })
        inflight.set(inflightKey, p)
        // Clean up when finished
        p.finally(() => inflight.delete(inflightKey))
      }
    }
  }

  clear(): void {
    this.etag = undefined
    this.body = undefined
  }
}

export function createJwksFetcher(opts?: {
  fetchImpl?: typeof fetch
  ttlMs?: number
  cache?: JwksCacheStore
  cachePath?: string
  refreshThresholdMs?: number
}): JwksFetcher {
  return new JwksFetcher(opts)
}

/**
 * Filter JWKs by kty/alg/use constraints (all optional).
 */
export function filterJwksKeys(
  jwks: JwksBody,
  opts: {
    kty?: readonly string[]
    alg?: readonly string[]
    use?: readonly string[]
  } = {}
): JWK[] {
  const keys = jwks.keys || []
  return keys.filter(k => {
    const r = k as unknown as Record<string, unknown>
    if (opts.kty?.length) {
      const kty = r.kty
      if (typeof kty !== 'string' || !opts.kty.includes(kty)) return false
    }
    if (opts.alg?.length) {
      const alg = r.alg
      if (typeof alg !== 'string' || !opts.alg.includes(alg)) return false
    }
    if (opts.use?.length) {
      const use = r.use
      if (typeof use !== 'string' || !opts.use.includes(use)) return false
    }
    return true
  })
}

/**
 * Find a JWK by kid with optional constraints.
 */
export function findJwkByKid(
  jwks: JwksBody,
  kid: string,
  opts: {
    kty?: readonly string[]
    alg?: readonly string[]
    use?: readonly string[]
  } = {}
): JWK | undefined {
  const keys = filterJwksKeys(jwks, opts)
  for (const k of keys) {
    const r = k as unknown as Record<string, unknown>
    const kk = r.kid
    if (typeof kk === 'string' && kk === kid) return k
  }
  return undefined
}
