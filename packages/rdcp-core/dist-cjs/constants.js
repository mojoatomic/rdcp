"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RDCP_PATHS = exports.RDCP_HEADERS = exports.PROTOCOL_VERSION = void 0;
exports.PROTOCOL_VERSION = 'rdcp/1.0';
exports.RDCP_HEADERS = {
    REQUEST_ID: 'X-RDCP-Request-ID',
    TENANT_ID: 'X-RDCP-Tenant-ID',
    AUTH_METHOD: 'X-RDCP-Auth-Method',
    CLIENT_ID: 'X-RDCP-Client-ID',
    ISOLATION_LEVEL: 'X-RDCP-Isolation-Level',
    TENANT_NAME: 'X-RDCP-Tenant-Name',
    KEY_VERSION: 'X-RDCP-Key-Version',
    TOKEN_TYPE: 'X-RDCP-Token-Type',
};
exports.RDCP_PATHS = {
    WELL_KNOWN_RDCP: '/.well-known/rdcp',
    BASE: '/rdcp/v1',
    DISCOVERY: '/rdcp/v1/discovery',
    CONTROL: '/rdcp/v1/control',
    STATUS: '/rdcp/v1/status',
    HEALTH: '/rdcp/v1/health',
};
//# sourceMappingURL=constants.js.map