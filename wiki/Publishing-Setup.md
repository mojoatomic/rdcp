# NPM Publishing Setup

This guide covers how to prepare and publish the RDCP SDK to NPM for production use.

## Current Package Status

### Package Configuration

```json
{
  "name": "@rdcp/server",
  "version": "1.0.0",
  "description": "Server utilities for Runtime Debug Control Protocol (RDCP) v1.0 implementation",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./adapters": "./src/adapters/index.js",
    "./auth": "./src/auth/index.js",
    "./validation": "./src/validation/index.js",
    "./utils": "./src/utils/index.js"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "peerDependencies": {
    "express": ">=4.17.0",
    "fastify": ">=3.0.0", 
    "koa": ">=2.0.0"
  }
}
```

### Pre-Publication Checklist

- [ ] **Package name available**: `@rdcp/server` (check `npm info @rdcp/server`)
- [ ] **Version strategy**: Using semantic versioning (1.0.0)
- [ ] **License**: ISC (suitable for open source)
- [ ] **Main entry points**: Properly configured exports
- [ ] **Node.js compatibility**: >=14.0.0 (covers 95% of production environments)
- [ ] **Peer dependencies**: Framework versions specified

## NPM Account Setup

### 1. Create NPM Account

```bash
# Create account at https://www.npmjs.com/signup
# Or login with existing account
npm login

# Verify login
npm whoami
```

### 2. Create Organization (Optional but Recommended)

```bash
# Create @rdcp organization on npmjs.com
# This allows publishing scoped packages like @rdcp/server, @rdcp/client
```

### 3. Enable Two-Factor Authentication

```bash
# Enable 2FA for security (recommended for all packages)
npm profile enable-2fa auth-and-writes

# Or auth-only for lower security requirements
npm profile enable-2fa auth-only
```

## Pre-Publication Validation

### 1. Run Full Test Suite

```bash
# Install all dependencies
npm install

# Run comprehensive tests
npm test

# Check code coverage (should be >85%)
npm run test:coverage

# Lint code for style and errors
npm run lint

# Type checking (if using TypeScript build tools)
npm run type-check
```

### 2. Build and Package Validation

```bash
# Clean any previous builds
npm run clean

# Build production package
npm run build

# Test package integrity
npm pack --dry-run

# Verify package contents
npm pack
tar -tzf rdcp-server-1.0.0.tgz
```

### 3. Integration Testing

```bash
# Test with actual framework implementations
cd examples/express-basic
npm install
npm test

cd ../fastify-basic  
npm install
npm test

cd ../koa-basic
npm install
npm test
```

## Version Management

### Semantic Versioning Strategy

```bash
# Major version (breaking changes)
npm version major      # 1.0.0 -> 2.0.0

# Minor version (new features, backward compatible)
npm version minor      # 1.0.0 -> 1.1.0

# Patch version (bug fixes)
npm version patch      # 1.0.0 -> 1.0.1

# Pre-release versions
npm version prerelease # 1.0.0 -> 1.0.1-0
npm version prerelease --preid=alpha # 1.0.0 -> 1.0.1-alpha.0
npm version prerelease --preid=beta  # 1.0.0 -> 1.0.1-beta.0
```

### Release Notes Preparation

```bash
# Generate changelog from git history
git log --oneline --decorate --graph v0.9.0..HEAD

# Create release notes in CHANGELOG.md format
```

**CHANGELOG.md Example:**
```markdown
# Changelog

## [1.0.0] - 2024-01-15

### Added
- RDCP v1.0 protocol compliance
- Express, Fastify, Koa, Next.js framework adapters
- Three-tier authentication (Basic, Standard, Enterprise)
- Multi-tenancy support with isolation levels
- Performance metrics integration
- Comprehensive validation schemas
- Standard error handling with RDCP error codes

### Security
- Constant-time API key comparison
- JWT signature validation
- mTLS certificate verification
- Rate limiting for control endpoints
- Audit trail for compliance

### Documentation
- Complete API reference
- Framework integration guides
- Migration guide from manual implementation
- Authentication setup for all security levels
```

## Publication Process

### 1. Pre-Publication Checks

```bash
# Verify package.json configuration
cat package.json | jq '{name, version, description, main, exports, engines, peerDependencies}'

# Test package installation locally
npm pack
npm install ./rdcp-server-1.0.0.tgz -g
rdcp-server --version # If CLI exists

# Verify all exports work
node -e "console.log(require('@rdcp/server'))"
node -e "console.log(require('@rdcp/server/adapters'))"
node -e "console.log(require('@rdcp/server/auth'))"
```

### 2. Publish to NPM

```bash
# Dry run to see what would be published
npm publish --dry-run

# Publish to public NPM registry
npm publish

# Publish scoped package as public (if using @rdcp/server)
npm publish --access public

# Publish with specific tag (for pre-releases)
npm publish --tag beta
npm publish --tag alpha
```

### 3. Post-Publication Verification

```bash
# Verify package is available
npm info @rdcp/server

# Test installation from NPM
mkdir test-install
cd test-install
npm init -y
npm install @rdcp/server

# Test basic functionality
node -e "const {adapters, auth} = require('@rdcp/server'); console.log('✅ Package installed successfully')"
```

## Distribution Tags

### Managing Release Channels

```bash
# Latest (default - stable releases)
npm publish                    # Automatically tagged as 'latest'

# Beta releases (pre-release features)
npm publish --tag beta
npm install @rdcp/server@beta

# Alpha releases (early development)
npm publish --tag alpha
npm install @rdcp/server@alpha

# LTS releases (long-term support)
npm dist-tag add @rdcp/server@1.0.0 lts
npm install @rdcp/server@lts
```

### Managing Tags

```bash
# List all tags
npm dist-tag ls @rdcp/server

# Move latest tag to specific version
npm dist-tag add @rdcp/server@1.0.1 latest

# Remove tag
npm dist-tag rm @rdcp/server beta
```

## Security Considerations

### 1. Package Security

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Perform security review
npm audit --audit-level=high

# Check for known malicious packages
npm audit --audit-level=critical
```

### 2. Access Control

```bash
# Set package access (for scoped packages)
npm access public @rdcp/server    # Make public
npm access restricted @rdcp/server # Make private (paid accounts)

# Grant access to collaborators
npm owner add username @rdcp/server
npm owner list @rdcp/server
npm owner remove username @rdcp/server
```

### 3. Package Integrity

```bash
# Sign package (if using npm's signature feature)
npm config set sign-git-commits true
npm config set sign-git-tags true

# Verify package integrity after publication
npm info @rdcp/server dist.integrity
```

## Automated Publishing (CI/CD)

### GitHub Actions Workflow

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build package
        run: npm run build
      
      - name: Publish to NPM
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Environment Setup

```bash
# Set NPM token in GitHub repository secrets
# Settings → Secrets → Actions → New repository secret
# Name: NPM_TOKEN
# Value: npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Generate NPM token with publish permissions
npm token create --read-only    # For read access
npm token create --publish      # For publish access
npm token create --cidr=0.0.0.0/0 # IP restrictions (optional)
```

## Package Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update
npm audit fix

# Check for outdated dependencies  
npm outdated

# Update package.json with latest compatible versions
npx npm-check-updates -u
npm install
```

### 2. Deprecation Process

```bash
# Deprecate specific version
npm deprecate @rdcp/server@1.0.0 "Security vulnerability, please update"

# Deprecate entire package
npm deprecate @rdcp/server "Package is no longer maintained"

# Undeprecate if needed
npm deprecate @rdcp/server@1.0.0 ""
```

### 3. Package Statistics

```bash
# View download statistics
npm info @rdcp/server

# Detailed stats (use online tools like npmstat.com)
curl https://api.npmjs.org/downloads/point/last-month/@rdcp/server
```

## Rollback Process

### Emergency Rollback

```bash
# Remove published version (within 24 hours)
npm unpublish @rdcp/server@1.0.1

# Unpublish entire package (dangerous - use sparingly)
npm unpublish @rdcp/server --force

# Better approach: Publish patch version with fix
npm version patch
# Fix the issue
npm publish
```

### Version Recovery

```bash
# If accidentally unpublished, republish same version won't work
# Must increment version number

npm version patch  # 1.0.1 -> 1.0.2
# Restore previous functionality  
npm publish

# Deprecate broken version
npm deprecate @rdcp/server@1.0.1 "Broken version, use 1.0.2+"
```

## Publishing Checklist

### Pre-Publication
- [ ] All tests pass (`npm test`)
- [ ] Code linting passes (`npm run lint`)
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version number is incremented appropriately
- [ ] Package exports are verified
- [ ] Dependencies are up to date
- [ ] Security audit passes (`npm audit`)

### Publication
- [ ] Dry run completed (`npm publish --dry-run`)
- [ ] Published successfully (`npm publish`)
- [ ] Package is available (`npm info @rdcp/server`)
- [ ] Installation works (`npm install @rdcp/server`)
- [ ] Basic functionality verified

### Post-Publication
- [ ] GitHub release created with release notes
- [ ] Documentation website updated (if applicable)
- [ ] Social media/community announcements made
- [ ] Integration examples updated
- [ ] Dependent projects notified

## Troubleshooting

### Common Publication Issues

**Issue 1: Package name already exists**
```bash
# Check if name is available
npm info @rdcp/server
# If exists, choose different name or contact owner

# Alternative names:
# rdcp-server, @your-org/rdcp-server, rdcp-js-server
```

**Issue 2: Authentication failures**
```bash
# Re-login to NPM
npm logout
npm login

# Verify authentication
npm whoami

# Check 2FA settings if enabled
npm profile get
```

**Issue 3: Version conflicts**
```bash
# Check current published versions
npm view @rdcp/server versions --json

# Increment version appropriately
npm version patch  # or minor/major
```

**Issue 4: Package size too large**
```bash
# Check package size
npm pack --dry-run

# Use .npmignore to exclude unnecessary files
echo "examples/" >> .npmignore
echo "docs/" >> .npmignore
echo "*.log" >> .npmignore

# Or use package.json files array for inclusion
```

### Support Resources

- **NPM Documentation**: https://docs.npmjs.com/
- **Semantic Versioning**: https://semver.org/
- **NPM Support**: https://npmjs.com/support
- **Package Security**: https://docs.npmjs.com/about-security-audits

---

**Goal**: Reliable, secure, and maintainable package distribution for the RDCP SDK that enables easy adoption across JavaScript/Node.js applications.