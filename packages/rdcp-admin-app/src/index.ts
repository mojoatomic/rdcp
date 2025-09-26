/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, no-console */
import express from 'express'
import { createRDCPClient } from '@rdcp.dev/client'
import { createAdminUISpec } from '@rdcp.dev/admin-ui'

const app = express()

app.get('/admin/spec', async (_req, res) => {
  try {
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers: {},
    })
    const discovery = await rdcp.getDiscovery()
    // @ts-expect-error ui not yet part of discovery; reserved for future optional block
    const spec = createAdminUISpec(discovery, discovery.ui)
    res.json(spec)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).json({ error: String(message) })
  }
})

app.get('/admin', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>RDCP Admin (Spec)</title></head>
  <body>
    <h1>RDCP Admin UI (Spec)</h1>
    <pre id="out">Loading...</pre>
    <script>
      fetch('/admin/spec').then(r=>r.json()).then(j=>{
        document.getElementById('out').textContent = JSON.stringify(j, null, 2)
      }).catch(e=>{
        document.getElementById('out').textContent = 'Error: '+e
      })
    </script>
  </body>
</html>`)
})

app.listen(3100, () => {
  console.log('Admin app scaffold listening on :3100')
})
