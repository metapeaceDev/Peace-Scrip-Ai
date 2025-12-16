# 🔍 แผนการเพิ่มฟีเจอร์ที่หายไป

## 📋 ฟีเจอร์ที่ต้องเพิ่ม

### **1. Step 3: Character - Generate All Characters**
- ปุ่ม "Generate All Characters" ที่สร้างตัวละครทุกตัวพร้อมกัน
- ใช้ข้อมูลจาก Step 1-2 ในการสร้าง
- รองรับหลายตัวละครพร้อมกัน

### **2. Step 4: Structure - Generate Structure**  
- ปุ่ม "Generate Structure" ที่สร้างโครงสร้างจาก Step 1-3
- สร้าง Plot Points ทั้งหมดอัตโนมัติ
- ใช้ AI วิเคราะห์จาก genre, characters

### **3. Step 5: Output - TTS Integration**
- ปุ่ม "Generate Voice" สำหรับแต่ละฉาก
- ใช้ Psychology TTS Service (6 carita types)
- Hybrid system (Psychology TTS + Azure fallback)

### **4. General - TTS System**
- psychologyTTSService.ts (ย้ายเข้า src/services/ แล้ว)
- hybridTTSService.ts (ย้ายเข้า src/services/ แล้ว)
- เพิ่ม UI controls ใน components

---

## ✅ ขั้นตอนการดำเนินการ

1. เพิ่มปุ่ม "Generate All Characters" ใน Step3
2. เพิ่มปุ่ม "Auto-Generate Structure" ใน Step4  
3. เพิ่ม TTS controls ใน Step5
4. เพิ่ม TTS button ในหน้า Character details
5. Build และ Deploy

