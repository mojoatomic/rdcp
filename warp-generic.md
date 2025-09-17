# WARP-GENERIC.md

This file provides universal development guidelines and rules for all WARP (warp.dev) projects.

## Project Setup Template

### Essential Development Commands Pattern
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Development server in background (for continued conversation - USE THIS)
npm run dev:background

# Full clean (removes node_modules and reinstalls)
npm run dev:full-clean

# Quick cleanup of hanging processes
npm run cleanup

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run lint
```

### Git Commit Standards
```bash
# ALWAYS use single quotes for commit messages (prevents shell issues)
git commit -m 'Add new feature'
git commit -m 'Fix authentication bug'
git commit -m 'Update API validation'

# FORBIDDEN - double quotes cause issues with special characters
git commit -m "Add new feature"  # Don't do this
```

### Testing Commands Pattern
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testNamePattern="test-name"

# Run with coverage
npm test -- --coverage

# Run specific test in watch mode
npm test -- --watch test-name
```

### API Testing (CRITICAL)
**📋 MANDATORY: All APIs must be comprehensively tested**

- **Rule**: NO API endpoint goes to production without being added to comprehensive test suite
- **Authentication**: Use official testing packages for legitimate auth bypass
- **Coverage**: Test all endpoints with proper authentication flow

**Standard Test Structure:**
```typescript
// Add new API tests like this:
test('Your New API Endpoint', async ({ request, context }) => {
  // Setup authentication context
  const authHeaders = await getAuthHeaders(context);
  
  const response = await request.get('/api/your-endpoint', {
    headers: authHeaders
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // Add your specific assertions
  expect(data).toHaveProperty('expectedField');
  
  console.log('✅ Your API:', data);
});
```

**Why This Matters:**
- **Production Ready**: All endpoints tested with real authentication
- **CI/CD Integration**: Catches API breaks before deployment
- **Security Validation**: Ensures proper authentication on all endpoints
- **Documentation**: Test file serves as live API documentation

### File Length Validation
```bash
# Check all file lengths against constraints
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n

# Monitor specific file types
find src -name "*.tsx" -exec wc -l {} + | awk '$1 > 100 {print "⚠️  " $2 " exceeds 100 lines (" $1 ")"}'
```

## API DEVELOPMENT STANDARDS (CRITICAL)

**⚠️ MANDATORY: These standards MUST be followed for all API development**

### Validation Rules (NO VIOLATIONS)

**✅ REQUIRED:**
- Use validation library (Zod, Joi, etc.) for ALL API request/response validation
- Create focused, single-purpose schemas
- Use proper schema composition (extend, pick, omit)
- Validate at route entry point

**❌ FORBIDDEN:**
- `any` types anywhere in API code
- Complex nested validation hierarchies
- Bypassing validation with raw JSON parsing
- Schema overengineering (keep simple)

**Example - CORRECT:**
```typescript
// Simple, focused schemas
const CreateItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  value: z.number().positive()
})

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})
```

### API Response Format Standards (ENFORCED)

**✅ SUCCESS Response Format:**
```typescript
// Standard success response (adapt to your framework)
return createSuccessResponse({
  data: actualData,
  pagination?: { page, limit, total },
  meta?: additionalInfo
})

// Or framework-specific:
// Express: res.json({ data: actualData })
// Next.js: NextResponse.json({ data: actualData })
// Fastify: reply.send({ data: actualData })
```

**✅ ERROR Response Format:**
```typescript
// Standard error response (adapt to your framework)
return createErrorResponse(
  { error: 'Descriptive message', code: 'ERROR_CODE' },
  400
)

// Or framework-specific:
// Express: res.status(400).json({ error: 'Message', code: 'CODE' })
// Next.js: NextResponse.json({ error: 'Message' }, { status: 400 })
// Fastify: reply.status(400).send({ error: 'Message' })
```

**❌ FORBIDDEN Response Patterns:**
```typescript
// DON'T mix formats
{ success: true, data: {} }  // Inconsistent
{ result: data }             // Non-standard
data                         // Raw data without wrapper
```

### Naming Convention Standards (STRICT)

**Database Fields (snake_case):**
- `user_id`, `created_at`, `item_name`
- Table names: `user_sessions`, `audit_logs`

**API Requests/Responses (camelCase):**
- `userId`, `createdAt`, `itemName`
- Query params: `pageSize`, `sortOrder`

**TypeScript Interfaces (PascalCase):**
- `UserMetadata`, `SessionStatus`, `ItemRequest`

**Example - Database to API Transformation:**
```typescript
// Database query returns snake_case
const dbResult = await db.query(
  'SELECT user_id, created_at, item_name FROM items'
)

// Transform to camelCase for API response
const apiResponse = dbResult.rows.map(row => ({
  userId: row.user_id,
  createdAt: row.created_at,
  itemName: row.item_name
}))
```

### Type Safety Requirements (NO EXCEPTIONS)

**✅ REQUIRED:**
- Define interfaces for all request/response types
- Use strict typing for database queries
- Proper typing for API route handlers
- Type transformations between database and API layers

**❌ FORBIDDEN:**
- `any` types (core WARP rule)
- `unknown` without type guards
- Casting without validation (`as SomeType`)
- Missing return types on functions

**Example - Proper Typing:**
```typescript
interface DatabaseRow {
  user_id: string;
  created_at: string;
  item_name: string;
}

interface ApiResponse {
  userId: string;
  createdAt: string;
  itemName: string;
}

function transformDbToApi(row: DatabaseRow): ApiResponse {
  return {
    userId: row.user_id,
    createdAt: row.created_at,
    itemName: row.item_name
  }
}
```

### API Route Structure (ENFORCED)

**✅ REQUIRED Pattern (adapt to your framework):**
```typescript
// Next.js example
export async function GET(request: NextRequest) {
  return handleAuthenticatedRoute(
    request,
    async ({ user, query }) => {
      // 1. Business logic via service layer
      const data = await SomeService.getData(user.id, query)
      
      // 2. Return standard response
      return createSuccessResponse(data)
    },
    {
      querySchema: SomeQuerySchema // Always validate
    }
  )
}

// Express example
app.get('/api/items', authenticate, validate(querySchema), async (req, res) => {
  const data = await SomeService.getData(req.user.id, req.query)
  res.json({ data })
})

// Fastify example
fastify.get('/api/items', { 
  preHandler: [authenticate, validate(querySchema)]
}, async (request, reply) => {
  const data = await SomeService.getData(request.user.id, request.query)
  reply.send({ data })
})
```

**❌ FORBIDDEN Patterns:**
- Direct database calls in route handlers
- Missing authentication checks
- Inconsistent error handling
- Raw response without standards
- Skipping validation schemas

### Validation Error Handling (MANDATORY)

**✅ Standard Pattern:**
```typescript
try {
  const validatedData = SomeSchema.parse(rawData)
  // Use validatedData (properly typed)
} catch (error) {
  if (error instanceof z.ZodError) {
    return createErrorResponse(
      { error: 'Validation failed', details: error.errors },
      400
    )
  }
  throw error
}
```

## AI ASSISTANT GUARDRAILS (CRITICAL)

**⚠️ STOP OVERENGINEERING - These rules are MANDATORY for AI assistants:**

### Rule #1: DO ONLY WHAT IS ASKED
- If asked to "fix navigation bug" → fix ONLY the navigation bug
- If asked to "move element left" → move ONLY the element, don't change colors/styling
- NEVER add "improvements" that weren't requested
- NEVER create elaborate systems when simple fixes work

### Rule #2: ASK BEFORE CHANGING UI/UX
- Button text changes require permission
- Layout modifications require permission  
- Color/styling changes require permission
- Only fix the specific broken functionality

### Rule #3: AVOID SCHEMA/VALIDATION OVERENGINEERING
- Don't create complex schema systems unless explicitly requested
- Use simple validation, not elaborate hierarchies
- Prefer native TypeScript types over complex schemas
- Don't build "reusable validation frameworks" without permission

### Rule #4: MINIMAL VIABLE FIXES
- Fix the exact bug reported
- Don't "refactor while you're there"
- Don't "make it more maintainable" unless asked
- Don't "future-proof" unless explicitly requested

### Rule #5: RESPECT WORKING CODE
- If it works, don't "improve" it
- Don't change styling/layout of working components
- Don't add complexity to solve non-existent problems
- Keep changes surgical and specific

**Examples of BAD behavior:**
- User: "Fix 404 error" → AI: *Creates entire schema system and changes button layout*
- User: "Move element position" → AI: *Changes colors, adds padding, "improves" styling*
- User: "Add endpoint" → AI: *Builds validation framework, request/response schemas, complex types*

**Examples of GOOD behavior:**
- User: "Fix 404 error" → AI: *Changes only the broken navigation line*
- User: "Move element position" → AI: *Moves only the element position in code*
- User: "Add endpoint" → AI: *Adds simple endpoint with basic validation*

## Critical Development Constraints

### Mandatory File Length Limits
- React Components: **100 lines max**
- API Routes: **150 lines max** 
- Service Files: **200 lines max**
- Test Files: **300 lines max**
- Type Definitions: **50 lines max**
- Utility Functions: **50 lines max**

**No exceptions** - split files if they exceed limits.

### Forbidden Actions (Universal)
- Custom authentication systems (use established libraries)
- Complex state management unless absolutely necessary
- CSS-in-JS libraries (prefer utility-first CSS)
- Component libraries (build simple, focused components)
- **Path alias imports in API routes** (use relative imports for API routes)

### Debugging Rules (NO VIOLATIONS)
- **ALWAYS use Context7 first** before troubleshooting API/SDK issues
- Check official documentation via `resolve-library-id` → `get-library-docs`
- Assume request-time APIs are async in modern frameworks
- Verify framework version/router before applying solutions
- Use standard database clients when possible (avoid vendor lock-in)

### AUTOMATED CONTEXT7 TRIGGERS (MANDATORY)

**⚠️ CRITICAL: Automatically use Context7 for these scenarios:**

#### API Development (Always use Context7)
- Any API route development or modification
- Schema validation implementation
- Authentication handling
- Database operations
- Third-party service integration
- Error handling or response formatting

#### Integration & Configuration (Always use Context7)
- Framework setup or troubleshooting
- Middleware configuration
- Environment variable configuration
- Third-party SDK integration
- Type definitions for external APIs

#### Troubleshooting Scenarios (Always use Context7)
- 404 errors in API routes
- Authentication failures
- Database connection issues
- Import/export resolution problems
- Type errors with external libraries
- Permission errors
- Version-specific API changes

**Implementation Pattern:**
```
When working on [API/integration/troubleshooting task], automatically:
1. Identify core libraries involved
2. Use: "[task description] use context7" or "use library /specific/library-id"
3. Apply Context7 recommendations within project constraints
4. Cross-reference with WARP.md standards before implementation
```

### TDD Workflow
- **RED**: Write failing tests first
- **GREEN**: Implement minimal code to pass
- **REFACTOR**: Clean up while maintaining test coverage
- Never work directly on main branch

### Security Requirements (Universal)
- Parameterized queries only (no SQL injection risk)
- UUID primary keys when possible
- No secrets in code or database
- Input validation at all boundaries
- Proper error handling without information leakage

## Testing Strategy

### Coverage Requirements
- Security functions: **100% coverage** (no exceptions)
- Business logic: **95% coverage**
- API endpoints: **90% coverage** 
- React components: **80% coverage**

### Test Structure
- Use Arrange, Act, Assert pattern
- One assertion per test
- Descriptive test names
- Mock external dependencies
- Test files in standard test directory

## Development Best Practices

- Always use `async/await` (never callbacks or `.then()`)
- Destructure function parameters
- Arrow functions for simple operations
- Named functions for complex logic
- TypeScript strict mode enabled (no `any` types)
- Alphabetical import ordering
- One export per file

## Common Troubleshooting

### Port Conflicts
```bash
# Find process using port
lsof -ti:PORT_NUMBER
# Kill the process
kill -9 $(lsof -ti:PORT_NUMBER)
```

### CORS Issues (for browser-based tools)
```javascript
// Framework-agnostic CORS middleware pattern
// Express.js example:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// Fastify example:
await fastify.register(require('@fastify/cors'), {
  origin: true
})

// Next.js (middleware.ts):
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
```

### Environment Variable Issues
```bash
# Create .env file with required variables
echo "API_KEY=your-secure-key-here" > .env
echo "NODE_ENV=development" >> .env
```

### Docker Deployment Pattern
```dockerfile
# Generic Dockerfile pattern
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Environment variables set at runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["npm", "start"]
```

## Request Validation Schema Template

```javascript
// File: lib/validation.js

const requestSchema = {
  type: 'object',
  required: ['action', 'data'],
  properties: {
    action: { 
      enum: ['create', 'update', 'delete', 'read'] 
    },
    data: { 
      type: 'object'
    },
    requestId: { type: 'string' },
    options: {
      type: 'object',
      properties: {
        timeout: { type: 'number' },
        reason: { type: 'string' }
      }
    }
  },
  additionalProperties: false
}

export function validateRequest(data) {
  // Basic validation implementation
  if (!data.action || !data.data) {
    return { valid: false, error: 'Missing required fields: action, data' }
  }
  
  const validActions = ['create', 'update', 'delete', 'read']
  if (!validActions.includes(data.action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` }
  }
  
  return { valid: true }
}
```

## Integration Patterns

### Logger Integration Template
```javascript
// File: lib/logger-bridge.js
import logger from 'your-logger-library'

export function createLogger(category) {
  return {
    info: (message, ...args) => logger.info(`[${category}] ${message}`, ...args),
    error: (message, ...args) => logger.error(`[${category}] ${message}`, ...args),
    debug: (message, ...args) => logger.debug(`[${category}] ${message}`, ...args)
  }
}
```

## ⚠️ Common Pitfalls

1. **Don't overthink architecture** - Start with your actual needs
2. **Don't optimize prematurely** - Get basic functionality first
3. **Don't build complex systems** - Simple solutions work best
4. **Don't create elaborate schemas** - Follow the examples exactly
5. **Don't add features not requested** - Stick to requirements
6. **Remember security basics** - Validate all inputs
7. **Test error cases** - Verify validation and authentication work
8. **Check integration points** - Ensure services communicate correctly

---

**Implementation Philosophy**: Focus on mechanical implementation over clever engineering  
**Enhancement Philosophy**: Add complexity only when justified by real usage  
**Goal**: Reliable, maintainable applications that solve actual problems  

*This guide should require zero design decisions - just mechanical implementation of proven patterns.*