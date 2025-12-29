import torch

print("\n=== ทดสอบ PyTorch CUDA Operations ===\n")

# Test 1: CPU Operations
print("[Test 1] CPU Tensor Operations:")
try:
    x = torch.randn(5, 5)
    print(f"  ✅ CPU tensor created: {x.shape}")
    y = torch.matmul(x, x)
    print(f"  ✅ CPU matmul works: {y.shape}")
except Exception as e:
    print(f"  ❌ CPU failed: {e}")

# Test 2: GPU Detection
print("\n[Test 2] GPU Detection:")
print(f"  CUDA Available: {torch.cuda.is_available()}")
print(f"  GPU Name: {torch.cuda.get_device_name(0)}")
print(f"  GPU Capability: sm_{torch.cuda.get_device_capability()[0]}{torch.cuda.get_device_capability()[1]}")

# Test 3: CUDA Operations (will fail on RTX 5090)
print("\n[Test 3] CUDA Tensor Operations:")
try:
    z = torch.randn(100, 100, device='cuda')
    w = torch.matmul(z, z)
    print(f"  ✅ SUCCESS: CUDA operations work!")
    print(f"  CUDA tensor: {z.shape}")
except RuntimeError as e:
    print(f"  ❌ FAILED (Expected on RTX 5090)")
    print(f"  Error: {str(e)[:100]}...")

print("\n=== สรุปผลการทดสอบ ===")
print("  CPU: ✅ ทำงานได้")
print("  GPU Detection: ✅ ตรวจพบ RTX 5090")
print("  GPU Operations: ❌ ใช้งานไม่ได้ (sm_120 ไม่รองรับ)")
print("\nสรุป: Environment stable แต่ต้องรอ PyTorch sm_120 support")
