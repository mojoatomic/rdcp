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