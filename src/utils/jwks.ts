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
