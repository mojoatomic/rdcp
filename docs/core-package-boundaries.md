# @rdcp.dev/core package boundaries

Purpose

- Provide a single, framework-agnostic source of truth for RDCP protocol definitions
- Eliminate duplicate protocol constants/schemas/types across server/client/agents
- Keep server implementation details decoupled from protocol surface

Boundaries

- Protocol-only: constants, error codes, and Zod schemas (minimal runtime via `zod`)
- No Node.js, DOM, or framework dependencies
- No imports from `@rdcp.dev/server` (or adapters)
- Stable union types for error codes and protocol fields; no any types

Import guidance

- Prefer importing protocol primitives (constants, error codes, schemas, types) from `@rdcp.dev/core`
- Keep runtime utilities and framework adapters in `@rdcp.dev/server`
- If a utility is broadly useful and has no runtime/platform coupling, consider promoting it later (in a separate utilities package)

Examples

Schema validation (recommended direct import from core):

```ts
import { controlRequestSchema } from '@rdcp.dev/core'
import { z } from 'zod'

type ControlRequest = z.infer<typeof controlRequestSchema>

export function validate(body: unknown): ControlRequest {
  return controlRequestSchema.parse(body)
}
```

Back-compat (re-export from server still available):

```ts
import { controlRequestSchema } from '@rdcp.dev/server'
```

Related docs

- packages/rdcp-core/README.md (package overview)
- docs/protocol-schemas.md (schema reference and usage)
- docs/rdcp-protocol-specification.md (protocol spec)
