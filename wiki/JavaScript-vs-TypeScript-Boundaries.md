# JavaScript vs TypeScript Boundaries

## Critical Project Context

The RDCP SDK project has **multiple contexts** where JavaScript vs TypeScript requirements differ. This causes confusion and must be clearly documented to avoid hours of unnecessary conversion work.

## The Core Issue

**WARP and developers often try to convert documentation examples to TypeScript when they should stay as JavaScript examples.** The implementation guide's JS examples are intentionally generic - they're meant to be copied into any project type.

## Clear Boundaries

### 🟢 Where JavaScript is Required

| Location | Reason | Examples |
|----------|--------|----------|
| **Package.json and build configs** | Node.js runtime files expect JavaScript | `package.json`, `jest.config.js`, `rollup.config.js` |
| **Documentation examples** | Maximum compatibility across project types | `docs/rdcp-implementation-guide.md` examples |
| **Legacy integration examples** | Show integration with existing JS codebases | Integration snippets in docs |
| **Configuration files** | Node.js tooling standard | ESLint, Prettier, build tool configs |
| **Template code** | Meant to be copied by users | Code snippets in documentation |

### 🔴 Where TypeScript is Required

| Location | Reason | Examples |
|----------|--------|----------|
| **SDK core implementation** | Full type safety for protocol compliance | All files in `src/` directory |
| **Protocol type definitions** | RDCP request/response schemas | `src/utils/types.ts`, interface definitions |
| **Framework adapters** | Proper typing for Express/Next.js/Fastify | `src/server/adapters/*.ts` |
| **Public API surface** | Anything users import needs typing | `src/index.ts`, exported functions |
| **Authentication modules** | Security requires type safety | `src/auth/*.ts` |

## Historical Context

**Hours were spent converting FROM JavaScript TO TypeScript** for the SDK core implementation. This was necessary because:

1. **Type Safety for Protocol Compliance** - RDCP has specific JSON schemas
2. **Developer Experience** - SDK users need autocompletion and compile-time checking  
3. **Multi-Framework Support** - TypeScript provides consistent interfaces
4. **Enterprise Adoption** - Static analysis aligns with enterprise standards
5. **Protocol Evolution** - Easier to manage breaking changes with types

## WARP Rules

### ✅ ALWAYS Convert to TypeScript
- Files in `src/` directory
- Protocol implementations
- API interfaces
- Framework adapters

### ❌ NEVER Convert to TypeScript
- Files in `docs/` directory
- Files in `examples/` directory (if they're templates)
- Configuration files (`*.config.js`)
- Build scripts
- Package.json

### 🤔 Context-Dependent
- Example files: Keep as JS if they're templates, convert to TS if they're SDK demos
- Test files: Usually TS for SDK tests, JS for integration examples

## Quick Decision Tree

```
Is the file in src/?
├─ Yes → Use TypeScript
└─ No → Is it a config/build file?
   ├─ Yes → Use JavaScript  
   └─ No → Is it documentation/template?
      ├─ Yes → Use JavaScript
      └─ No → Consider project context
```

## Why This Matters

**The RDCP spec itself is language-agnostic.** The confusion comes from mixing:
- **SDK development** (needs TypeScript for type safety)
- **Documentation examples** (should stay JavaScript for broader compatibility)

## Examples

### ✅ Correct: SDK Source (TypeScript)
```typescript
// src/endpoints/discovery.ts
export function debugSystemDiscovery(req: Request, res: Response): void {
  const tenantContext = extractTenantContext(req)
  // ... typed implementation
}
```

### ✅ Correct: Documentation Example (JavaScript)  
```javascript
// docs/examples/basic-integration.js
const rdcp = require('@rdcp/server')
app.use('/rdcp', rdcp.middleware())
```

### ❌ Wrong: Converting docs to TypeScript
```typescript
// docs/examples/basic-integration.ts ← DON'T DO THIS
import rdcp from '@rdcp/server'  // Too specific, limits compatibility
```

## Key Takeaway

**Documentation examples are templates, not implementation code.** They should remain in JavaScript for maximum compatibility across different project types.