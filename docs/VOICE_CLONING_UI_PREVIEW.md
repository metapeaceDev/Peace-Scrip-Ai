# 🎙️ Voice Cloning UI Preview

## Character Speech Pattern - Voice Cloning Section

### ✨ Visual Design

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🗣️ Speech Pattern & Dialect                            ┃
┃  Character Voice Customization                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                           ┃
┃  ┌─────────────────────┬─────────────────────┐           ┃
┃  │ ภาษาถิ่น (Dialect) │ สำเนียง (Accent)    │           ┃
┃  │ [ภาษากลาง ▼]       │ [ไม่มีสำเนียง ▼]    │           ┃
┃  └─────────────────────┴─────────────────────┘           ┃
┃                                                           ┃
┃  ┌─────────────────────┬─────────────────────┐           ┃
┃  │ ความเป็นทางการ      │ บุคลิกการพูด        │           ┃
┃  │ [ไม่เป็นทางการ ▼]  │ [สุภาพ ▼]           │           ┃
┃  └─────────────────────┴─────────────────────┘           ┃
┃                                                           ┃
┃  ┌─────────────────────────────────────────────┐         ┃
┃  │ คำพูดติดปาก / นิสัยการพูด                    │         ┃
┃  │ [เช่น "เหรอ", "นะจ๊ะ", "แหม"...]           │         ┃
┃  └─────────────────────────────────────────────┘         ┃
┃                                                           ┃
┃  ┌─────────────────────────────────────────────┐         ┃
┃  │ วลีพิเศษ (Custom Phrases)                   │         ┃
┃  │ [วลีพิเศษหรือประโยคที่ตัวละครใช้บ่อย...]    │         ┃
┃  │                                               │         ┃
┃  │                                               │         ┃
┃  └─────────────────────────────────────────────┘         ┃
┃                                                           ┃
┃  ╔═══════════════════════════════════════════════════╗   ┃
┃  ║  🎙️ Voice Cloning          [➕ อัพโหลดเสียง]    ║   ┃
┃  ║  โคลนเสียงของคุณเป็นเสียงตัวละคร                  ║   ┃
┃  ╟───────────────────────────────────────────────────╢   ┃
┃  ║                                                   ║   ┃
┃  ║  ┌──────────────────────────────────────────┐    ║   ┃
┃  ║  │  🎤  เสียงโคลนที่เลือก      [🗑️ ลบเสียง] │    ║   ┃
┃  ║  │      ID: voice_abc123def456...          │    ║   ┃
┃  ║  └──────────────────────────────────────────┘    ║   ┃
┃  ║                                                   ║   ┃
┃  ║  ╭─────────────────────────────────────────╮     ║   ┃
┃  ║  │ 💡 คำแนะนำ:                            │     ║   ┃
┃  ║  │ อัพโหลดไฟล์เสียงที่มีความยาว 15-20     │     ║   ┃
┃  ║  │ วินาที พูดภาษาไทยชัดเจน เพื่อผลลัพธ์    │     ║   ┃
┃  ║  │ ที่ดีที่สุด                             │     ║   ┃
┃  ║  ╰─────────────────────────────────────────╯     ║   ┃
┃  ╚═══════════════════════════════════════════════════╝   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 🎨 Color Scheme

```
Voice Cloning Section Colors:
├─ Background: Purple-Pink Gradient (from-purple-900/30 to-pink-900/20)
├─ Border: Purple (border-purple-500/30)
├─ Title: Purple-300 (#d8b4fe)
├─ Button: Purple-600 hover:Purple-700
├─ Help Section: Cyan-900/10 with Cyan-700/30 border
└─ Icons: 🎙️ (microphone), 💡 (light bulb), 🎤 (mic), ➕ (plus), 🗑️ (trash)
```

### 📱 Empty State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎙️ Voice Cloning   [➕ อัพโหลดเสียง] ┃
┃  โคลนเสียงของคุณเป็นเสียงตัวละคร       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                         ┃
┃              🎙️                        ┃
┃                                         ┃
┃         ยังไม่มีเสียงโคลน                ┃
┃  คลิก "อัพโหลดเสียง" เพื่อเริ่มต้น      ┃
┃                                         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💡 คำแนะนำ:                            ┃
┃ อัพโหลดไฟล์เสียง 15-20 วินาที...       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 🎯 With Selected Voice

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎙️ Voice Cloning   [➕ อัพโหลดเสียง] ┃
┃  โคลนเสียงของคุณเป็นเสียงตัวละคร       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ┌────────────────────────────────┐   ┃
┃  │ 🎤  เสียงโคลนที่เลือก           │   ┃
┃  │     ID: voice_abc123def456...  │   ┃
┃  │                   [🗑️ ลบเสียง]  │   ┃
┃  └────────────────────────────────┘   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💡 คำแนะนำ:                            ┃
┃ อัพโหลดไฟล์เสียง 15-20 วินาที...       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## 🔄 User Interactions

### 1. Upload Voice Flow

```
Step 1: Click "อัพโหลดเสียง" Button
   ↓
Step 2: VoiceUploadModal Opens
   ├─ Drag & Drop Zone
   ├─ File Browser
   └─ Voice Name Input
   ↓
Step 3: Select Audio File
   ├─ Validation (WAV/MP3/FLAC/OGG)
   ├─ Size Check (< 50MB)
   └─ Duration Check (6-30 seconds)
   ↓
Step 4: Upload Progress
   ├─ Progress Bar 0-100%
   ├─ Processing Status
   └─ Quality Analysis
   ↓
Step 5: Success!
   ├─ Voice ID Generated
   ├─ Saved to Character
   └─ Modal Closes
```

### 2. Remove Voice Flow

```
Current State: Voice Selected
   ↓
User Clicks: "ลบเสียง" Button
   ↓
Action: voiceCloneId = undefined
   ↓
Result: Empty State Displayed
```

### 3. Voice Upload Modal UI

```
╔═══════════════════════════════════════════╗
║  🎙️ Upload Voice Sample             [✕]  ║
╟───────────────────────────────────────────╢
║                                           ║
║  ┌─────────────────────────────────────┐ ║
║  │ Voice Name (Optional)               │ ║
║  │ [character_voice]                   │ ║
║  └─────────────────────────────────────┘ ║
║                                           ║
║  ╭───────────────────────────────────╮   ║
║  │                                   │   ║
║  │         🎤                        │   ║
║  │  Drag & Drop Audio File           │   ║
║  │  หรือคลิกเพื่อเลือกไฟล์            │   ║
║  │                                   │   ║
║  │  WAV, MP3, FLAC, OGG              │   ║
║  │  Max 50MB, 6-30 seconds           │   ║
║  │                                   │   ║
║  ╰───────────────────────────────────╯   ║
║                                           ║
║  📊 Quality Recommendations:              ║
║  ✅ 15-20 seconds optimal                 ║
║  ✅ Clear speech, no background noise     ║
║  ✅ Single speaker                        ║
║  ✅ Normal speaking pace                  ║
║                                           ║
║  [Cancel]              [Upload] ⬆️       ║
╚═══════════════════════════════════════════╝
```

## 📊 Responsive Design

### Desktop (> 768px)

```
┌─────────────────────────────────────────┐
│ Speech Pattern Settings                 │
│ ┌─────────┬─────────┐                  │
│ │ Dialect │ Accent  │  (2 columns)     │
│ └─────────┴─────────┘                  │
│                                         │
│ Voice Cloning (Full Width)              │
│ ┌─────────────────────────────────────┐ │
│ │ 🎙️ Voice Cloning  [Upload Button] │ │
│ │ ┌───────────────────────────────┐  │ │
│ │ │ Voice Status Card             │  │ │
│ │ └───────────────────────────────┘  │ │
│ │ Help Text                          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌─────────────────┐
│ Speech Pattern  │
│ ┌─────────────┐ │
│ │ Dialect     │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Accent      │ │
│ └─────────────┘ │
│                 │
│ Voice Cloning   │
│ ┌─────────────┐ │
│ │ 🎙️ Upload  │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Voice Card  │ │
│ └─────────────┘ │
│ Help Text       │
└─────────────────┘
```

## 🎭 Animation & Transitions

### Hover Effects:

```css
Button Hover:
  background: purple-600 → purple-700
  transform: scale(1.02)
  transition: 200ms

Voice Card Hover:
  border: purple-500/20 → purple-500/40
  shadow: sm → md
  transition: 300ms
```

### Loading States:

```
Upload in Progress:
  ┌────────────────────────────┐
  │ ⏳ Uploading...            │
  │ ████████░░░░░░░░  60%      │
  └────────────────────────────┘
```

## 🎯 User Journey

### First Time User:

1. Sees empty state with clear call-to-action
2. Reads help text for guidance
3. Clicks upload button
4. Follows upload workflow
5. Sees success state with voice ID

### Returning User:

1. Sees selected voice immediately
2. Can remove and upload new voice
3. Can proceed to other settings

## 📱 Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader friendly labels
- ✅ High contrast colors
- ✅ Clear visual hierarchy
- ✅ Descriptive error messages
- ✅ Icon + text labels

## 🎨 Visual Consistency

Matches existing design system:

- ✅ Purple/Pink gradient for voice features
- ✅ Cyan for informational elements
- ✅ Gray-800/900 for backgrounds
- ✅ White text on dark backgrounds
- ✅ Rounded corners (rounded-lg)
- ✅ Consistent spacing (p-4, p-6, gap-3)

---

**Created**: 17 ธันวาคม 2568  
**Purpose**: Visual reference for Voice Cloning UI integration  
**Status**: ✅ Complete
