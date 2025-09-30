"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponseSchema = exports.protocolDiscoverySchema = exports.healthResponseSchema = exports.statusResponseSchema = exports.discoveryResponseSchema = exports.controlResponseSchema = exports.controlRequestSchema = exports.protocolVersionSchema = void 0;
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
// Domain-specific primitives (strict)
const TIMESTAMP = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
const DURATION = zod_1.z.union([
    zod_1.z.number().int().nonnegative(),
    zod_1.z.string().regex(/^[0-9]+(s|m|h|d)$/),
]);
const CATEGORY_NAME = zod_1.z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/);
const CATEGORY_LIST = zod_1.z
    .array(CATEGORY_NAME)
    .min(1)
    .superRefine((arr, ctx) => {
    const seen = new Set();
    for (const v of arr) {
        if (seen.has(v)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `Duplicate category: ${v}`,
            });
            return;
        }
        seen.add(v);
    }
});
const ERROR_CODE = zod_1.z.string().regex(/^[A-Z0-9_]{3,64}$/);
const COUNTER_NUMBER = zod_1.z.number().min(0);
const RATE_NUMBER = zod_1.z.number().min(0);
// Protocol version schema
exports.protocolVersionSchema = zod_1.z.literal(constants_js_1.PROTOCOL_VERSION);
// Control endpoint schemas (protocol-surface only)
exports.controlRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(['enable', 'disable', 'toggle', 'reset', 'status']),
    categories: zod_1.z.union([CATEGORY_NAME, CATEGORY_LIST]),
    options: zod_1.z
        .object({
        temporary: zod_1.z.boolean().optional(),
        duration: DURATION.optional(),
        reason: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.controlResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: TIMESTAMP,
    action: zod_1.z.enum(['enable', 'disable', 'toggle', 'reset', 'status']),
    categories: CATEGORY_LIST,
    status: zod_1.z.enum(['success', 'partial', 'failed']),
    message: zod_1.z.string().optional(),
    changes: zod_1.z
        .array(zod_1.z.object({
        category: CATEGORY_NAME,
        enabled: zod_1.z.boolean().optional(),
        previousState: zod_1.z.boolean().optional(),
        newState: zod_1.z.boolean().optional(),
        temporary: zod_1.z.boolean().optional(),
        expiresAt: TIMESTAMP.optional(),
        effectiveAt: TIMESTAMP.optional(),
    }))
        .optional(),
});
// Discovery endpoint schemas
exports.discoveryResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: TIMESTAMP,
    categories: zod_1.z.array(zod_1.z.object({
        name: CATEGORY_NAME,
        description: zod_1.z.string(),
        enabled: zod_1.z.boolean(),
        temporary: zod_1.z.boolean().optional(),
        metrics: zod_1.z
            .object({
            callsTotal: COUNTER_NUMBER,
            callsPerSecond: RATE_NUMBER,
        })
            .optional(),
    })),
    performance: zod_1.z.object({
        totalCalls: COUNTER_NUMBER,
        callsPerSecond: RATE_NUMBER,
        categoryBreakdown: zod_1.z.record(COUNTER_NUMBER),
    }),
});
// Status endpoint schemas
exports.statusResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: TIMESTAMP,
    enabled: zod_1.z.boolean().optional(),
    categories: zod_1.z.record(zod_1.z.boolean()).optional(),
    performance: zod_1.z
        .object({
        totalCalls: COUNTER_NUMBER,
        callsPerSecond: RATE_NUMBER,
    })
        .optional(),
});
// Health endpoint schemas (duration uses implementation-specific ms string)
exports.healthResponseSchema = zod_1.z.object({
    protocol: exports.protocolVersionSchema,
    timestamp: TIMESTAMP,
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
        code: ERROR_CODE,
        message: zod_1.z.string(),
        protocol: exports.protocolVersionSchema,
    }),
});
//# sourceMappingURL=schemas.js.map