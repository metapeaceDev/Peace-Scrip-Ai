# ✅ วิธีดาวน์โหลด InstantID ControlNet ที่ถูกต้อง

## ⚠️ ปัญหา

PowerShell ดาวน์โหลดไฟล์ผิดซ้ำๆ:

- ครั้งที่ 1: 495 MB (เสียหาย)
- ครั้งที่ 2: 1778 MB (ผิดไฟล์)
- ครั้งที่ 3: 705 MB (ขนาดผิด)
- ครั้งที่ 4: 992 MB (ขนาดผิดอีก)

**คาดหวัง:** 491.26 MB (515,143,658 bytes)

---

## 🌐 วิธีที่ 1: ดาวน์โหลดผ่านเบราว์เซอร์ (แนะนำที่สุด!)

### ขั้นตอน:

**1. เปิดลิงก์นี้ในเบราว์เซอร์:**

```
https://huggingface.co/InstantX/InstantID/blob/main/ControlNetModel/diffusion_pytorch_model.safetensors
```

**2. คลิกปุ่ม "↓ download" ด้านขวาบน**

**3. รอให้ดาวน์โหลดเสร็จ (~492 MB)**

- ควรใช้เวลาประมาณ 5-10 นาที
- ไฟล์จะถูกดาวน์โหลดไปที่โฟลเดอร์ Downloads ของคุณ

**4. ย้ายไฟล์และเปลี่ยนชื่อ:**

เปิด PowerShell และรันคำสั่ง:

```powershell
# หาไฟล์ที่ดาวน์โหลดมา
$downloadedFile = Get-ChildItem "$env:USERPROFILE\Downloads\diffusion_pytorch_model.safetensors" -ErrorAction SilentlyContinue

if ($downloadedFile) {
    Write-Host "✅ พบไฟล์ที่ดาวน์โหลด: $([math]::Round($downloadedFile.Length / 1MB, 2)) MB" -ForegroundColor Green

    # ตรวจสอบขนาดไฟล์
    if ($downloadedFile.Length -gt 490MB -and $downloadedFile.Length -lt 520MB) {
        Write-Host "✅ ขนาดไฟล์ถูกต้อง!" -ForegroundColor Green

        # สร้างโฟลเดอร์ถ้ายังไม่มี
        $targetDir = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet"
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

        # คัดลอกและเปลี่ยนชื่อ
        $targetPath = "$targetDir\instantid_controlnet.safetensors"
        Copy-Item $downloadedFile.FullName -Destination $targetPath -Force

        Write-Host ""
        Write-Host "🎉 สำเร็จ! ไฟล์ถูกคัดลอกไปยัง:" -ForegroundColor Green
        Write-Host "   $targetPath" -ForegroundColor Cyan
        Write-Host ""

        # ตรวจสอบไฟล์ที่คัดลอก
        $copiedFile = Get-Item $targetPath
        Write-Host "ขนาดไฟล์สุดท้าย: $([math]::Round($copiedFile.Length / 1MB, 2)) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ พร้อมใช้งาน! ขั้นตอนถัดไป:" -ForegroundColor Yellow
        Write-Host "1. Restart backend service" -ForegroundColor White
        Write-Host "2. ทดสอบการสร้าง Face ID" -ForegroundColor White
    } else {
        Write-Host "❌ ขนาดไฟล์ไม่ถูกต้อง: $([math]::Round($downloadedFile.Length / 1MB, 2)) MB" -ForegroundColor Red
        Write-Host "   คาดหวัง: 490-520 MB" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ ไม่พบไฟล์ในโฟลเดอร์ Downloads" -ForegroundColor Red
    Write-Host "   โปรดตรวจสอบว่าดาวน์โหลดเสร็จแล้ว" -ForegroundColor Yellow
}
```

---

## 💻 วิธีที่ 2: ใช้ curl (Built-in Windows)

```powershell
# Download with curl
curl -L `
  -o "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet\instantid_controlnet.safetensors" `
  "https://huggingface.co/InstantX/InstantID/resolve/main/ControlNetModel/diffusion_pytorch_model.safetensors"

# ตรวจสอบขนาดไฟล์
$file = Get-Item "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet\instantid_controlnet.safetensors"
Write-Host "ดาวน์โหลดเสร็จ: $([math]::Round($file.Length / 1MB, 2)) MB"

if ($file.Length -gt 490MB -and $file.Length -lt 520MB) {
    Write-Host "✅ ขนาดไฟล์ถูกต้อง!" -ForegroundColor Green
} else {
    Write-Host "❌ ขนาดไฟล์ไม่ถูกต้อง (คาดหวัง ~492 MB)" -ForegroundColor Red
}
```

---

## 🐙 วิธีที่ 3: Git LFS

```powershell
# 1. Install Git LFS (ถ้ายังไม่มี)
# Download from: https://git-lfs.com/

# 2. Clone repository
cd C:\temp
git lfs install
git clone https://huggingface.co/InstantX/InstantID

# 3. Copy file
Copy-Item `
  "C:\temp\InstantID\ControlNetModel\diffusion_pytorch_model.safetensors" `
  "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet\instantid_controlnet.safetensors"

# 4. Verify
$file = Get-Item "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet\instantid_controlnet.safetensors"
Write-Host "ขนาดไฟล์: $([math]::Round($file.Length / 1MB, 2)) MB"
```

---

## ✅ ตรวจสอบความถูกต้องหลังดาวน์โหลด

```powershell
$file = Get-Item "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\controlnet\instantid_controlnet.safetensors"
$mb = [math]::Round($file.Length / 1MB, 2)
$bytes = $file.Length

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FILE VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "File: instantid_controlnet.safetensors" -ForegroundColor Yellow
Write-Host "Size: $mb MB" -ForegroundColor Cyan
Write-Host "Bytes: $bytes" -ForegroundColor Gray
Write-Host "Modified: $($file.LastWriteTime)" -ForegroundColor Gray
Write-Host ""

# Check exact size
if ($bytes -eq 515143658) {
    Write-Host "✅ PERFECT MATCH!" -ForegroundColor Green
    Write-Host "   File size exactly matches expected: 515,143,658 bytes" -ForegroundColor Green
} elseif ($mb -gt 490 -and $mb -lt 520) {
    Write-Host "✅ SIZE ACCEPTABLE" -ForegroundColor Green
    Write-Host "   File size is within acceptable range (490-520 MB)" -ForegroundColor Green
} else {
    Write-Host "❌ SIZE VALIDATION FAILED" -ForegroundColor Red
    Write-Host "   Expected: ~491.26 MB (515,143,658 bytes)" -ForegroundColor Yellow
    Write-Host "   Got: $mb MB ($bytes bytes)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ⚠️ This file may not work correctly!" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
```

---

## 🔄 หลังจากดาวน์โหลดเสร็จ

### 1. Restart Backend Service

```powershell
# Stop backend
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 2

# Start backend
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service
npm run dev
```

### 2. ทดสอบระบบ

```powershell
# ตรวจสอบ backend health
Invoke-RestMethod -Uri "http://localhost:8000/health"

# ตรวจสอบ ComfyUI
Invoke-RestMethod -Uri "http://localhost:8188/"
```

### 3. ทดสอบ Face ID Generation

1. เปิดแอปพลิเคชันในเบราว์เซอร์
2. อัพโหลดรูปภาพใบหน้าอ้างอิง
3. เลือกโหมด "Face ID"
4. คลิก "Generate Costume"
5. ติดตามความคืบหน้า (ควรเกิน 22.6% และสร้างเสร็จ)

---

## 📊 สถานะโมเดลปัจจุบัน

```
✅ SDXL Checkpoint:      6,616.67 MB (6.46 GB)
✅ InsightFace Models:     407.74 MB (5 files)
✅ IP-Adapter:           1,612.79 MB (1.6 GB)
❌ ControlNet:             MISSING (need to download)
---------------------------------------------------
Total when complete:     ~9,129 MB (~9 GB)
```

---

## 📝 หมายเหตุสำคัญ

**ทำไม PowerShell ล้มเหลว:**

- HuggingFace ใช้ Git LFS สำหรับไฟล์ขนาดใหญ่
- `Invoke-WebRequest` อาจไม่จัดการ LFS redirects ได้ถูกต้อง
- Browser download เป็นวิธีที่เชื่อถือได้ที่สุด

**คำแนะนำ:**
✅ ใช้วิธีที่ 1 (Browser download) - ง่ายและเชื่อถือได้  
✅ ตรวจสอบขนาดไฟล์ทุกครั้งหลังดาวน์โหลด  
✅ ถ้ายังล้มเหลว ลอง Git LFS (วิธีที่ 3)

---

**สร้างเมื่อ:** 3 มกราคม 2026 09:35 น.  
**สถานะ:** รอการดาวน์โหลดด้วยตนเอง  
**วิธีแนะนำ:** Browser Download (วิธีที่ 1)
