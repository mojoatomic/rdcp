import type { JWK } from 'jose'

export interface JwksBody {
  keys: JWK[]
}

export interface JwksFetchResult {
  jwks: JwksBody
  etag?: string
  fromCache: boolean
}

export class JwksFetcher {
  private etag: string | undefined
  private body: JwksBody | undefined
  private readonly doFetch: typeof fetch

  constructor(opts?: { fetchImpl?: typeof fetch }) {
    this.doFetch = opts?.fetchImpl ?? fetch
  }

  /**
   * Fetch JWKS from baseUrl + /.well-known/jwks.json using ETag caching.
   * - Sends If-None-Match when an ETag is cached
   * - Returns cached body when server replies 304
   */
  async fetch(baseUrl: string): Promise<JwksFetchResult> {
    const headers: Record<string, string> = {}
    if (this.etag) headers['If-None-Match'] = this.etag

    const url = `${baseUrl.replace(/\/$/, '')}/.well-known/jwks.json`
    const res = await this.doFetch(url, { headers })

    if (res.status === 304 && this.body) {
      const result: JwksFetchResult =
        this.etag !== undefined
          ? { jwks: this.body, etag: this.etag, fromCache: true }
          : { jwks: this.body, fromCache: true }
      return result
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
    if (this.etag !== undefined) {
      return { jwks: body, etag: this.etag, fromCache: false }
    }
    return { jwks: body, fromCache: false }
  }

  clear(): void {
    this.etag = undefined
    this.body = undefined
  }
}

export function createJwksFetcher(opts?: {
  fetchImpl?: typeof fetch
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
