#!/bin/bash

# CI validation script for RDCP wiki curl examples
set -e

BASE_URL="http://localhost:3000"
API_KEY="dev-key-change-in-production-min-32-chars"
TEMP_DIR="/tmp/rdcp-validation"
mkdir -p "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
}

# Test 1: Protocol discovery (no auth required)
log_test "Protocol discovery endpoint"
RESPONSE=$(curl -s "$BASE_URL/.well-known/rdcp")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0"' > /dev/null 2>&1; then
    log_pass "Protocol discovery returns rdcp/1.0"
else
    log_fail "Protocol discovery failed: $RESPONSE"
fi

# Test 2: Status endpoint with auth headers
log_test "Status endpoint with API key auth"
RESPONSE=$(curl -s \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE_URL/rdcp/v1/status")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0"' > /dev/null 2>&1; then
    log_pass "Status endpoint responds correctly"
else
    log_fail "Status endpoint failed: $RESPONSE"
fi

# Test 3: POST control endpoint with legacy format (should still work)
log_test "POST control endpoint with legacy format"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"action":"enable","categories":["DATABASE"]}' \
  "$BASE_URL/rdcp/v1/control")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .action == "enable"' > /dev/null 2>&1; then
    log_pass "POST control with legacy format works"
else
    log_fail "POST control with legacy format failed: $RESPONSE"
fi

sleep 1  # Avoid rate limiting

# Test 4: PUT control endpoint with modern {key,value} format
log_test "PUT control endpoint with modern key-value format"
RESPONSE=$(curl -s -X PUT \
  -H "Content-Type: application/json" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"key":"feature:enable-beta-dashboard","value":true}' \
  "$BASE_URL/rdcp/v1/control")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .changes[0].key' > /dev/null 2>&1; then
    log_pass "PUT control with modern format works"
else
    log_fail "PUT control with modern format failed: $RESPONSE"
fi

sleep 1  # Avoid rate limiting

# Test 5: Legacy POST with categories (backward compatibility)
log_test "Legacy POST with categories array"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"action":"disable","categories":["DATABASE"]}' \
  "$BASE_URL/rdcp/v1/control")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .action == "disable"' > /dev/null 2>&1; then
    log_pass "Legacy POST disable works"
else
    log_fail "Legacy POST disable failed: $RESPONSE"
fi

sleep 1  # Avoid rate limiting

# Test 6: POST control with TTL options (legacy format)
log_test "POST control endpoint with TTL"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"action":"enable","categories":["API_ROUTES"],"options":{"temporary":true,"duration":"2s"}}' \
  "$BASE_URL/rdcp/v1/control")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .action == "enable"' > /dev/null 2>&1; then
    log_pass "POST control with TTL works"
else
    log_fail "POST control with TTL failed: $RESPONSE"
fi

# Test 7: Discovery endpoint
log_test "Discovery endpoint with auth"
RESPONSE=$(curl -s \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE_URL/rdcp/v1/discovery")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .categories' > /dev/null 2>&1; then
    log_pass "Discovery endpoint works"
else
    log_fail "Discovery endpoint failed: $RESPONSE"
fi

# Test 8: Health endpoint
log_test "Health endpoint with auth"
RESPONSE=$(curl -s \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE_URL/rdcp/v1/health")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0" and .status' > /dev/null 2>&1; then
    log_pass "Health endpoint works"
else
    log_fail "Health endpoint failed: $RESPONSE"
fi

# Test 9: Test missing auth headers (should fail with 401)
log_test "Missing auth headers should return 401"
RESPONSE=$(curl -s -w "%{http_code}" \
  "$BASE_URL/rdcp/v1/status")
HTTP_CODE=${RESPONSE: -3}
if [ "$HTTP_CODE" = "401" ]; then
    log_pass "Missing auth correctly returns 401"
else
    log_fail "Missing auth returned $HTTP_CODE instead of 401"
fi

# Test 10: Test invalid API key (should fail with 401)
log_test "Invalid API key should return 401"
RESPONSE=$(curl -s -w "%{http_code}" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer invalid-key" \
  "$BASE_URL/rdcp/v1/status")
HTTP_CODE=${RESPONSE: -3}
if [ "$HTTP_CODE" = "401" ]; then
    log_pass "Invalid API key correctly returns 401"
else
    log_fail "Invalid API key returned $HTTP_CODE instead of 401"
fi

# Test 11: Test that PATCH to control endpoint fails (unsupported method)
log_test "PATCH to control endpoint should fail (unsupported method)"
RESPONSE=$(curl -s -w "%{http_code}" -X PATCH \
  -H "Content-Type: application/json" \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"key":"test","value":true}' \
  "$BASE_URL/rdcp/v1/control")
HTTP_CODE=${RESPONSE: -3}
if [ "$HTTP_CODE" = "405" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
    log_pass "PATCH to control correctly fails (unsupported method)"
else
    log_fail "PATCH to control returned $HTTP_CODE instead of 400/405/404"
fi

# Test 12: Test request correlation headers
log_test "Request correlation header (X-Request-Id)"
UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
RESPONSE=$(curl -s -i \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "X-RDCP-Request-ID: $UUID" \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE_URL/rdcp/v1/status" | grep -i "x-request-id")
if echo "$RESPONSE" | grep -q "$UUID"; then
    log_pass "Request correlation header correctly echoed"
else
    log_fail "Request correlation header not found or incorrect: $RESPONSE"
fi

# Test 13: Validate alternative Authorization header format (X-API-Key)
log_test "X-API-Key header format"
RESPONSE=$(curl -s \
  -H "X-RDCP-Auth-Method: api-key" \
  -H "X-RDCP-Client-ID: validation-client" \
  -H "X-API-Key: $API_KEY" \
  "$BASE_URL/rdcp/v1/status")
if echo "$RESPONSE" | jq -e '.protocol == "rdcp/1.0"' > /dev/null 2>&1; then
    log_pass "X-API-Key header format works"
else
    log_fail "X-API-Key header format failed: $RESPONSE"
fi

# Summary
echo
echo "========================="
echo "VALIDATION SUMMARY"
echo "========================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All curl examples are valid!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_TESTS curl examples failed validation${NC}"
    exit 1
fi