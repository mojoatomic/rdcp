#!/usr/bin/env bash
set -euo pipefail

# RDCP Demo Proof Script
# Walks through major scenarios end-to-end using cURL against a running demo app.
# Requirements: curl, jq, node, jsonwebtoken (available in repo dev deps)
# Usage: bash scripts/demo-proof.sh

BASE_URL=${BASE_URL:-http://localhost:3000}
TENANT=${TENANT:-tenant-A}

# Demo secrets handling
if [[ -z "${RDCP_API_KEY:-}" ]]; then
  echo "[warn] RDCP_API_KEY not set; using insecure demo default (dev only)" >&2
  export RDCP_API_KEY='dev-key-change-in-production-min-32-chars'
fi
if [[ -z "${JWT_SECRET:-}" ]]; then
  echo "[warn] JWT_SECRET not set; using insecure demo default (dev only)" >&2
  export JWT_SECRET='change-in-production'
fi

jq --version >/dev/null 2>&1 || { echo "[error] jq is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[error] node is required"; exit 1; }

# Helpers
hr() { printf "\n==================== %s ====================\n\n" "$1"; }
call() {
  echo "+ $*"
  eval "$@"
}

# Tokens
TOKEN_VALID=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'user@example.com', scopes: ['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_READ_A=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'reader@example.com', scopes: ['read:${TENANT}'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_CONTROL_A=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control:${TENANT}'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_CONTROL_GLOBAL=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_CTRL_ALL=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control','control:${process.env.TENANT||'tenant-A'}','read','read:${process.env.TENANT||'tenant-A'}'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")

# mTLS demo cert
CERT_JSON='{"subject":"CN=client.tenantA.rdcp.internal","validFrom":"2025-01-01T00:00:00.000Z","validTo":"2099-01-01T00:00:00.000Z","fingerprint256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'
CERT_B64=$(printf "%s" "$CERT_JSON" | base64)

hr "Protocol discovery & health"
call "curl -s $BASE_URL/.well-known/rdcp | jq"
call "curl -s $BASE_URL/rdcp/v1/discovery | jq"
call "curl -s $BASE_URL/rdcp/v1/health | jq"

hr "Required headers enforcement (expect 401s)"
call "curl -i $BASE_URL/rdcp/v1/status | head -n 1"
call "curl -i -H 'X-RDCP-Auth-Method: invalid' -H 'X-RDCP-Client-ID: demo-client' $BASE_URL/rdcp/v1/status | head -n 1"
call "curl -i -H 'X-RDCP-Auth-Method: api-key' $BASE_URL/rdcp/v1/status | head -n 1"

hr "Basic auth (API key)"
call "curl -s -H 'X-RDCP-Auth-Method: api-key' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$RDCP_API_KEY"\""" $BASE_URL/rdcp/v1/status | jq"

hr "Standard auth (JWT bearer)"
call "curl -s -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$TOKEN_VALID"\""" $BASE_URL/rdcp/v1/status | jq"

hr "Tenant RBAC (bearer-only tenant routes)"
call "curl -s -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$TOKEN_READ_A"\""" $BASE_URL/rdcp/v1/tenants/$TENANT/settings | jq"
TOKEN_READ_OTHER=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'reader@example.com', scopes: ['read:tenant-B'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
call "curl -i -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$TOKEN_READ_OTHER"\""" $BASE_URL/rdcp/v1/tenants/$TENANT/settings | head -n 1"
call "curl -i -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$TOKEN_CONTROL_GLOBAL"\""" -H 'Content-Type: application/json' -d '{"action":"enable","categories":["API_ROUTES"]}' $BASE_URL/rdcp/v1/tenants/$TENANT/control | head -n 1"
call "curl -i -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H 'Authorization: Bearer '"\""$TOKEN_CONTROL_A"\""" -H 'Content-Type: application/json' -d '{"action":"enable","categories":["API_ROUTES"]}' $BASE_URL/rdcp/v1/tenants/$TENANT/control | head -n 1"
call "curl -i -H 'X-RDCP-Auth-Method: api-key' -H 'X-RDCP-Client-ID: demo-client' $BASE_URL/rdcp/v1/tenants/$TENANT/settings | head -n 1"

hr "Temporary controls (TTL)"
CID1="ttl1-$(date +%s%3N)" CID2="ttl2-$(date +%s%3N)" CID3="ttl3-$(date +%s%3N)"
call "curl -s -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: $CID1' -H 'Authorization: Bearer '"\""$TOKEN_CTRL_ALL"\""" -H 'Content-Type: application/json' -d '{"action":"enable","categories":["CACHE"],"options":{"temporary":true,"duration":"150ms"}}' $BASE_URL/rdcp/v1/tenants/$TENANT/control | jq"
call "curl -s -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: $CID2' -H 'Authorization: Bearer '"\""$TOKEN_CTRL_ALL"\""" $BASE_URL/rdcp/v1/tenants/$TENANT/settings | jq '.settings.categories'"
sleep 0.25
call "curl -s -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: $CID3' -H 'Authorization: Bearer '"\""$TOKEN_CTRL_ALL"\""" $BASE_URL/rdcp/v1/tenants/$TENANT/settings | jq '.settings.categories'"

hr "Rate limit (expect 429 on last)"
for i in 1 2 3 4; do
  call "curl -s -o /dev/null -w '%{http_code}\n' -H 'X-RDCP-Auth-Method: api-key' -H 'X-RDCP-Client-ID: rate-test-$(date +%s%3N)-$i' -H 'Authorization: Bearer '"\""$RDCP_API_KEY"\""" -H 'Content-Type: application/json' -d '{"action":"enable","categories":["API_ROUTES"]}' $BASE_URL/rdcp/v1/control"
 done

hr "Enterprise mTLS & hybrid"
call "curl -i -H 'X-RDCP-Auth-Method: mtls' -H 'X-RDCP-Client-ID: client-mtls' -H 'X-Client-Cert: '"\""$CERT_B64"\""" $BASE_URL/rdcp/v1/status | head -n 1"
TOKEN_BAD=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'client.tenantA.rdcp.internal' }, 'wrong-secret', { algorithm:'HS256', expiresIn:'5m' }))")
call "curl -i -H 'X-RDCP-Auth-Method: mtls' -H 'X-RDCP-Client-ID: client-hybrid' -H 'X-Client-Cert: '"\""$CERT_B64"\""" -H 'Authorization: Bearer '"\""$TOKEN_BAD"\""" $BASE_URL/rdcp/v1/status | head -n 1"

hr "Done"
