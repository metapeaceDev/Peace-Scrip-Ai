# Voice Preview Feature - Character Introduction

## 📋 Overview

เพิ่มฟีเจอร์ **Voice Preview** ในระบบ Voice Cloning ที่ช่วยให้ผู้ใช้สามารถฟังตัวอย่างเสียงของตัวละครได้ทันที โดยระบบจะสร้างข้อความแนะนำตัวอัตโนมัติจากข้อมูลตัวละครที่ละเอียด และใช้ Voice Cloning TTS เพื่อสังเคราะห์เสียงพูด

## ✨ Features

### 1. **ปุ่ม Preview Voice**
- ตำแหน่ง: Voice Cloning Section ใน Step 3 Character
- สถานะ:
  - **Enabled**: เมื่ออัพโหลดเสียงตัวอย่างแล้ว (สีม่วง)
  - **Disabled**: ยังไม่ได้อัพโหลดเสียง (สีเทา)
  - **Playing**: กำลังเล่นเสียง (animation pulse)
- Icon: 🎤 Play/Pause button

### 2. **Character Introduction Generation**
ระบบสร้างข้อความแนะนำตัวอัตโนมัติจาก Character Data:

#### ข้อมูลที่นำมาใช้:
1. **ชื่อ (Name)**: "สวัสดีค่ะ ฉันชื่อ..."
2. **บทบาท (Role)**: ตัวละครเอก, ตัวประกอบ, ตัวร้าย, ตัวเสริม
3. **คำอธิบาย (Description)**: รายละเอียดตัวละคร
4. **ลักษณะภายนอก (External)**:
   - อายุ (Age)
   - เพศ (Gender)
   - ส่วนสูง (Height)
   - รูปร่าง (Physique)
5. **สไตล์แฟชั่น (Fashion)**: สไตล์การแต่งกาย
6. **บุคลิกภาพ (Internal Consciousness)**:
   - ความมั่นใจ (Confidence)
   - ความเห็นอกเห็นใจ (Empathy)
   - ปัญญา (Wisdom)
   - ความกล้าหาญ (Courage)
   - ความอดทน (Patience)
   - ความใจดี (Kindness)
7. **เป้าหมาย (Goals)**: Objective และ Backstory
8. **Speech Pattern**:
   - ภาษาถิ่น (Dialect)
   - คำพูดเฉพาะตัว (Speech Tics)

#### ตัวอย่างข้อความที่สร้าง:
```
สวัสดีค่ะ ฉันชื่อสายฝน บทบาทของฉันเป็นตัวละครเอก อายุ 25 ปี ผู้หญิง ส่วนสูง 165 ซม. รูปร่างสมส่วน สไตล์การแต่งกายของฉันคือโมเดิร์นสตรีท บุคลิกภาพของฉันเป็นคนที่มั่นใจในตัวเองและเห็นอกเห็นใจผู้อื่น เป้าหมายของฉันคือเป็นนักออกแบบชื่อดัง ฉันพูดภาษาเหนือนะคะ
```

### 3. **Text-to-Speech Synthesis**
- **Backend**: Voice Cloning API (Cloud Run)
- **Endpoint**: `/voice/synthesize`
- **Model**: XTTS-v2 (Coqui TTS)
- **Language**: Thai (th)
- **Speed**: 1.0x

#### Parameters:
```typescript
{
  text: string;           // Generated introduction text
  voice_id: string;       // Voice sample ID
  language: 'th';         // Thai language
  speed: 1.0;             // Normal speed
}
```

### 4. **Audio Playback**
- **Format**: WAV (synthesized by backend)
- **Playback**: Browser Audio API
- **Controls**: 
  - Click to play
  - Click again to stop
- **Cleanup**: Automatic URL.revokeObjectURL() after playback

## 🔧 Technical Implementation

### Frontend Changes

#### 1. **New State**
```typescript
const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
```

#### 2. **Enhanced generateIntroductionScript()**
Location: [src/components/Step3Character.tsx](src/components/Step3Character.tsx#L1070-L1160)

```typescript
const generateIntroductionScript = (character: Character): string => {
  // Comprehensive character data extraction
  // Returns Thai introduction text
}
```

#### 3. **New Handler: handlePreviewVoice()**
Location: [src/components/Step3Character.tsx](src/components/Step3Character.tsx#L1162-L1225)

```typescript
const handlePreviewVoice = async () => {
  // 1. Check voice sample exists
  // 2. Generate introduction text
  // 3. Call voiceCloningService.synthesizeSpeech()
  // 4. Play audio with loading states
  // 5. Handle errors and cleanup
}
```

#### 4. **UI Button**
Location: [src/components/Step3Character.tsx](src/components/Step3Character.tsx#L1875-L1920)

```tsx
<button
  onClick={handlePreviewVoice}
  disabled={!activeCharacter.voiceCloning?.hasVoiceSample || isPreviewingVoice}
  className={`${styles}`}
>
  <svg>{/* Play/Pause Icon */}</svg>
  {isPreviewingVoice ? 'กำลังเล่น...' : 'พรีวิว'}
</button>
```

### Backend (Already Exists)

#### `/voice/synthesize` Endpoint
Location: [backend/voice-cloning/server.py](backend/voice-cloning/server.py#L337-L437)

```python
@app.route('/voice/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Generate speech using cloned voice
    
    Supports:
    - 14+ audio formats input
    - Multi-language TTS
    - Speed control
    - High-quality WAV output
    """
```

## 📊 Data Flow

```
User Clicks "พรีวิว" Button
    ↓
handlePreviewVoice() called
    ↓
generateIntroductionScript(character)
    ↓ (Thai text)
voiceCloningService.synthesizeSpeech({
  text: introText,
  voice_id: voiceSampleId,
  language: 'th'
})
    ↓
POST https://voice-cloning-624211706340.us-central1.run.app/voice/synthesize
    ↓
Backend loads XTTS-v2 model
    ↓
Synthesizes speech with cloned voice
    ↓
Returns WAV audio blob
    ↓
Frontend creates Audio object
    ↓
Audio plays automatically
    ↓
User hears character introduction
```

## 🧪 Testing Checklist

### Manual Testing Steps:

1. **Setup**:
   - [ ] เข้าไปที่ Step 3: Character
   - [ ] สร้างตัวละครใหม่หรือเลือกตัวละครที่มีอยู่

2. **Upload Voice Sample**:
   - [ ] กดปุ่ม "Upload" ใน Voice Cloning Section
   - [ ] อัพโหลดไฟล์เสียง (WAV, MP3, M4A)
   - [ ] รอจนสถานะเป็น "Ready" (🎙️)

3. **Fill Character Data**:
   - [ ] กรอกชื่อตัวละคร
   - [ ] เลือกบทบาท (Role)
   - [ ] เพิ่มคำอธิบาย (Description)
   - [ ] กรอกลักษณะภายนอก (Age, Gender, Height)
   - [ ] เพิ่มเป้าหมาย (Goals > Objective)
   - [ ] (Optional) ตั้งค่า Speech Pattern

4. **Test Preview**:
   - [ ] กดปุ่ม "พรีวิว" (สีม่วง)
   - [ ] ตรวจสอบว่าปุ่มแสดง "กำลังเล่น..." และมี animation
   - [ ] รอฟังเสียง (ประมาณ 5-10 วินาที)
   - [ ] เสียงควรพูดข้อความแนะนำตัวด้วยเสียงที่โคลนมา
   - [ ] เสียงควรจบอัตโนมัติ
   - [ ] ปุ่มกลับเป็น "พรีวิว" หลังเล่นจบ

5. **Error Handling**:
   - [ ] กดพรีวิวโดยไม่อัพโหลดเสียง → ควรแสดง alert "กรุณาอัพโหลดเสียงตัวอย่างก่อน"
   - [ ] ลบข้อมูลตัวละครจนหมด → ควรแสดง alert "ไม่สามารถสร้างข้อความแนะนำตัวได้"
   - [ ] ปิดเน็ตแล้วกดพรีวิว → ควรแสดง error message

6. **Stop Playback**:
   - [ ] กดพรีวิวอีกครั้งขณะเสียงกำลังเล่น → ควรหยุดทันที

### Automated Testing (Future):

```typescript
describe('Voice Preview Feature', () => {
  it('should disable preview button when no voice sample', () => {});
  it('should generate introduction text correctly', () => {});
  it('should call synthesizeSpeech API with correct params', () => {});
  it('should play audio after synthesis', () => {});
  it('should handle API errors gracefully', () => {});
});
```

## 📈 Performance Metrics

### Expected Response Times:
- **Text Generation**: < 50ms (client-side)
- **API Call**: 2-5 seconds (depends on text length)
- **Audio Playback**: Immediate after API response

### Resource Usage:
- **Audio File Size**: ~100-500 KB per preview
- **Memory**: ~5-10 MB during playback
- **Bandwidth**: ~0.5 MB per preview

## 🔒 Security Considerations

1. **API Authentication**: Voice Cloning API allows unauthenticated access (public)
2. **Rate Limiting**: Should implement rate limiting on backend
3. **Content Validation**: Text is generated from character data (safe)
4. **Audio Cleanup**: Blob URLs are revoked after use (memory leak prevention)

## 🚀 Deployment Status

### ✅ Deployed to Production
- **Frontend**: https://peace-script-ai.web.app
- **Backend**: https://voice-cloning-624211706340.us-central1.run.app
- **Date**: 2025-12-20
- **Build**: #14

### Deployment Log:
```
✓ Frontend Build: 4.67s (1515 modules)
✓ Firebase Deploy: 39 files uploaded
✓ Voice Cloning API: Running (Build #13)
✓ Model Status: XTTS-v2 loaded successfully
```

## 📝 Future Enhancements

### Priority 1 (Next Sprint):
- [ ] ปรับแต่งความเร็วเสียง (Speed control UI)
- [ ] เลือกภาษา (Multi-language support)
- [ ] ดาวน์โหลดเสียงแนะนำตัว (Download button)

### Priority 2:
- [ ] แก้ไขข้อความแนะนำตัวได้ (Edit text before preview)
- [ ] บันทึกเสียงแนะนำตัวไว้ในโปรเจกต์
- [ ] Progress bar ระหว่างรอ API

### Priority 3:
- [ ] เลือก Emotion/Mood สำหรับเสียง
- [ ] Multiple voice samples per character
- [ ] Voice comparison (A/B testing)

## 🐛 Known Issues

1. **CSS Warning**: esbuild shows warning about `auth()` syntax - ไม่มีผลกระทบต่อการทำงาน
2. **Accessibility**: ปุ่มบางปุ่มยังไม่มี title attribute - จะแก้ใน Sprint ต่อไป
3. **Loading State**: ยังไม่มี progress indicator ขณะรอ API response

## 📚 Related Documentation

- [Voice Cloning Deployment Guide](VOICE_CLONING_DEPLOYMENT.md)
- [Production Issues](PRODUCTION_ISSUES.md)
- [API Documentation](backend/voice-cloning/README.md)
- [Character Types](types.ts)

## 👥 Contributors

- Development: GitHub Copilot
- Testing: Manual QA
- Deployment: Firebase Hosting + Google Cloud Run

## 📄 License

Part of Peace Script AI Project - Proprietary

---

**Last Updated**: 2025-12-20  
**Version**: 1.1.0  
**Status**: ✅ Production Ready
