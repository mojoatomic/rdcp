import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import type { JWK } from 'jose'

export interface JwksCacheEntry {
  jwks: { keys: JWK[] }
  etag?: string
  lastFetched: number
  ttlMs?: number
}

export interface JwksCacheStore {
  get(url: string): Promise<JwksCacheEntry | undefined>
  set(url: string, entry: JwksCacheEntry): Promise<void>
  del(url: string): Promise<void>
}

export class FileJwksCache implements JwksCacheStore {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? join(tmpdir(), 'rdcp-jwks-cache')
  }

  private keyToPath(url: string): string {
    const h = createHash('sha256').update(url).digest('hex')
    return join(this.baseDir, `${h}.json`)
  }

  async get(url: string): Promise<JwksCacheEntry | undefined> {
    try {
      const p = this.keyToPath(url)
      const data = await fs.readFile(p, 'utf8')
      const parsed = JSON.parse(data) as unknown
      // Minimal shape validation without any types
      const obj = parsed as {
        jwks?: { keys?: unknown[] }
        lastFetched?: number
        etag?: string
        ttlMs?: number
      }
      if (
        !obj.jwks ||
        !Array.isArray(obj.jwks.keys) ||
        typeof obj.lastFetched !== 'number'
      )
        return undefined
      const ret: JwksCacheEntry = {
        jwks: { keys: obj.jwks.keys as JWK[] },
        lastFetched: obj.lastFetched,
      }
      if (typeof obj.etag === 'string') ret.etag = obj.etag
      if (typeof obj.ttlMs === 'number') ret.ttlMs = obj.ttlMs
      return ret
    } catch {
      return undefined
    }
  }

  async set(url: string, entry: JwksCacheEntry): Promise<void> {
    const p = this.keyToPath(url)
    // Ensure directory exists
    await fs.mkdir(this.baseDir, { recursive: true })
    const tmp = `${p}.tmp-${Date.now()}`
    const payload = JSON.stringify(entry)
    await fs.writeFile(tmp, payload, 'utf8')
    await fs.rename(tmp, p)
  }

  async del(url: string): Promise<void> {
    try {
      const p = this.keyToPath(url)
      await fs.unlink(p)
    } catch {
      // noop
    }
  }
}
//
