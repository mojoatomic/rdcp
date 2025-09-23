import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import express, { Request, Response } from 'express'
import http from 'http'
import { createKeyring } from '../src/server/keyring'
import { prepareJWKSResponse, etagMatches } from '../src/utils/etag'
import { JwksFetcher, filterJwksKeys } from '../src/utils/jwks'

function startServer(): Promise<{
  baseUrl: string
  close: () => Promise<void>
  incrementedHits: () => number
  rotate: () => Promise<void>
}> {
  return new Promise(resolve => {
    const app = express()
    const ring = createKeyring({
      jwt: {
        active: [{ kid: 'hs', alg: 'HS256', secret: 'hs-secret' }],
        previous: [],
        graceWindowMs: 60_000,
      },
      api: { active: [], previous: [], graceWindowMs: 60_000 },
    })

    let hits = 0

    app.get('/.well-known/jwks.json', async (req: Request, res: Response) => {
      hits += 1
      const jwks = await ring.exportPublicJWKS()
      const prepared = prepareJWKSResponse(jwks)
      const ifNoneMatch = (req.headers['if-none-match'] as string | undefined) ?? ''
      res.setHeader('ETag', prepared.etag)
      res.setHeader('Cache-Control', 'public, max-age=60')
      res.setHeader('Content-Type', 'application/json')
      if (ifNoneMatch && etagMatches(ifNoneMatch, prepared.etag)) {
        res.status(304).end()
        return
      }
      res.status(200).send(prepared.body)
    })

    app.post('/rotate', async (_req: Request, res: Response) => {
      await ring.rotateNewRS256Key(`test-${Date.now()}`)
      res.status(204).end()
    })

    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') throw new Error('no address')
      const baseUrl = `http://127.0.0.1:${addr.port}`
      resolve({
        baseUrl,
        close: () => new Promise(r => server.close(() => r())),
        incrementedHits: () => hits,
        rotate: async () => {
          await fetch(`${baseUrl}/rotate`, { method: 'POST' })
        },
      })
    })
  })
}

describe('JWKS client cache (ttlMs + ETag/304)', () => {
  let baseUrl = ''
  let closeServer: () => Promise<void>
  let getHits: () => number
  let rotate: () => Promise<void>

  beforeAll(async () => {
    const s = await startServer()
    baseUrl = s.baseUrl
    closeServer = s.close
    getHits = s.incrementedHits
    rotate = s.rotate
  })

  afterAll(async () => {
    await closeServer()
  })

  it('honors ttlMs (serves from cache without network when fresh)', async () => {
    const fetcher = new JwksFetcher({ ttlMs: 10_000 })
    const h0 = getHits()
    const r1 = await fetcher.fetch(baseUrl)
    const h1 = getHits()
    expect(r1.fromCache).toBe(false)
    expect(h1).toBe(h0 + 1)

    const r2 = await fetcher.fetch(baseUrl)
    const h2 = getHits()
    expect(r2.fromCache).toBe(true)
    expect(h2).toBe(h1) // no new network call
  })

  it('dedupes inflight requests (single network call on concurrent first fetch)', async () => {
    const fetcher = new JwksFetcher()
    const h0 = getHits()
    const N = 10
    await Promise.all(Array.from({ length: N }).map(() => fetcher.fetch(baseUrl)))
    const h1 = getHits()
    expect(h1).toBe(h0 + 1)
  })

  it('uses If-None-Match and returns fromCache on 304; ETag changes after rotation', async () => {
    const fetcher = new JwksFetcher() // no ttlMs -> always revalidate via ETag

    const r1 = await fetcher.fetch(baseUrl)
    const hitsAfterFirst = getHits()
    expect(r1.fromCache).toBe(false)
    expect(typeof r1.etag === 'string' || r1.etag === undefined).toBe(true)

    // second call triggers revalidation; server should count another hit
    const r2 = await fetcher.fetch(baseUrl)
    const hitsAfterSecond = getHits()
    expect(hitsAfterSecond).toBe(hitsAfterFirst + 1)
    expect(r2.fromCache).toBe(true) // 304 path returns cached body
    expect(r2.etag).toBe(r1.etag)

    // rotate RSA key -> JWKS changes -> ETag must change and 200 returned
    await rotate()

    const r3 = await fetcher.fetch(baseUrl)
    const hitsAfterThird = getHits()
    expect(hitsAfterThird).toBe(hitsAfterSecond + 1)
    expect(r3.fromCache).toBe(false)
    expect(r3.etag).not.toBe(r2.etag)

    // confirm RSA keys are present post-rotation
    const rsa = filterJwksKeys(r3.jwks, { kty: ['RSA'] })
    expect(rsa.length).toBeGreaterThan(0)
  })

  it('loads from persisted cache on new instance (no network when fresh)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const os = await import('node:os')

    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rdcp-jwks-test-'))

    // First instance with cachePath writes to cache
    const f1 = new JwksFetcher({ ttlMs: 60_000, cachePath: cacheDir })
    const h0 = getHits()
    const r1 = await f1.fetch(baseUrl)
    expect(r1.fromCache).toBe(false)
    const h1 = getHits()
    expect(h1).toBe(h0 + 1)

    // New instance with same cachePath should serve from persisted cache without network
    const f2 = new JwksFetcher({ ttlMs: 60_000, cachePath: cacheDir })
    const r2 = await f2.fetch(baseUrl)
    const h2 = getHits()
    expect(r2.fromCache).toBe(true)
    expect(h2).toBe(h1)
  })
})
