/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, no-console */
import express from 'express'
import { createRDCPClient } from '@rdcp.dev/client'
import { createAdminUISpec } from '@rdcp.dev/admin-ui'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { AdminUIRenderer } from '@rdcp.dev/admin-ui-react'

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

app.get('/admin', async (_req, res) => {
  try {
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers: {},
    })
    const discovery = await rdcp.getDiscovery()
    const spec = createAdminUISpec(discovery)
    const markup = renderToString(
      React.createElement(AdminUIRenderer, { spec })
    )
    res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>RDCP Admin</title>
    <style>
      body { font-family: -apple-system, system-ui, Arial; padding: 20px; }
      section { border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 6px; }
      h1 { margin-top: 0; }
    </style>
  </head>
  <body>
    <h1>RDCP Admin</h1>
    <ul>
      <li><a href="/admin/json" target="_blank">Raw JSON (discovery + status)</a></li>
      <li><a href="/admin/spec" target="_blank">AdminUISpec JSON (headless builder)</a></li>
    </ul>
    <div id="root">${markup}</div>
  </body>
</html>`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).send(`Error: ${String(message)}`)
  }
})

app.get('/admin/json', async (_req, res) => {
  try {
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers: {},
    })
    const [discovery, status] = await Promise.all([
      rdcp.getDiscovery(),
      rdcp.getStatus(),
    ])
    res.json({ discovery, status })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).json({ error: String(message) })
  }
})

app.listen(3100, () => {
  console.log('Admin app scaffold listening on :3100')
})
