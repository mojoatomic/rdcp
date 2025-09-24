# JWKS Client (Quickstart and Options)

The RDCP SDK includes a production-friendly JWKS client with caching and ETag/304 revalidation. It supports TTL-based memory caching, optional persisted file cache, inflight request deduplication, and background refresh.

Quickstart

```ts path=null start=null
import { createJwksFetcher } from '@rdcp.dev/server'

// In-memory TTL + persisted file cache + background refresh
const jwks = createJwksFetcher({
  ttlMs: 60_000,             // serve from cache for up to 60s
  cachePath: '.rdcp-cache',  // enable file-backed cache across restarts
  refreshThresholdMs: 10_000 // preemptive background refresh when <10s remain
})

const { jwks: keys, etag, fromCache } = await jwks.fetch('https://issuer.example.com')
// keys: { keys: JWK[] }, etag?: string, fromCache: boolean
```

Options

- ttlMs: Serve from local cache without network while fresh
- cachePath: Persist entries across process restarts (file store)
- cache: Provide a custom store (Redis, DynamoDB, Vercel KV, K8s, etc.)
- refreshThresholdMs: Non-blocking background refresh when nearing expiry
- ETag/304: Conditional GET; 304 returns cached body without extending TTL

Behavior details

- ETag revalidation: If ttlMs is omitted/expired, requests include If-None-Match. A 304 response reuses the cached JWKS and does not extend the TTL clock.
- Inflight deduplication: Concurrent fetches for the same (url + etag) share a single network call.
- Persisted cache: When cachePath is set, entries are written to disk keyed by a hash of the URL.
- Background refresh: When remaining TTL < refreshThresholdMs, a non-blocking refresh updates the cache in the background.

Examples (platform-specific)

```ts path=null start=null
// File cache (persisted across restarts)
import { createJwksFetcher } from '@rdcp.dev/server'
const jwks = createJwksFetcher({ cachePath: '.rdcp-cache', ttlMs: 60_000 })
```

```ts path=null start=null
// Custom Redis store (see docs/jwks-cache-stores.md for implementation)
import { createJwksFetcher } from '@rdcp.dev/server'
const jwks = createJwksFetcher({ cache: new RedisJwksCache(redis), ttlMs: 60_000 })
```

```ts path=null start=null
// DynamoDB (AWS Lambda friendly)
import { createJwksFetcher } from '@rdcp.dev/server'
const jwks = createJwksFetcher({ cache: new DynamoJwksCache(dynamoClient, 'rdcp-jwks-cache'), ttlMs: 60_000 })
```

```ts path=null start=null
// Vercel KV (edge/runtime)
import { createJwksFetcher } from '@rdcp.dev/server'
const jwks = createJwksFetcher({ cache: new VercelKVCache(), ttlMs: 60_000 })
```

See also

- JWKS Cache Stores (production patterns): docs/jwks-cache-stores.md
- JWKS (wiki): https://github.com/mojoatomic/rdcp/wiki/JWKS
