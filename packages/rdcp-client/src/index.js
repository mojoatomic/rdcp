import { discoveryResponseSchema, statusResponseSchema, healthResponseSchema, controlRequestSchema, controlResponseSchema, errorResponseSchema, } from '@rdcp.dev/core';
export class RDCPClientError extends Error {
    constructor(message, code, status, details) {
        super(message);
        if (code !== undefined)
            this.code = code;
        if (status !== undefined)
            this.status = status;
        if (details !== undefined)
            this.details = details;
    }
}
async function doFetch(f, url, init, schema) {
    const res = await f(url, init);
    const txt = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    const maybeJson = contentType.includes('application/json');
    const body = maybeJson && txt ? JSON.parse(txt) : undefined;
    if (!res.ok) {
        let code;
        if (body) {
            const parsed = errorResponseSchema.safeParse(body);
            if (parsed.success)
                code = parsed.data.error.code;
        }
        throw new RDCPClientError('RDCP request failed', code, res.status, body);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new RDCPClientError('Invalid RDCP response', 'RDCP_VALIDATION_ERROR', res.status, parsed.error);
    }
    return parsed.data;
}
export function createRDCPClient(options) {
    const f = options.fetch ?? fetch;
    const base = options.baseUrl.replace(/\/$/, '');
    const baseHeaders = options.headers ?? {};
    return {
        async getDiscovery() {
            const url = `${base}/rdcp/v1/discovery`;
            return doFetch(f, url, { method: 'GET', headers: { ...baseHeaders } }, discoveryResponseSchema);
        },
        async getStatus() {
            const url = `${base}/rdcp/v1/status`;
            return doFetch(f, url, { method: 'GET', headers: { ...baseHeaders } }, statusResponseSchema);
        },
        async getHealth() {
            const url = `${base}/rdcp/v1/health`;
            return doFetch(f, url, { method: 'GET', headers: { ...baseHeaders } }, healthResponseSchema);
        },
        async postControl(body) {
            const url = `${base}/rdcp/v1/control`;
            const parsed = controlRequestSchema.safeParse(body);
            if (!parsed.success) {
                throw new RDCPClientError('Invalid control request', 'RDCP_VALIDATION_ERROR', 0, parsed.error);
            }
            return doFetch(f, url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...baseHeaders },
                body: JSON.stringify(parsed.data),
            }, controlResponseSchema);
        },
    };
}
//# sourceMappingURL=index.js.map