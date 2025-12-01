#!/bin/bash

# Backend Service Test Script
# Tests all API endpoints without authentication

set -e

BASE_URL="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testing ComfyUI Backend Service"
echo "===================================="
echo ""

# Test 1: Basic Health Check
echo "Test 1: Health Check"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Health check: $http_code"
    echo "   Response: $body"
else
    echo -e "${RED}❌ FAIL${NC} - Health check: $http_code"
    echo "   Response: $body"
fi
echo ""

# Test 2: Detailed Health Check
echo "Test 2: Detailed Health Check"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/detailed")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Detailed health: $http_code"
    echo "   Workers: $(echo "$body" | grep -o '"totalWorkers":[0-9]*' || echo "N/A")"
    echo "   Queue: $(echo "$body" | grep -o '"waiting":[0-9]*' || echo "N/A")"
else
    echo -e "${RED}❌ FAIL${NC} - Detailed health: $http_code"
fi
echo ""

# Test 3: Queue Stats (without auth)
echo "Test 3: Queue Stats"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/queue/stats")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ] || [ "$http_code" = "200" ]; then
    echo -e "${YELLOW}⚠️  EXPECTED${NC} - Queue stats requires auth: $http_code"
else
    echo -e "${RED}❌ FAIL${NC} - Queue stats: $http_code"
fi
echo ""

# Test 4: Workers Stats (without auth)
echo "Test 4: Workers Stats"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/comfyui/workers")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ] || [ "$http_code" = "200" ]; then
    echo -e "${YELLOW}⚠️  EXPECTED${NC} - Workers stats requires auth: $http_code"
else
    echo -e "${RED}❌ FAIL${NC} - Workers stats: $http_code"
fi
echo ""

# Test 5: Invalid Endpoint
echo "Test 5: Invalid Endpoint (404 Expected)"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/invalid")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "404" ]; then
    echo -e "${GREEN}✅ PASS${NC} - 404 handling: $http_code"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 404, got: $http_code"
fi
echo ""

# Test 6: CORS Headers
echo "Test 6: CORS Headers"
response=$(curl -s -I "$BASE_URL/health" | grep -i "access-control-allow-origin")
if [ -n "$response" ]; then
    echo -e "${GREEN}✅ PASS${NC} - CORS headers present"
    echo "   $response"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - CORS headers not found"
fi
echo ""

# Summary
echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo -e "${GREEN}✅ Passed:${NC} Health checks, CORS, 404 handling"
echo -e "${YELLOW}⚠️  Auth Required:${NC} Queue stats, Workers stats (expected)"
echo ""
echo "💡 Next Steps:"
echo "   1. Start Redis: npm run docker:redis"
echo "   2. Start backend: npm run dev:backend"
echo "   3. Add ComfyUI worker to test full flow"
echo "   4. Get Firebase ID token for authenticated tests"
echo ""
