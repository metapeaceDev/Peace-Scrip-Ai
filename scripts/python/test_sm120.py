import torch
import sys

if not torch.cuda.is_available():
    print('NO_CUDA')
    sys.exit(0)

cap = torch.cuda.get_device_capability(0)
gpu_name = torch.cuda.get_device_name(0)

# Check if RTX 5090 (sm_120)
if cap[0] == 12 and cap[1] == 0:
    # Try actual CUDA operation
    try:
        x = torch.randn(10, 10, device='cuda')
        y = torch.matmul(x, x)
        # Force synchronization to catch kernel errors
        torch.cuda.synchronize()
        print('SUPPORTED')
    except RuntimeError as e:
        if 'no kernel image is available' in str(e):
            print('NOT_SUPPORTED')
        else:
            print(f'ERROR: {e}')
else:
    print(f'NO_RTX5090 (detected: sm_{cap[0]}{cap[1]} - {gpu_name})')
