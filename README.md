# RDCP SDK

JavaScript/TypeScript SDK for Runtime Debug Control Protocol (RDCP) v1.0

## Project Status

✅ **Initial Setup Complete**
- Project structure created
- WARP.md rules configured  
- Package.json and build tools configured
- TypeScript, ESLint, Prettier configured
- Git repository initialized

## Next Steps

Awaiting first development prompt to begin SDK implementation.

## RDCP Protocol Compliance

This SDK will implement strict compliance with RDCP v1.0 specification:
- All required endpoints: `/.well-known/rdcp`, `/rdcp/v1/discovery`, `/rdcp/v1/control`, `/rdcp/v1/status`, `/rdcp/v1/health`
- Three security levels: Basic (API key), Standard (JWT), Enterprise (mTLS)
- Multi-tenancy support with proper isolation
- Performance metrics and audit trails

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production  
npm run build

# Run tests
npm test

# Type checking and linting
npm run lint
```

## Project Structure

```
src/
├── client/           # RDCP client SDK
├── server/           # RDCP server utilities  
├── auth/             # Authentication adapters
├── validation/       # Request/response validation
└── utils/            # Common utilities

examples/             # Framework examples
tests/               # Test suites
docs/                # Documentation
```

See `WARP.md` for detailed development rules and RDCP-specific requirements.