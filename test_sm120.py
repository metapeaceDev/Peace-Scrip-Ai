import sys


def main() -> int:
    try:
        import torch
    except Exception as e:
        print(f"IMPORT_ERROR: {e}")
        return 1

    if not torch.cuda.is_available():
        print("CUDA_NOT_AVAILABLE")
        return 2

    name = torch.cuda.get_device_name(0)
    cap = torch.cuda.get_device_capability(0)
    torch_ver = getattr(torch, "__version__", "unknown")
    cuda_ver = getattr(torch.version, "cuda", "unknown")

    print(f"PyTorch: {torch_ver}")
    print(f"CUDA: {cuda_ver}")
    print(f"GPU: {name}")
    print(f"Compute Capability: {cap}")

    # RTX 5090 / Blackwell is expected to be sm_120 (12.0)
    if cap != (12, 0):
        print("NOT_SUPPORTED")
        return 3

    try:
        x = torch.randn(1024, 1024, device="cuda")
        y = torch.randn(1024, 1024, device="cuda")
        z = x @ y
        torch.cuda.synchronize()
        print(f"CUDA_OP_OK: {tuple(z.shape)}")
    except Exception as e:
        print(f"CUDA_OP_FAILED: {e}")
        return 4

    print("SUPPORTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
