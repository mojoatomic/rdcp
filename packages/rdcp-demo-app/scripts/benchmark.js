// Simple micro-benchmark to validate Performance-Analysis.md claims
const http = require('http')

const TARGET = process.env.URL || 'http://localhost:3000/rdcp/v1/status'
const N = parseInt(process.env.N || '200', 10)

function requestOnce() {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint()
    const req = http.get(TARGET, res => {
      res.on('data', () => {})
      res.on('end', () => {
        const end = process.hrtime.bigint()
        resolve(Number(end - start) / 1e6) // ms
      })
    })
    req.on('error', reject)
  })
}

;(async () => {
  const samples = []
  for (let i = 0; i < N; i++) {
    samples.push(await requestOnce())
  }
  samples.sort((a, b) => a - b)
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  const p95 = samples[Math.floor(samples.length * 0.95)]
  console.log(`Target: ${TARGET}`)
  console.log(`Samples: ${samples.length}`)
  console.log(`Average latency: ${avg.toFixed(2)} ms`)
  console.log(`p95 latency: ${p95.toFixed(2)} ms`)
  console.log('Goal: < 2ms average in local environment (no network)')
})().catch(err => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
