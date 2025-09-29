import { z } from 'zod';
import { PROTOCOL_VERSION, RDCP_PATHS, } from './constants.js';
import { errorResponseSchema, } from './schemas.js';
// Protocol version (literal) fixture
export const protocolVersionFixture = PROTOCOL_VERSION;
// Control request fixtures
export const controlRequestEnableFixture = {
    action: 'enable',
    categories: ['API_ROUTES'],
    options: { temporary: true, duration: '15m', reason: 'incident-debug' },
};
export const controlRequestDisableFixture = {
    action: 'disable',
    categories: ['API_ROUTES'],
};
export const controlRequestResetFixture = {
    action: 'reset',
    categories: [],
};
export const controlRequestStatusFixture = {
    action: 'status',
    categories: ['DATABASE'],
};
// Control response fixture
export const controlResponseFixture = {
    protocol: z.literal(PROTOCOL_VERSION).parse(PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    action: 'enable',
    categories: ['API_ROUTES'],
    status: 'success',
    message: 'Enabled categories',
    changes: [
        {
            category: 'API_ROUTES',
            previousState: false,
            newState: true,
            temporary: true,
            expiresAt: new Date(15 * 60 * 1000).toISOString(),
        },
    ],
};
// Discovery response fixture
export const discoveryResponseFixture = {
    protocol: z.literal(PROTOCOL_VERSION).parse(PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    categories: [
        { name: 'API_ROUTES', description: 'HTTP route logging', enabled: false },
        { name: 'DATABASE', description: 'DB debug', enabled: false },
    ],
    performance: {
        totalCalls: 0,
        callsPerSecond: 0,
        categoryBreakdown: { API_ROUTES: 0, DATABASE: 0 },
    },
};
// Status response fixture
export const statusResponseFixture = {
    protocol: z.literal(PROTOCOL_VERSION).parse(PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    enabled: true,
    categories: { API_ROUTES: true, DATABASE: false },
    performance: { totalCalls: 10, callsPerSecond: 2 },
};
// Health response fixture
export const healthResponseFixture = {
    protocol: z.literal(PROTOCOL_VERSION).parse(PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    status: 'healthy',
    checks: [
        { name: 'redis', status: 'pass', duration: '5ms' },
        { name: 'db', status: 'pass', duration: '8ms' },
    ],
};
// Protocol discovery fixture
export const protocolDiscoveryFixture = {
    protocol: z.literal(PROTOCOL_VERSION).parse(PROTOCOL_VERSION),
    endpoints: {
        discovery: RDCP_PATHS.DISCOVERY,
        control: RDCP_PATHS.CONTROL,
        status: RDCP_PATHS.STATUS,
        health: RDCP_PATHS.HEALTH,
    },
    capabilities: {
        multiTenancy: true,
        performanceMetrics: true,
        temporaryControls: true,
        auditTrail: true,
    },
    security: {
        level: 'standard',
        methods: ['api-key', 'bearer', 'mtls', 'hybrid'],
        scopes: ['read', 'control', 'read:tenant', 'control:tenant'],
        required: true,
        keyRotation: true,
        tokenRefresh: true,
    },
};
// Error response fixture
export const errorResponseFixture = errorResponseSchema.parse({
    error: {
        code: 'RDCP_AUTH_REQUIRED',
        message: 'Authentication required',
        protocol: PROTOCOL_VERSION,
    },
});
//# sourceMappingURL=fixtures.js.map