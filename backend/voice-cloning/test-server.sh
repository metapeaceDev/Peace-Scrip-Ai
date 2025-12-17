#!/bin/bash

###############################################################################
# Voice Cloning Server - Quick Test
# Tests if the server is running and responsive
###############################################################################

echo "🧪 Testing Voice Cloning Server..."
echo ""

# Test health endpoint
echo "1️⃣  Health Check:"
response=$(curl -s http://localhost:8001/health)
if [ $? -eq 0 ]; then
    echo "   ✅ Server is responding"
    echo "   Response: $response"
else
    echo "   ❌ Server is not responding"
    echo "   Make sure to run: ./deploy.sh"
    exit 1
fi
echo ""

# Test model info
echo "2️⃣  Model Info:"
response=$(curl -s http://localhost:8001/model/info)
if [ $? -eq 0 ]; then
    echo "   ✅ Model endpoint working"
    echo "   Response: $response"
else
    echo "   ❌ Model endpoint failed"
fi
echo ""

# Test voices list
echo "3️⃣  Voices List:"
response=$(curl -s http://localhost:8001/voices)
if [ $? -eq 0 ]; then
    echo "   ✅ Voices endpoint working"
    echo "   Response: $response"
else
    echo "   ❌ Voices endpoint failed"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed!"
echo ""
echo "Server is ready at: http://localhost:8001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
