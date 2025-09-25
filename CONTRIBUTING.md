# Contributing to RDCP

Thank you for contributing! This guide highlights the key parts of the build, type generation, and CI setup so you can be productive quickly.

## Build & Types

We split TypeScript declaration emission from the Rollup JavaScript bundling to improve stability and avoid out-of-memory issues in CI.

- Build type declarations (emits to dist/types):
  - npm run build:types
  - Internals: tsc -p tsconfig.types.json (emitDeclarationOnly, declarationDir: dist/types)
- Build JavaScript bundles (CJS + ESM):
  - npm run build:js
  - Internals: rollup -c rollup.config.mjs (uses tsconfig.rollup.json, no declarations)
- Full build (types + JS):
  - npm run build

Notes:
- package.json export "types" fields point to dist/types/...
- dist and dist/types are excluded from TS inputs to prevent TS5055 "overwrite input" errors.
- We no longer use rollup-plugin-dts; tsc handles declaration generation.

## Local CI (quick checks)

- Install: npm ci --no-audit --no-fund
- Core: npm run build:core
- Build: npm run build
- Lint: npm run lint:ci
- Tests: npm test

## Pre-commit

We use lint-staged via Husky. The pre-commit hook runs:

```
npx --no-install lint-staged
```

If you add new file types, update the lint-staged section in package.json accordingly.

## Conventional commits (suggested)

- chore(...): tooling, config, non-functional
- build(...): build pipeline, bundling, packaging
- fix(...): bug fixes
- feat(...): new features
- docs(...): documentation only

This keeps history clean and helps automation.

# Contributing to RDCP

Thank you for your interest in contributing to RDCP!

At this time, we are not accepting external pull requests. The SDK is currently undergoing active testing and stabilization to ensure API quality, performance, and security ahead of broader community contributions.

What you can do right now
- Try the SDK and share feedback: please open an issue with bug reports, suggestions, or questions.
- Documentation feedback: if you spot inaccuracies or areas that need clarification, open an issue describing the change you’d like to see.
- Security reports: please do not create public issues. Refer to SECURITY.md for responsible disclosure instructions.

Why contributions are paused
- We need to keep the scope tightly controlled while we validate core behavior and finalize the public interface.
- This helps us avoid churn for early adopters and ensures that contributions are built on a stable foundation.

When contributions will open
- We plan to revisit community PRs after the initial stabilization milestone. We’ll update the README and project Wiki when contributions open back up.

Internal contributor guidelines (tooling and lockfiles)
- Node and npm: use Node >= 18 and npm >= 9. This repo declares engines to help standardize environments.
- After dependency bumps: run `npm install` locally to refresh package-lock.json and commit the lockfile changes in the same PR.
- CI installs: `npm ci` is used for clean installs. It requires the lockfile to be up-to-date with package.json. If you see errors like "Invalid: lock file's <pkg>@<old> does not satisfy <pkg>@<new>", run `npm install` and commit the updated lockfile.
- Monorepo note: if a subpackage has its own lockfile (e.g., packages/rdcp-demo-app), refresh and commit that lockfile as well when dependencies change for that workspace.

A note about unsolicited PRs
- We appreciate the effort, but unsolicited PRs may be closed without review while contributions are paused. Please use issues for discussion meanwhile.

Thank you for your understanding and your interest in helping improve RDCP!