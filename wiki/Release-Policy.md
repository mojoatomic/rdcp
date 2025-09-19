# Release & Tagging Policy

This page defines how we version, tag, and publish releases across the RDCP repository. It applies to the server SDK, demo app, and related packages.

## Versioning: Semantic Versioning (SemVer)

- Major (X.0.0)
  - Any breaking change to the public API or behavior that requires user action
  - Removal of previously documented options/behaviors
- Minor (X.Y.0)
  - Backward-compatible features and enhancements
  - Security hardening that doesn’t break API (e.g., stricter defaults)
  - Significant docs that introduce new recommended flows
- Patch (X.Y.Z)
  - Backward-compatible fixes, test-only changes, log-level adjustments, doc clarifications

## What triggers a release

Cut a release when a merged PR on main includes any of the following:
- New user-facing feature in the server or demo app used in docs/examples
- Security hardening in auth or control paths (e.g., hybrid/mTLS validation, header enforcement)
- Documentation that materially changes best practices or onboarding
- Timeout: if multiple small fixes land without a release for 2 weeks → cut a patch

## Branching and stabilization

- main: always releasable
- Feature branches: develop behind PRs (squash merge), CI must be green (tests, type-check, lint)
- For major releases: optionally cut release/X.0.0 for hardening, merge back to main after tagging

## Tagging rules

- Use annotated tags only: vX.Y.Z
- Tag message: one-paragraph summary plus highlights
- Tag only after main CI is green (tests, type-check, lint) and demo app e2e are passing

## GitHub release notes

- Auto-generate from tag/PR titles, then hand-edit
- Include sections:
  - What’s new
  - Security
  - Breaking changes (if any) + migration steps
  - Docs
  - Thanks/Contributors (optional)

## Retagging policy

- Don’t retag an existing version
- If a tag was pushed with an error, create a new patch release (X.Y.(Z+1))
- In the release notes, state “Supersedes vX.Y.Z due to <reason>”
- Only consider deleting/retagging if the tag never left your fork (generally avoid)

## Pre-release identifiers (optional)

- Use -rc.N for release candidates on major/minor releases when external validation is desired
- Avoid pre-releases for patch versions

## Release checklist

- CI green on main (tests, type-check, lint)
- Demo app e2e tests pass (tenant RBAC, TTL controls, rate limiting/audit, hybrid/mTLS)
- Docs updated and linked from the wiki Home
- Prepare release notes
- Create and push annotated tag vX.Y.Z
- Optionally publish a GitHub Release

## Current version context

- v1.1.0: demo app TTL controls, hybrid auth hardening, docs updates; strict bearer-only tenant routes and RBAC

## Ownership

- Release owner: the PR author or maintainer merging to main
- Approvers: at least one maintainer review for minor/patch; two for major