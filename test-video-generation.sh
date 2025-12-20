#!/bin/bash

# ComfyUI Video Generation Test Suite
# Automated testing for AnimateDiff and SVD video generation

echo "🧪 ComfyUI Video Generation Test Suite"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  
  echo -n "Testing $name... "
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
    http_code="${response: -3}"
    body="${response%???}"
  else
    response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
    http_code="${response: -3}"
    body="${response%???}"
  fi
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((PASS++))
    
    # Show response summary for some endpoints
    if [[ "$endpoint" == *"/detect-models"* ]] || [[ "$endpoint" == *"/requirements"* ]]; then
      echo "   Response: ${body:0:100}..."
    fi
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    ((FAIL++))
    
    # Show error details
    if [ ${#body} -gt 0 ]; then
      echo "   Error: ${body:0:200}"
    fi
  fi
}

# Phase 1: Health Checks
echo -e "\n${YELLOW}📋 Phase 1: Health Checks${NC}"
test_endpoint "Backend health" "GET" "/api/health"
test_endpoint "Worker stats" "GET" "/api/workers"
test_endpoint "Queue stats" "GET" "/api/queue/stats"

# Phase 2: Model Detection
echo -e "\n${YELLOW}📋 Phase 2: Model Detection${NC}"
test_endpoint "Detect all models" "GET" "/api/video/detect-models"
test_endpoint "AnimateDiff requirements" "GET" "/api/video/requirements/animatediff"
test_endpoint "SVD requirements" "GET" "/api/video/requirements/svd"

# Phase 3: Video Generation (Quick Tests)
echo -e "\n${YELLOW}📋 Phase 3: Video Generation${NC}"

# Test AnimateDiff (16 frames - quick test)
echo -e "${YELLOW}Testing AnimateDiff generation (16 frames)...${NC}"
animatediff_response=$(curl -s -X POST "$BASE_URL/api/video/generate/animatediff" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A peaceful sunset over mountains",
    "numFrames": 16,
    "fps": 8,
    "steps": 20,
    "userId": "test-user"
  }')

animatediff_job_id=$(echo $animatediff_response | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$animatediff_job_id" ]; then
  echo -e "${GREEN}✅ AnimateDiff job submitted: $animatediff_job_id${NC}"
  ((PASS++))
  
  # Poll job status (max 10 checks)
  echo -n "Polling job status "
  for i in {1..10}; do
    sleep 2
    echo -n "."
    
    status_response=$(curl -s "$BASE_URL/api/video/job/$animatediff_job_id")
    status=$(echo $status_response | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    progress=$(echo $status_response | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    if [ "$status" == "completed" ]; then
      echo -e "\n${GREEN}✅ Job completed successfully (${progress}%)${NC}"
      break
    elif [ "$status" == "failed" ]; then
      echo -e "\n${RED}❌ Job failed${NC}"
      break
    fi
  done
  echo ""
else
  echo -e "${RED}❌ Failed to submit AnimateDiff job${NC}"
  ((FAIL++))
fi

# Phase 4: Queue Management
echo -e "\n${YELLOW}📋 Phase 4: Queue Management${NC}"
test_endpoint "Get queue stats" "GET" "/api/video/queue-stats"
test_endpoint "Get video history" "GET" "/api/video/history?userId=test-user&limit=5"

# Summary
echo -e "\n========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️ Some tests failed. Check logs above.${NC}"
  exit 1
fi
