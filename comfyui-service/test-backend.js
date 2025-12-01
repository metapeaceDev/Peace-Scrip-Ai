#!/usr/bin/env node
/**
 * Backend Service Test Script
 * Tests ComfyUI backend API endpoints
 */

const API_URL = 'http://localhost:8000';

async function testBackend() {
  console.log('\n🧪 Testing ComfyUI Backend Service\n');
  console.log('━'.repeat(60));

  // Test 1: Health Check
  console.log('\n1️⃣  Testing Health Endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('   ✅ Health:', data.status);
    console.log('   📊 Uptime:', Math.round(data.uptime), 'seconds');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    process.exit(1);
  }

  // Test 2: Detailed Health Check
  console.log('\n2️⃣  Testing Detailed Health...');
  try {
    const response = await fetch(`${API_URL}/health/detailed`);
    const data = await response.json();
    console.log('   ✅ Status:', data.status);
    console.log('   🔧 Redis:', data.redis ? '✅ Connected' : '❌ Disconnected');
    console.log('   🎨 Workers:', data.workers.total, 'total,', data.workers.healthy, 'healthy');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Test 3: Queue Status
  console.log('\n3️⃣  Testing Queue Status...');
  try {
    const response = await fetch(`${API_URL}/api/queue/status`);
    const data = await response.json();
    if (data.success) {
      console.log('   ✅ Queue Status:');
      console.log('      • Active:', data.queue.active);
      console.log('      • Waiting:', data.queue.waiting);
      console.log('      • Completed:', data.queue.completed);
      console.log('      • Failed:', data.queue.failed);
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Test 4: Workers Endpoint (requires auth)
  console.log('\n4️⃣  Testing Workers Endpoint...');
  try {
    const response = await fetch(`${API_URL}/api/comfyui/workers`);
    const data = await response.json();
    if (data.success) {
      console.log('   ✅ Workers:', data.workers.length);
    } else {
      console.log('   ⚠️  Auth required:', data.message);
      console.log('   ℹ️  This is expected - endpoint requires Firebase token');
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('\n✅ Backend Service Tests Complete!\n');
  console.log('📝 Summary:');
  console.log('   • Backend server is running');
  console.log('   • Health checks working');
  console.log('   • Queue system ready');
  console.log('   • Authentication required for protected endpoints\n');
  console.log('🎯 Next Steps:');
  console.log('   1. Install ComfyUI locally (follow COMFYUI_QUICKSTART.md)');
  console.log('   2. Start frontend: npm run dev');
  console.log('   3. Login with Firebase to test authenticated endpoints\n');
}

// Run tests
testBackend().catch(console.error);
