# Admin UI: Actions + Polling (WIP)

Scope
- Wire Admin UI React renderer to POST /admin/action to enable/disable/toggle/reset categories
- Add client-side hydration and minimal state management for interactive flows
- Poll RDCP status with jitter/backoff; surface progress and errors in-UI
- Keep SSR for first paint; hydrate for interactivity

Implementation plan
1) Actions wiring
   - Button/SubmitBar triggers POST /admin/action
   - Body: { action, categories, options, tenant? }
   - Use RDCP baseUrl + headers from server SSR; pass via inline script or dataset
   - Disable controls while request in-flight; show success/failure toast

2) Status polling
   - Poll getStatus() with 1s base + jitter; exponential backoff on errors
   - Update StatusPanel with last timestamp and summary
   - Stop polling while a control request is in-flight to avoid contention

3) Hydration
   - Export a small client entry that hydrates the SSR markup and attaches handlers
   - Keep zero-any types; use strict types for UI state and wire props

4) Tenant + TTL
   - TenantSelect sets tenant context on actions
   - DurationInput validates against constraints (min/max) and formats duration strings

5) Tests
   - Admin app e2e: POST /admin/action flows → status reflects change
   - Unit tests for renderer state transitions

6) Docs
   - README: prioritize client SDK usage + Admin UI usage notes
   - Wiki: "Client SDK Demo" page, OTEL tracing how-to

Notes
- Keep server route /admin/action as the single control endpoint for the UI
- Future: replace polling with SSE/WebSockets; keep interface compatible

Refs: #79