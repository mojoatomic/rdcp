/* eslint-disable no-console, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { createJwksFetcher } from '../src/utils/jwks'
import { filterJwksKeys } from '../src/utils/jwks'

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const fetcher = createJwksFetcher()

  const r1 = await fetcher.fetch(baseUrl)
  const rsa = filterJwksKeys(r1.jwks, { kty: ['RSA'] })
  console.log('Initial keys:', r1.jwks.keys.length, 'RSA only:', rsa.length)

  const r2 = await fetcher.fetch(baseUrl)
  console.log('Second fetch -> fromCache?', r2.fromCache)
}

main().catch(err => {
  console.error('JWKS demo failed', err)
  process.exit(1)
})
