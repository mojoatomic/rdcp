# @rdcp.dev/admin-ui-react

React renderer for the Admin UI spec produced by @rdcp.dev/admin-ui (headless).

- Components: ToggleGroup, DurationInput, TenantSelect, StatusPanel, SubmitBar
- Renderer: <AdminUIRenderer spec={...} /> to render the spec

Usage (illustrative)
```tsx path=null start=null
import * as React from 'react'
import { AdminUIRenderer } from '@rdcp.dev/admin-ui-react'
import { createAdminUISpec } from '@rdcp.dev/admin-ui'

export function App({ discovery }: { discovery: any }) {
  const spec = createAdminUISpec(discovery)
  return <AdminUIRenderer spec={spec} />
}
```
