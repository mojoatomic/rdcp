# API Reference (lightweight)

This page documents the public module surface at a glance. It complements the guides without requiring generated typed docs.

How to import
- Node/CommonJS
  ```js path=null start=null
  const { adapters, auth, utils, RDCPHttpClient, RDCPClientError, debug, enableDebugCategories, setTraceProvider } = require('@rdcp/server')
  ```
- ESM
  ```js path=null start=null
  import { adapters, auth, utils, RDCPHttpClient, RDCPClientError, debug, enableDebugCategories, setTraceProvider } from '@rdcp/server'
  ```

Root exports (@rdcp/server)
- adapters
  - express.createRDCPMiddleware(reqOptions)
  - fastify.createRDCPMiddleware(reqOptions), fastify.createRDCPPlugin(opts)
  - koa.createRDCPMiddleware(opts), koa.createRDCPMiddlewareWithErrorBoundary(opts)
- auth
  - validateRDCPAuth(req)
  - basicAuthenticator: alias of validateRDCPAuth
- utils
  - extractTenantContext(req)
  - createTenantResponse(response, tenantContext)
  - getTenantDebugConfig(tenantId), setTenantDebugConfig(tenantId, partialConfig)
- client utilities
  - RDCPHttpClient(baseUrl, auth, options)
  - RDCPClientError(code, message, statusCode?, details?)
- debug system
  - debug.api(message, data?)
  - debug.database(message, data?)
  - debug.cache(message, data?)
  - debug.query(message, data?)
  - debug.report(message, data?)
  - enableDebugCategories(["API_ROUTES", "DATABASE", ...])
  - setTraceProvider(provider|null)

Auth entrypoint (@rdcp/server/auth)
- validateRDCPAuth(req)
- Basic/Standard/Enterprise helpers are available via root auth exports

Server entrypoint (@rdcp/server/server)
- Framework adapter creators organized as above under adapters

Client entrypoint (@rdcp/server/client)
- RDCPClient(config)
  - discover(useCache?)
  - getDebugInfo()
  - control(request)
  - enable/disable/toggle/reset(categories, options?)
  - getStatus(), getHealth()
  - testConnection(), getCategories(), clearCache()

OpenTelemetry plugin (@rdcp.dev/otel-plugin)
- setupRDCPWithOpenTelemetry(config?)
- OpenTelemetryProvider
- createOpenTelemetryProvider(), disableRDCPOpenTelemetry(), isRDCPOpenTelemetryActive()

Notes
- The debug system has zero overhead when categories are disabled.
- setupRDCPWithOpenTelemetry() requires @opentelemetry/api as a peer dependency in apps using OTel.
- Multi-tenancy headers are supported across endpoints (see Authentication-Setup#multi-tenancy-support).
