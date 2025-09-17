// Next.js App Router: app/.well-known/rdcp/route.ts
// Protocol Discovery endpoint - copy this to your Next.js app

export async function GET(): Promise<Response> {
  return Response.json({
    protocol: 'rdcp/1.0',
    endpoints: {
      discovery: '/rdcp/v1/discovery',
      control: '/rdcp/v1/control',
      status: '/rdcp/v1/status',
      health: '/rdcp/v1/health'
    },
    capabilities: {
      multiTenancy: false,
      performanceMetrics: true,
      temporaryControls: false,
      auditTrail: false
    },
    security: {
      level: 'basic',
      methods: ['api-key'],
      scopes: ['discovery', 'status', 'control'],
      required: true
    }
  })
}