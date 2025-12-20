#!/bin/bash
# RunPod Deployment Script
# Builds and deploys ComfyUI to RunPod cloud

set -e

echo "🚀 Peace Script AI - RunPod Deployment"
echo "======================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    echo "📝 Please create .env.local from .env.example first"
    exit 1
fi

# Load environment variables
source .env.local

# Check if RUNPOD_API_KEY is set
if [ -z "$VITE_RUNPOD_API_KEY" ]; then
    echo "❌ Error: VITE_RUNPOD_API_KEY not set in .env.local"
    echo "📝 Get your API key from: https://www.runpod.io/console/user/settings"
    exit 1
fi

# Docker registry (change to your Docker Hub username)
DOCKER_REGISTRY="${DOCKER_REGISTRY:-yourusername}"
IMAGE_NAME="peace-comfyui"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo ""
echo "📦 Step 1: Building Docker Image"
echo "--------------------------------"
echo "Image: ${FULL_IMAGE}"
echo ""

docker build -f runpod-comfyui.Dockerfile -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

echo ""
echo "📤 Step 2: Pushing to Docker Registry"
echo "-------------------------------------"

# Tag image
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE}

# Push to registry
docker push ${FULL_IMAGE}

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed"
    echo "💡 Make sure you're logged in: docker login"
    exit 1
fi

echo "✅ Image pushed to registry"

echo ""
echo "🚀 Step 3: Deploying to RunPod"
echo "------------------------------"

# Deploy using RunPod API
RESPONSE=$(curl -s -X POST https://api.runpod.io/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${VITE_RUNPOD_API_KEY}" \
  -d "{
    \"query\": \"mutation {
      podFindAndDeployOnDemand(
        input: {
          cloudType: SECURE
          gpuTypeId: \\\"NVIDIA RTX 3090\\\"
          containerDiskInGb: 50
          volumeInGb: 100
          dockerArgs: \\\"${FULL_IMAGE}\\\"
          ports: \\\"8188/http\\\"
        }
      ) {
        id
        desiredStatus
        imageName
      }
    }\"
  }")

# Extract pod ID from response
POD_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$POD_ID" ]; then
    echo "❌ Deployment failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Pod deployed successfully!"
echo ""
echo "📋 Pod Details"
echo "--------------"
echo "Pod ID: ${POD_ID}"
echo "Pod URL: https://${POD_ID}-8188.proxy.runpod.net"
echo ""

# Update .env.local with new pod ID and URL
echo "📝 Updating .env.local..."

# Create temp file
TEMP_FILE=$(mktemp)

# Update pod ID and URL
if grep -q "VITE_RUNPOD_POD_ID=" .env.local; then
    sed "s|VITE_RUNPOD_POD_ID=.*|VITE_RUNPOD_POD_ID=${POD_ID}|g" .env.local > $TEMP_FILE
else
    echo "VITE_RUNPOD_POD_ID=${POD_ID}" >> .env.local
    cp .env.local $TEMP_FILE
fi

if grep -q "VITE_COMFYUI_CLOUD_URL=" $TEMP_FILE; then
    sed "s|VITE_COMFYUI_CLOUD_URL=.*|VITE_COMFYUI_CLOUD_URL=https://${POD_ID}-8188.proxy.runpod.net|g" $TEMP_FILE > .env.local
else
    echo "VITE_COMFYUI_CLOUD_URL=https://${POD_ID}-8188.proxy.runpod.net" >> $TEMP_FILE
    mv $TEMP_FILE .env.local
fi

rm -f $TEMP_FILE

echo "✅ .env.local updated"

echo ""
echo "⏳ Waiting for pod to be ready..."
echo "This may take 2-5 minutes..."

# Wait for pod to be ready
MAX_WAIT=300  # 5 minutes
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -X POST https://api.runpod.io/graphql \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${VITE_RUNPOD_API_KEY}" \
      -d "{
        \"query\": \"query {
          pod(input: { podId: \\\"${POD_ID}\\\" }) {
            desiredStatus
          }
        }\"
      }" | grep -o '"desiredStatus":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "RUNNING" ]; then
        # Check if ComfyUI is accessible
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://${POD_ID}-8188.proxy.runpod.net/system_stats)
        
        if [ "$HEALTH" = "200" ]; then
            echo ""
            echo "✅ Pod is ready and ComfyUI is running!"
            break
        fi
    fi
    
    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Timeout waiting for pod to be ready"
    echo "💡 You can check pod status manually at: https://www.runpod.io/console/pods"
else
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================"
    echo ""
    echo "📍 Access your ComfyUI:"
    echo "   https://${POD_ID}-8188.proxy.runpod.net"
    echo ""
    echo "🎮 Manage your pod:"
    echo "   https://www.runpod.io/console/pods"
    echo ""
    echo "💰 Estimated Cost:"
    echo "   On-Demand: ~$0.34/hour"
    echo "   Spot Price: ~$0.24/hour"
    echo "   Per Video: ~$0.02 (with optimization)"
    echo ""
    echo "💡 Next Steps:"
    echo "   1. Test video generation in the app"
    echo "   2. Monitor costs in RunPod console"
    echo "   3. Enable auto-shutdown to save costs"
    echo ""
fi
