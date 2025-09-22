# Deno/Bun Examples: JWKS Helper with ETag + Backoff

## Deno
```ts path=null start=null
// Deno can import npm packages via the npm: prefix
import { createJwksFetcher } from 'npm:@rdcp/server'

const fetcher = createJwksFetcher({ ttlMs: 30_000 })

async function fetchWithBackoff(baseUrl: string, attempts = 3) {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetcher.fetch(baseUrl)
      console.log('jwks keys', res.jwks.keys.length, 'fromCache', res.fromCache)
      return res
    } catch (e) {
      lastErr = e
      await new Promise(r => setTimeout(r, Math.min(2000, 250 * (1 << i))))
    }
  }
  throw lastErr
}

await fetchWithBackoff(Deno.env.get('BASE_URL') ?? 'http://localhost:3000')
```

## Bun
```ts path=null start=null
import { createJwksFetcher } from '@rdcp/server'

const fetcher = createJwksFetcher({ ttlMs: 30_000 })

async function main() {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const res = await fetcher.fetch(baseUrl)
  console.log('jwks keys', res.jwks.keys.length, 'fromCache', res.fromCache)
}

main().catch(err => {
  console.error('JWKS fetch failed', err)
  process.exit(1)
})
```