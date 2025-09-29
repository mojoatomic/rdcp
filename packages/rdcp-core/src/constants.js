export const PROTOCOL_VERSION = 'rdcp/1.0';
export const RDCP_HEADERS = {
    REQUEST_ID: 'X-RDCP-Request-ID',
    TENANT_ID: 'X-RDCP-Tenant-ID',
    AUTH_METHOD: 'X-RDCP-Auth-Method',
    CLIENT_ID: 'X-RDCP-Client-ID',
    ISOLATION_LEVEL: 'X-RDCP-Isolation-Level',
    TENANT_NAME: 'X-RDCP-Tenant-Name',
    KEY_VERSION: 'X-RDCP-Key-Version',
    TOKEN_TYPE: 'X-RDCP-Token-Type',
};
export const RDCP_PATHS = {
    WELL_KNOWN_RDCP: '/.well-known/rdcp',
    BASE: '/rdcp/v1',
    DISCOVERY: '/rdcp/v1/discovery',
    CONTROL: '/rdcp/v1/control',
    STATUS: '/rdcp/v1/status',
    HEALTH: '/rdcp/v1/health',
};
//# sourceMappingURL=constants.js.map