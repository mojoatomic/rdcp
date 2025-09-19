# AI Development Guidelines

The RDCP SDK includes two development guideline files designed to help AI assistants (and human developers) maintain consistency and quality when contributing to this project.

Files
- WARP.md — RDCP-specific development rules and protocol compliance requirements
- warp-generic.md — Universal development standards and best practices

Links
- WARP.md (project root): https://github.com/mojoatomic/rdcp/blob/main/WARP.md
- warp-generic.md (project root): https://github.com/mojoatomic/rdcp/blob/main/warp-generic.md

Why these files exist
Modern development increasingly involves AI assistance for code generation, refactoring, and troubleshooting. These guidelines establish sane defaults and prevent common pitfalls that occur when AI tools lack project context.

Key concepts
- Protocol Compliance
  - WARP.md enforces strict adherence to the RDCP v1.0 specification, preventing protocol deviations that would break interoperability.
- Type Safety
  - Both files mandate TypeScript usage with zero any types, ensuring robust SDK interfaces and catching integration errors at compile time.
- File Length Limits
  - Enforced constraints (100–300 lines depending on file type) prevent monolithic code and encourage focused, maintainable modules.
- Security Patterns
  - Standardized authentication implementations, input validation requirements, and audit trail patterns that meet enterprise compliance needs.
- Test-Driven Development
  - Comprehensive testing requirements with specific coverage targets ensure production readiness.
- Anti-Overengineering
  - Explicit rules preventing unnecessary complexity and feature creep during AI-assisted development.

How Warp applies rules (summary)
- Project rules are loaded from WARP.md files in the repo; subdirectory WARP.md entries take precedence over the root WARP.md; global rules apply last.
- This ensures the most specific rules (closest to the code you’re editing) guide the agent first.

Who this helps
- Human developers: onboard quickly, understand architectural constraints, and follow proven patterns.
- AI development workflows: provide the context needed to make appropriate technical decisions within project constraints.

Contributing
- These guidelines are living documents. Iterate, augment, and enhance as the project evolves.
