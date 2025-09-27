/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, no-console */
import express from 'express'
import { createRDCPClient } from '@rdcp.dev/client'
import { createAdminUISpec } from '@rdcp.dev/admin-ui'
import { RDCP_HEADERS } from '@rdcp.dev/core'

const app = express()

app.get('/admin/spec', async (_req, res) => {
  try {
    const apiKey =
      process.env.RDCP_API_KEY ?? 'dev-key-change-in-production-min-32-chars'
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'api-key',
      [RDCP_HEADERS.CLIENT_ID]: 'admin-app',
      authorization: `Bearer ${apiKey}`,
    }
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers,
    })
    const discovery = await rdcp.getDiscovery()
    const spec = createAdminUISpec(discovery)
    res.json(spec)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).json({ error: String(message) })
  }
})

app.get('/admin', async (_req, res) => {
  try {
    const apiKey =
      process.env.RDCP_API_KEY ?? 'dev-key-change-in-production-min-32-chars'
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'api-key',
      [RDCP_HEADERS.CLIENT_ID]: 'admin-app',
      authorization: `Bearer ${apiKey}`,
    }
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers,
    })
    const discovery = await rdcp.getDiscovery()
    const spec = createAdminUISpec(discovery)
    const [{ default: React }, { renderToString }, mod] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import('@rdcp.dev/admin-ui-react'),
    ])
    const AdminUIRenderer = (
      mod as unknown as {
        AdminUIRenderer: (props: { spec: unknown }) => unknown
      }
    ).AdminUIRenderer
    const markup = renderToString(
      (
        React as unknown as { createElement: (...args: unknown[]) => unknown }
      ).createElement(
        AdminUIRenderer as unknown as (props: { spec: unknown }) => unknown,
        { spec }
      )
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
    <script>
      (function(){
        var btn = document.getElementById('rdcp-apply');
        if (!btn) return;
        btn.addEventListener('click', function(){
          try {
            var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-category]'));
            var cats = boxes.filter(function(el){ return !!el && el.checked; }).map(function(el){ return el.getAttribute('data-category'); });
            var tenantEl = document.getElementById('rdcp-tenant');
            var tenant = tenantEl && tenantEl.value ? String(tenantEl.value) : '';
            var durEl = document.getElementById('rdcp-duration');
            var duration = durEl && durEl.value ? String(durEl.value) : '';
            var options = duration ? { temporary: true, duration: duration } : undefined;
            var body = { action: 'enable', categories: cats };
            if (tenant) body.tenantId = tenant;
            if (options) body.options = options;
            btn.disabled = true;
            fetch('/admin/action', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body)
            })
            .then(function(res){ return res.text().then(function(t){ try { return { ok: res.ok, data: JSON.parse(t) }; } catch(_){ return { ok: res.ok, data: t }; } }); })
            .then(function(result){
              if (result.ok) alert('Applied successfully'); else alert('Failed: ' + (result && result.data && result.data.error ? result.data.error : 'unknown'));
            })
            .catch(function(err){ alert('Error: ' + err); })
            .finally(function(){ btn.disabled = false; });
          } catch (e) {
            alert('Error: ' + e);
          }
        });
      })();
    </script>
  </body>
</html>`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).send(`Error: ${String(message)}`)
  }
})

app.get('/admin/json', async (_req, res) => {
  try {
    const apiKey =
      process.env.RDCP_API_KEY ?? 'dev-key-change-in-production-min-32-chars'
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'api-key',
      [RDCP_HEADERS.CLIENT_ID]: 'admin-app',
      authorization: `Bearer ${apiKey}`,
    }
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers,
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

app.post('/admin/action', express.json(), async (req, res) => {
  try {
    const apiKey =
      process.env.RDCP_API_KEY ?? 'dev-key-change-in-production-min-32-chars'
    const headers: Record<string, string> = {
      [RDCP_HEADERS.AUTH_METHOD]: 'api-key',
      [RDCP_HEADERS.CLIENT_ID]: 'admin-app',
      authorization: `Bearer ${apiKey}`,
    }
    const rdcp = createRDCPClient({
      baseUrl: process.env.RDCP_BASE_URL ?? 'http://localhost:3000',
      headers,
    })
    const body = req.body ?? {}
    const action = String(body.action || '').trim()
    const categories = Array.isArray(body.categories)
      ? body.categories
      : [String(body.category || 'API_ROUTES')]
    const options =
      body.options && typeof body.options === 'object'
        ? body.options
        : undefined
    const result = await rdcp.postControl({
      action: action as 'enable' | 'disable' | 'toggle' | 'reset',
      categories,
      options,
    })
    res.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    res.status(500).json({ error: String(message) })
  }
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(3100, () => {
    console.log('Admin app scaffold listening on :3100')
  })
}

export { app }
