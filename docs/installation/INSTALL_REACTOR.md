# ReActor FaceSwap Installation Guide

## ❌ Current Error

```
Cannot execute because node ReActorFaceSwap does not exist
```

## ✅ Solution: Install ReActor Extension

### Step 1: Install ReActor

```bash
cd C:\ComfyUI\custom_nodes
git clone https://github.com/Gourieff/comfyui-reactor-node
cd comfyui-reactor-node
pip install -r requirements.txt
```

### Step 2: Download Models

ReActor จะดาวน์โหลด models อัตโนมัติเมื่อใช้งานครั้งแร้ก:

- `inswapper_128.onnx` (Face swap model)
- Face detection models

### Step 3: Restart ComfyUI

```bash
# ปิด ComfyUI แล้ว restart
python main.py --listen 0.0.0.0 --port 8188
```

### Step 4: Verify Installation

เปิด ComfyUI UI: http://localhost:8188

- กด "Add Node" → ค้นหา "ReActorFaceSwap"
- ถ้าเจอแสดงว่าติดตั้งสำเร็จ

## 📦 Alternative: Use InstantID (Already Installed)

หากไม่ต้องการติดตั้ง ReActor สามารถใช้ InstantID ได้เลย:

- ระบบจะ fallback ไป InstantID อัตโนมัติ
- InstantID ก็ให้ผลลัพธ์ดี (90-95% face similarity)

## 🔗 Links

- ReActor GitHub: https://github.com/Gourieff/comfyui-reactor-node
- Documentation: https://github.com/Gourieff/comfyui-reactor-node/blob/main/README.md
