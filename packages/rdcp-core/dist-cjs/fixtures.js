"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponseFixture = exports.protocolDiscoveryFixture = exports.healthResponseFixture = exports.statusResponseFixture = exports.discoveryResponseFixture = exports.controlResponseFixture = exports.controlRequestStatusFixture = exports.controlRequestResetFixture = exports.controlRequestDisableFixture = exports.controlRequestEnableFixture = exports.protocolVersionFixture = void 0;
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
const schemas_js_1 = require("./schemas.js");
// Protocol version (literal) fixture
exports.protocolVersionFixture = constants_js_1.PROTOCOL_VERSION;
// Control request fixtures
exports.controlRequestEnableFixture = {
    action: 'enable',
    categories: ['API_ROUTES'],
    options: { temporary: true, duration: '15m', reason: 'incident-debug' },
};
exports.controlRequestDisableFixture = {
    action: 'disable',
    categories: ['API_ROUTES'],
};
exports.controlRequestResetFixture = {
    action: 'reset',
    categories: [],
};
exports.controlRequestStatusFixture = {
    action: 'status',
    categories: ['DATABASE'],
};
// Control response fixture
exports.controlResponseFixture = {
    protocol: zod_1.z.literal(constants_js_1.PROTOCOL_VERSION).parse(constants_js_1.PROTOCOL_VERSION),
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
exports.discoveryResponseFixture = {
    protocol: zod_1.z.literal(constants_js_1.PROTOCOL_VERSION).parse(constants_js_1.PROTOCOL_VERSION),
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
exports.statusResponseFixture = {
    protocol: zod_1.z.literal(constants_js_1.PROTOCOL_VERSION).parse(constants_js_1.PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    enabled: true,
    categories: { API_ROUTES: true, DATABASE: false },
    performance: { totalCalls: 10, callsPerSecond: 2 },
};
// Health response fixture
exports.healthResponseFixture = {
    protocol: zod_1.z.literal(constants_js_1.PROTOCOL_VERSION).parse(constants_js_1.PROTOCOL_VERSION),
    timestamp: new Date(0).toISOString(),
    status: 'healthy',
    checks: [
        { name: 'redis', status: 'pass', duration: '5ms' },
        { name: 'db', status: 'pass', duration: '8ms' },
    ],
};
// Protocol discovery fixture
exports.protocolDiscoveryFixture = {
    protocol: zod_1.z.literal(constants_js_1.PROTOCOL_VERSION).parse(constants_js_1.PROTOCOL_VERSION),
    endpoints: {
        discovery: constants_js_1.RDCP_PATHS.DISCOVERY,
        control: constants_js_1.RDCP_PATHS.CONTROL,
        status: constants_js_1.RDCP_PATHS.STATUS,
        health: constants_js_1.RDCP_PATHS.HEALTH,
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
exports.errorResponseFixture = schemas_js_1.errorResponseSchema.parse({
    error: {
        code: 'RDCP_AUTH_REQUIRED',
        message: 'Authentication required',
        protocol: constants_js_1.PROTOCOL_VERSION,
    },
});
//# sourceMappingURL=fixtures.js.map