# RDCP Protocol Schemas (Zod)

As of PR #42, protocol-level Zod schemas are centralized in `@rdcp.dev/core`. The server package re-exports these schemas for backward compatibility, but new code should import from core.

Exports

Schemas:
- protocolVersionSchema
- controlRequestSchema
- controlResponseSchema
- discoveryResponseSchema
- statusResponseSchema
- healthResponseSchema
- protocolDiscoverySchema
- errorResponseSchema

Fixtures (sample typed payloads):
- protocolVersionFixture
- controlRequestEnableFixture | controlRequestDisableFixture | controlRequestResetFixture | controlRequestStatusFixture
- controlResponseFixture
- discoveryResponseFixture
- statusResponseFixture
- healthResponseFixture
- protocolDiscoveryFixture
- errorResponseFixture

Usage

Validate incoming requests (recommended):

```ts
import { controlRequestSchema } from '@rdcp.dev/core'

const result = controlRequestSchema.safeParse(req.body)
if (!result.success) {
  // handle validation errors
}
```

Typed validation with Zod:

```ts
import { z } from 'zod'
import { controlRequestSchema } from '@rdcp.dev/core'

type ControlRequest = z.infer<typeof controlRequestSchema>

function validate(body: unknown): ControlRequest {
  return controlRequestSchema.parse(body)
}
```

Constants, schemas, and fixtures together:

```ts
import {
  PROTOCOL_VERSION,
  RDCP_HEADERS,
  RDCP_PATHS,
  controlRequestSchema,
  controlRequestEnableFixture,
  discoveryResponseFixture,
} from '@rdcp.dev/core'

// Use fixtures in tests or examples
const req = controlRequestEnableFixture
const discovery = discoveryResponseFixture
```

Back-compat import (still supported):

```ts
import {
  controlRequestSchema,
  controlRequestEnableFixture,
} from '@rdcp.dev/server'
```

Notes

- Core remains protocol-only (no framework/server coupling). Schemas use a minimal runtime dependency on `zod`.
- Additions to schemas are semver-minor; breaking changes are semver-major.
- See also: docs/core-package-boundaries.md and docs/rdcp-protocol-specification.md.

Centralized JSON Schema definitions ($defs)

A machine-readable set of domain-specific primitives is provided at `docs/schemas/defs.json`. Downstream schemas should reference these via `$ref` instead of inlining patterns. This improves consistency between documentation, validation, and implementations.
