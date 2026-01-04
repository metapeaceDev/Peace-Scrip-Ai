How to use:

1) One-shot snapshot (who is using VRAM):
   tools\gpu\gpu-snapshot.cmd

2) Live watch while generating (see if GPU is actually computing):
   tools\gpu\gpu-watch.cmd

Interpretation notes:
- Task Manager GPU% can under-report ML workloads.
- If VRAM ~100% but GPU util stays low AND pstate is high (P0/P2): likely memory-bound or waiting.
- If VRAM ~100% but pstate is low (P8/P12): likely not actively computing.
- If other processes hold VRAM (browser, other python.exe), close them and retry.
