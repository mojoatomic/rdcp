/* eslint-disable no-console */
import { createJwksFetcher, filterJwksKeys } from '../src/utils/jwks'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function maybeRotate(rotateUrl: string | undefined): Promise<void> {
  if (!rotateUrl) return
  try {
    const res = await fetch(rotateUrl, { method: 'POST' })
    if (!res.ok) {
      console.warn('Rotation endpoint returned non-OK status', res.status)
    }
  } catch (e) {
    console.warn('Rotation request failed:', e)
  }
}

async function demo(): Promise<void> {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const rotateUrl = process.env.ROTATE_URL // Optional admin/rotate endpoint
  const ttlMs = Number(process.env.JWKS_TTL_MS ?? '30000')

  // Fetcher honoring ttlMs (skip network while fresh)
  const fetcher = createJwksFetcher({ ttlMs })

  console.log('Fetching JWKS from', baseUrl, 'with ttlMs=', ttlMs)
  const r1 = await fetcher.fetch(baseUrl)
  console.log(
    'keys=',
    r1.jwks.keys.length,
    'etag=',
    r1.etag,
    'fromCache=',
    r1.fromCache
  )

  // Filter for RSA signature keys
  const rsaKeys = filterJwksKeys(r1.jwks, { kty: ['RSA'], use: ['sig'] })
  console.log('rsaKeys=', rsaKeys.length)

  // Second fetch within TTL -> should be from cache (no network)
  const r2 = await fetcher.fetch(baseUrl)
  console.log('second fetch fromCache=', r2.fromCache)

  // Optional: show conditional GET (ETag/304) using a separate fetcher (no ttl)
  const reval = createJwksFetcher() // no ttlMs -> always revalidate via If-None-Match
  const r3 = await reval.fetch(baseUrl)
  console.log(
    'revalidate first fetch: fromCache=',
    r3.fromCache,
    'etag=',
    r3.etag
  )
  const r4 = await reval.fetch(baseUrl)
  console.log(
    'revalidate second fetch: fromCache=',
    r4.fromCache,
    '(expected true if 304)'
  )

  // Optional rotation if provided; demonstrates ETag change and 200 vs 304
  if (rotateUrl) {
    console.log('Calling rotation endpoint:', rotateUrl)
    await maybeRotate(rotateUrl)
    await sleep(100)
    const r5 = await reval.fetch(baseUrl)
    console.log('post-rotate fetch: fromCache=', r5.fromCache, 'etag=', r5.etag)
  }
}

if (require.main === module) {
  demo().catch(err => {
    console.error('jwks-client-cache-demo failed', err)
    process.exit(1)
  })
}
//
