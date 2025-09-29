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
    const normalized = {
      ...discovery,
      categories: discovery.categories.map(c => ({
        ...c,
        temporary: Boolean(c.temporary),
        metrics: c.metrics
          ? { ...c.metrics }
          : { callsTotal: 0, callsPerSecond: 0 },
      })),
    }
    const spec = createAdminUISpec(normalized)
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
    const normalized = {
      ...discovery,
      categories: discovery.categories.map(c => ({
        ...c,
        temporary: Boolean(c.temporary),
        metrics: c.metrics
          ? { ...c.metrics }
          : { callsTotal: 0, callsPerSecond: 0 },
      })),
    }
    const spec = createAdminUISpec(normalized)
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
      ) as Parameters<typeof renderToString>[0]
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
#rdcp-toast-container { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; z-index: 9999; }
      .rdcp-toast { max-width: 360px; background: #222; color: #fff; padding: 10px 12px; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,0.2); opacity: 0; transform: translateY(10px); transition: opacity .2s ease, transform .2s ease; font-size: 14px; cursor: pointer; }
      .rdcp-toast.show { opacity: 0.95; transform: translateY(0); }
      .rdcp-toast.success { background: #137333; }
      .rdcp-toast.error { background: #a50e0e; }
    </style>
  </head>
  <body>
    <h1>RDCP Admin</h1>
    <ul>
      <li><a href="/admin/json" target="_blank">Raw JSON (discovery + status)</a></li>
      <li><a href="/admin/spec" target="_blank">AdminUISpec JSON (headless builder)</a></li>
    </ul>
    <div id="root">${markup}</div>
<div id="rdcp-toast-container" role="status" aria-live="polite" aria-atomic="true"></div>
    <script>
      (function(){
        var paused = false;
        var errorCount = 0;
        var statusEl = document.getElementById('rdcp-status');
        var toastContainer = document.getElementById('rdcp-toast-container');
        function showToast(msg, type){
          if (!toastContainer) return;
          var el = document.createElement('div');
          el.className = 'rdcp-toast' + (type ? ' ' + String(type) : '');
          el.textContent = String(msg || '');
          el.addEventListener('click', function(){ el.remove(); });
          toastContainer.appendChild(el);
          setTimeout(function(){ el.classList.add('show'); }, 10);
          setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 200); }, 2500);
        }
        function setLoading(on){ if (statusEl){ statusEl.setAttribute('data-loading', on ? 'true' : 'false'); if(on){ statusEl.innerHTML = '<strong>Status</strong> <span>(loading...)</span>'; } } }
        function updateStatus(ts){ if (statusEl){ statusEl.innerHTML = '<strong>Status</strong> ' + (ts ? '<span>(' + ts + ')</span>' : '<span>(idle)</span>'); } }
        function jitter(ms){ return ms + Math.floor(Math.random()*300); }
        function nextDelay(ok){ if (ok){ errorCount = 0; return jitter(1000); } else { errorCount = Math.min(errorCount+1, 5); return Math.min(jitter(1000*Math.pow(2,errorCount)), 10000); } }
        function schedule(ms){ setTimeout(poll, ms); }
        function poll(){
          if (paused){ schedule(500); return; }
          setLoading(true);
          fetch('/admin/json').then(function(res){ return res.json(); }).then(function(data){
            try { var ts = data && data.status && data.status.timestamp ? String(data.status.timestamp) : ''; updateStatus(ts); } catch(_){ /* noop */ }
            setLoading(false);
            schedule(nextDelay(true));
          }).catch(function(){ setLoading(false); schedule(nextDelay(false)); });
        }
        var btn = document.getElementById('rdcp-apply');
        if (btn){
          btn.addEventListener('click', function(){
            try {
              paused = true;
              var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-category]'));
              var cats = boxes.filter(function(el){ return !!el && el.checked; }).map(function(el){ return el.getAttribute('data-category'); });
              var tenantEl = document.getElementById('rdcp-tenant');
              var tenant = tenantEl && tenantEl.value ? String(tenantEl.value) : '';
              var durEl = document.getElementById('rdcp-duration');
              var duration = durEl && durEl.value ? String(durEl.value) : '';
              var options = duration ? { temporary: true, duration: duration } : undefined;
              var actionEl = document.getElementById('rdcp-action');
              var action = actionEl && actionEl.value ? String(actionEl.value) : 'enable';
              var body = { action: action, categories: cats };
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
                if (result.ok) showToast('Applied successfully','success'); else showToast('Failed: ' + (result && result.data && result.data.error ? result.data.error : 'unknown'),'error');
              })
              .catch(function(err){ showToast('Error: ' + err,'error'); })
              .finally(function(){ btn.disabled = false; paused = false; schedule(0); });
            } catch (e) {
              paused = false; schedule(500);
              showToast('Error: ' + e,'error');
            }
          });
        }
        // start polling
        schedule(0);
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
