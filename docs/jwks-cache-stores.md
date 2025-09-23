# JWKS Cache Stores (Production Patterns)

RDCP's JWKS client supports a pluggable cache interface so deployments can choose the right backend for their platform: memory, filesystem, Redis, DynamoDB, Vercel KV, Kubernetes secrets, and more.

Interface

```ts path=null start=null
export interface JwksCacheStore {
  get(url: string): Promise<{
    jwks: { keys: JWK[] }
    etag?: string
    lastFetched: number
    ttlMs?: number
  } | undefined>
  set(
    url: string,
    entry: { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }
  ): Promise<void>
  del(url: string): Promise<void>
}
```

Usage

```ts path=null start=null
import { createJwksFetcher } from '@rdcp.dev/server'

const fetcher = createJwksFetcher({
  ttlMs: 60_000,
  // Either provide a path for built-in file cache…
  cachePath: '.rdcp-cache',
  // …or a custom store via `cache`
  // cache: new RedisJwksCache(redis),
  refreshThresholdMs: 10_000,
})

const res = await fetcher.fetch('https://issuer.example.com')
// res: { jwks, etag?, fromCache }
```

Production Examples

Redis (most requested)

```ts path=null start=null
import Redis from 'ioredis'
import type { JWK } from 'jose'
import type { JwksCacheStore } from '@rdcp.dev/server'

type Entry = { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }

class RedisJwksCache implements JwksCacheStore {
  constructor(private redis: Redis) {}

  private key(url: string) {
    return `jwks:${url}`
  }

  async get(url: string): Promise<Entry | undefined> {
    const data = await this.redis.get(this.key(url))
    return data ? (JSON.parse(data) as Entry) : undefined
  }

  async set(url: string, entry: Entry): Promise<void> {
    const ttlSec = entry.ttlMs ? Math.ceil(entry.ttlMs / 1000) : 3600
    await this.redis.set(this.key(url), JSON.stringify(entry), 'EX', ttlSec)
  }

  async del(url: string): Promise<void> {
    await this.redis.del(this.key(url))
  }
}
```

Encrypted file cache (encryption at rest)

```ts path=null start=null
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import type { JWK } from 'jose'
import type { JwksCacheStore } from '@rdcp.dev/server'

type Entry = { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }

function hash(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

class EncryptedFileCache implements JwksCacheStore {
  constructor(private key: Buffer, private baseDir: string) {}

  private path(url: string) {
    return join(this.baseDir, `${hash(url)}.bin`)
  }

  private encrypt(plaintext: string): Buffer {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, enc])
  }

  private decrypt(buf: Buffer): string {
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString('utf8')
  }

  async get(url: string): Promise<Entry | undefined> {
    try {
      const p = this.path(url)
      const raw = await fs.readFile(p)
      return JSON.parse(this.decrypt(raw)) as Entry
    } catch {
      return undefined
    }
  }

  async set(url: string, entry: Entry): Promise<void> {
    const p = this.path(url)
    await fs.mkdir(this.baseDir, { recursive: true })
    const tmp = `${p}.tmp-${Date.now()}`
    const payload = this.encrypt(JSON.stringify(entry))
    await fs.writeFile(tmp, payload)
    await fs.rename(tmp, p)
  }

  async del(url: string): Promise<void> {
    try {
      await fs.unlink(this.path(url))
    } catch {}
  }
}
```

AWS Lambda + DynamoDB

```ts path=null start=null
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import type { JWK } from 'jose'
import type { JwksCacheStore } from '@rdcp.dev/server'

type Entry = { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }

class DynamoJwksCache implements JwksCacheStore {
  constructor(private client: DynamoDBClient, private tableName = 'rdcp-jwks-cache') {}

  async get(url: string): Promise<Entry | undefined> {
    const r = await this.client.send(
      new GetItemCommand({ TableName: this.tableName, Key: { url: { S: url } } })
    )
    const item = r.Item
    if (!item || !item.data?.S) return undefined
    return JSON.parse(item.data.S) as Entry
  }

  async set(url: string, entry: Entry): Promise<void> {
    const ttlSec = entry.ttlMs ? Math.ceil(entry.ttlMs / 1000) : 3600
    const expires = Math.floor(Date.now() / 1000) + ttlSec
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          url: { S: url },
          data: { S: JSON.stringify(entry) },
          ttl: { N: String(expires) },
        },
      })
    )
  }

  async del(url: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({ TableName: this.tableName, Key: { url: { S: url } } })
    )
  }
}
```

Vercel Edge Runtime (KV)

```ts path=null start=null
// Pseudo-interface for Vercel KV
declare const kv: {
  get<T>(k: string): Promise<T | null>
  setex(k: string, ttlSec: number, v: unknown): Promise<void>
  del(k: string): Promise<void>
}

import type { JWK } from 'jose'
import type { JwksCacheStore } from '@rdcp.dev/server'

type Entry = { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }

class VercelKVCache implements JwksCacheStore {
  private key(url: string) {
    return `jwks:${url}`
  }
  async get(url: string): Promise<Entry | undefined> {
    const v = await kv.get<Entry>(this.key(url))
    return v ?? undefined
  }
  async set(url: string, entry: Entry): Promise<void> {
    const ttlSec = entry.ttlMs ? Math.ceil(entry.ttlMs / 1000) : 3600
    await kv.setex(this.key(url), ttlSec, entry)
  }
  async del(url: string): Promise<void> {
    await kv.del(this.key(url))
  }
}
```

Kubernetes Secrets (air-gapped)

```ts path=null start=null
// Outline using @kubernetes/client-node (pseudo for brevity)
import type { CoreV1Api } from '@kubernetes/client-node'
import type { JWK } from 'jose'
import type { JwksCacheStore } from '@rdcp.dev/server'

type Entry = { jwks: { keys: JWK[] }; etag?: string; lastFetched: number; ttlMs?: number }

function nameFromUrl(url: string) {
  return `jwks-${Buffer.from(url).toString('base64url').slice(0, 50)}`
}

class K8sSecretCache implements JwksCacheStore {
  constructor(private k8s: CoreV1Api, private namespace: string) {}

  async get(url: string): Promise<Entry | undefined> {
    try {
      const name = nameFromUrl(url)
      const r = await this.k8s.readNamespacedSecret(name, this.namespace)
      const b64 = r.body.data?.jwks
      return b64 ? (JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as Entry) : undefined
    } catch {
      return undefined
    }
  }

  async set(url: string, entry: Entry): Promise<void> {
    const name = nameFromUrl(url)
    const jwksB64 = Buffer.from(JSON.stringify(entry)).toString('base64')
    await this.k8s.createNamespacedSecret(this.namespace, {
      metadata: { name },
      type: 'Opaque',
      data: { jwks: jwksB64 },
    } as unknown)
  }

  async del(url: string): Promise<void> {
    const name = nameFromUrl(url)
    await this.k8s.deleteNamespacedSecret(name, this.namespace)
  }
}
```

Metrics wrapper

```ts path=null start=null
// Wrap any cache with metrics
interface MetricsClient {
  histogram(name: string, valueMs: number, labels?: Record<string, string>): void
  counter(name: string, labels?: Record<string, string>): void
}

class MetricsJwksCache implements JwksCacheStore {
  constructor(private inner: JwksCacheStore, private metrics: MetricsClient) {}

  async get(url: string) {
    const t = Date.now()
    const res = await this.inner.get(url)
    this.metrics.histogram('jwks_cache_get_ms', Date.now() - t, { hit: res ? 'true' : 'false' })
    this.metrics.counter('jwks_cache_get_total', { hit: res ? 'true' : 'false' })
    return res
  }
  async set(url: string, entry: Entry) {
    const t = Date.now()
    await this.inner.set(url, entry)
    this.metrics.histogram('jwks_cache_set_ms', Date.now() - t)
    this.metrics.counter('jwks_cache_set_total')
  }
  async del(url: string) {
    await this.inner.del(url)
    this.metrics.counter('jwks_cache_del_total')
  }
}
```

Multi-Region cache (primary/secondary with backfill)

```ts path=null start=null
class MultiRegionCache implements JwksCacheStore {
  constructor(private primary: JwksCacheStore, private secondary: readonly JwksCacheStore[]) {}

  async get(url: string) {
    let res = await this.primary.get(url)
    if (res) return res
    for (const s of this.secondary) {
      res = await s.get(url)
      if (res) {
        await this.primary.set(url, res)
        return res
      }
    }
    return undefined
  }
  async set(url: string, entry: Entry) {
    await this.primary.set(url, entry)
    for (const s of this.secondary) await s.set(url, entry)
  }
  async del(url: string) {
    await this.primary.del(url)
    for (const s of this.secondary) await s.del(url)
  }
}
```

Performance & Security Notes
- Always set ttlMs to a sensible value (e.g., 60–300s) and pair with ETag revalidation.
- Prefer shared caches (Redis/Dynamo/Vercel KV) in multi-instance deployments.
- Consider encryption at rest for file-based caches on shared disks.
- Export cache metrics (hit ratio, latencies) to validate effectiveness.

See also:
- README → JWKS Infrastructure
- Authentication & Key Lifecycle (JWT refresh planned in #26)