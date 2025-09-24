"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponseSchema = exports.protocolDiscoverySchema = exports.healthResponseSchema = exports.statusResponseSchema = exports.discoveryResponseSchema = exports.controlResponseSchema = exports.controlRequestSchema = exports.protocolVersionSchema = void 0;
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
// Protocol version schema
exports.protocolVersionSchema = zod_1.z.literal(constants_js_1.PROTOCOL_VERSION);
// Control endpoint schemas (protocol-surface only)
exports.controlRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(['enable', 'disable', 'toggle', 'reset', 'status']),
    categories: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    options: zod_1.z
        .object({
        temporary: zod_1.z.boolean().optional(),
        duration: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
        reason: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.controlResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: zod_1.z.string(),
    action: zod_1.z.string(),
    categories: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(['success', 'partial', 'failed']),
    message: zod_1.z.string().optional(),
    changes: zod_1.z
        .array(zod_1.z.object({
        category: zod_1.z.string(),
        enabled: zod_1.z.boolean().optional(),
        previousState: zod_1.z.boolean().optional(),
        newState: zod_1.z.boolean().optional(),
        temporary: zod_1.z.boolean().optional(),
        expiresAt: zod_1.z.string().optional(),
        effectiveAt: zod_1.z.string().optional(),
    }))
        .optional(),
});
// Discovery endpoint schemas
exports.discoveryResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: zod_1.z.string(),
    categories: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        enabled: zod_1.z.boolean(),
        temporary: zod_1.z.boolean().optional(),
        metrics: zod_1.z
            .object({
            callsTotal: zod_1.z.number(),
            callsPerSecond: zod_1.z.number(),
        })
            .optional(),
    })),
    performance: zod_1.z.object({
        totalCalls: zod_1.z.number(),
        callsPerSecond: zod_1.z.number(),
        categoryBreakdown: zod_1.z.record(zod_1.z.number()),
    }),
});
// Status endpoint schemas
exports.statusResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: zod_1.z.string(),
    enabled: zod_1.z.boolean().optional(),
    categories: zod_1.z.record(zod_1.z.boolean()).optional(),
    performance: zod_1.z
        .object({
        totalCalls: zod_1.z.number(),
        callsPerSecond: zod_1.z.number(),
    })
        .optional(),
});
// Health endpoint schemas
exports.healthResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: zod_1.z.string(),
    status: zod_1.z.enum(['healthy', 'degraded', 'unhealthy']),
    checks: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        status: zod_1.z.enum(['pass', 'warn', 'fail']),
        duration: zod_1.z.string().optional(),
        output: zod_1.z.string().optional(),
    })),
});
// Protocol discovery
exports.protocolDiscoverySchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    endpoints: zod_1.z.object({
        discovery: zod_1.z.string(),
        control: zod_1.z.string(),
        status: zod_1.z.string(),
        health: zod_1.z.string(),
    }),
    capabilities: zod_1.z.object({
        multiTenancy: zod_1.z.boolean(),
        performanceMetrics: zod_1.z.boolean(),
        temporaryControls: zod_1.z.boolean(),
        auditTrail: zod_1.z.boolean(),
    }),
    security: zod_1.z.object({
        level: zod_1.z.enum(['basic', 'standard', 'enterprise']),
        methods: zod_1.z.array(zod_1.z.string()),
        scopes: zod_1.z.array(zod_1.z.string()),
        required: zod_1.z.boolean(),
        keyRotation: zod_1.z.boolean().optional(),
        tokenRefresh: zod_1.z.boolean().optional(),
    }),
});
// Base error schema
exports.errorResponseSchema = zod_1.z.object({
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        protocol: exports.protocolVersionSchema,
    }),
});
//# sourceMappingURL=schemas.js.map