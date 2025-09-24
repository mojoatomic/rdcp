# @rdcp.dev/core

Protocol definitions for RDCP shared across server, client, and tooling packages.

What this package contains
- Protocol constants: `PROTOCOL_VERSION`, `RDCP_HEADERS`, `RDCP_PATHS`
- Protocol error codes and type: `RDCP_ERROR_CODES`, `RDCPErrorCode`
- Protocol Zod schemas for endpoints: `controlRequestSchema`, `controlResponseSchema`, `discoveryResponseSchema`, `statusResponseSchema`, `healthResponseSchema`, `protocolDiscoverySchema`, `errorResponseSchema`
- Stable protocol-facing TypeScript types (no any types)
- Zero server/framework coupling; minimal runtime dependency (`zod`) for schemas
- Import-only: no side effects

Design boundaries
- Protocol-only: no business logic, no framework-specific code
- No Node.js built-ins, no fetch/http usage, no file I/O
- No dependency on `@rdcp.dev/server` or any adapter packages

Usage

Import protocol primitives directly from core (recommended):

```ts
import { RDCP_HEADERS, RDCP_PATHS, PROTOCOL_VERSION } from '@rdcp.dev/core'
import { controlRequestSchema, RDCP_ERROR_CODES } from '@rdcp.dev/core'
import { z } from 'zod'

type ControlRequest = z.infer<typeof controlRequestSchema>

export function validateControl(body: unknown): ControlRequest {
  const parsed = controlRequestSchema.parse(body)
  return parsed
}
```

Compatibility note
- `@rdcp.dev/server` re-exports these schemas and error codes to avoid breaking existing imports. New code should prefer importing from `@rdcp.dev/core`.

Versioning
- Additive protocol changes (new fields/values) follow semver minor
- Breaking protocol changes follow semver major
- Avoid removing/renaming existing fields; prefer deprecation comments first

Contributing
- Keep the surface minimal and focused on protocol representations
- Follow strict TypeScript: no any types; prefer precise string unions and readonly where appropriate
- Align with the RDCP protocol docs (docs/rdcp-protocol-specification.md)
