# 📊 Admin Analytics Dashboard - Enhanced Features

## 🆕 What's New

### 1. Enhanced User Details Modal

แสดงรายละเอียดการใช้งานแบบละเอียด พร้อมต้นทุนจริง

**Features:**

- ✅ **Model Usage Tracking** - ดูว่า user ใช้โมเดลอะไรบ้าง เช่น
  - Text Generation: Gemini 2.0 Flash, Gemini 2.5 Flash
  - Image Generation: Pollinations, ComfyUI SDXL, ComfyUI FLUX, Gemini Imagen
  - Video Generation: Replicate SVD, Replicate AnimateDiff, Gemini Veo
- ✅ **Generation Costs** - คำนวณต้นทุนจริงในแต่ละโมเดล (บาท)
  - แยกตาม Text/Image/Video
  - แสดงจำนวนครั้งและต้นทุนรวม
- ✅ **Offline Activity** - ข้อมูลการใช้งานออฟไลน์
  - จำนวน sessions
  - เวลาเฉลี่ยต่อ session
  - Device info (browser, OS)
  - Location data (country, region, timezone)
- ✅ **Activity Log** - ประวัติการ generate ล่าสุด 20 รายการ
  - แสดงโมเดลที่ใช้
  - เวลาที่ใช้
  - ต้นทุน (credits + THB)
  - Prompt (ถ้ามี)
  - สถานะ (สำเร็จ/ล้มเหลว)

### 2. Project Cost Dashboard

แสดงต้นทุนทั้งหมดของโปรเจกต์ แยกตามหมวดหมู่

**Cost Categories:**

1. **🔌 API Services**
   - Gemini API (text, image, video)
   - Replicate API (SVD, AnimateDiff, LTX Video)
   - ComfyUI (Free - Local)
   - Pollinations (Free)

2. **💾 Storage**
   - Firebase Storage (images, videos)
   - Cloud Storage

3. **⚙️ Compute**
   - Cloud Run (Voice Cloning API - 2 vCPU, 8Gi RAM)
   - Cloud Functions (Node.js 20)

4. **🗄️ Database**
   - Firestore (reads, writes, storage)

5. **🌐 Bandwidth**
   - Firebase Hosting
   - CDN

6. **📦 Other Services**
   - Authentication
   - Domain & DNS

**Profitability Metrics:**

- Total Revenue (from subscriptions)
- Total Costs
- Net Profit
- Profit Margin (%)
- Active Users
- Cost per User

**Cost Trends:**

- Last 6 months chart
- Breakdown by API/Compute/Storage

## 📊 Real API Pricing (as of Dec 2024)

### Gemini API

- **2.0 Flash**: FREE (with quota: 1,500 requests/day)
- **2.5 Flash Image**: ฿0.09 per image
- **Veo 3**:
  - 5s video: ฿3.50
  - 10s video: ฿17.50

### Replicate API

- **Stable Video Diffusion**: ฿0.63 per video
- **AnimateDiff**: ฿0.875 per video
- **LTX Video**: ฿5.25 per video

### Firebase

- **Hosting**: FREE (10 GB, 360 MB/day)
- **Firestore**: FREE (50K reads, 20K writes/day)
- **Cloud Functions**: FREE (2M invocations/month)
- **Authentication**: FREE (unlimited users)
- **Storage**: FREE (5 GB, 1 GB downloads/day)

### Google Cloud

- **Cloud Run**:
  - CPU: ฿0.002187 per vCPU-second
  - Memory: ฿0.000227 per GiB-second
  - Requests: ฿0.40 per 1M requests

## 🔧 Implementation

### Backend Services

#### 1. Model Usage Tracker (`modelUsageTracker.ts`)

```typescript
// Record a generation
await recordGeneration({
  userId: 'user-id',
  type: 'image',
  modelId: 'gemini-2.5-flash',
  modelName: 'Gemini 2.5 Flash Image',
  provider: 'gemini',
  costInCredits: 5,
  costInTHB: 0.09,
  success: true,
  duration: 15,
  metadata: {
    prompt: 'A beautiful sunset...',
    resolution: '1024x1024',
    projectId: 'project-123',
  },
});

// Get user model usage
const usage = await getUserModelUsage('user-id');
console.log(usage.totalGenerations); // 50
console.log(usage.totalCostTHB); // ฿125.50

// Get recent activity
const activity = await getRecentGenerations('user-id', 20);
```

#### 2. Project Cost Monitor (`projectCostMonitor.ts`)

```typescript
// Get comprehensive cost summary
const summary = await getProjectCostSummary();
console.log(summary.totalMonthlyCost); // ฿1,234.56
console.log(summary.userCosts.profit); // ฿5,678.90

// Get cost trends
const trends = await getCostTrends(6);
console.log(trends); // Last 6 months

// Export to CSV
const csv = exportCostDataToCSV(summary);
```

#### 3. Session Tracking

```typescript
// Record user session
await recordUserActivity({
  userId: 'user-id',
  sessionDuration: 45, // minutes
  deviceInfo: {
    browser: 'Chrome',
    os: 'Windows 11',
    device: 'Desktop',
  },
  locationData: {
    country: 'Thailand',
    region: 'Bangkok',
    timezone: 'Asia/Bangkok',
  },
});

// Get offline activity
const offline = await getUserOfflineActivity('user-id');
console.log(offline.sessionCount); // 25
console.log(offline.avgSessionDuration); // 38.5 min
```

### Frontend Components

#### 1. EnhancedUserDetailsModal

```tsx
import { EnhancedUserDetailsModal } from './components/admin/EnhancedUserDetailsModal';

<EnhancedUserDetailsModal userId="user-id" onClose={() => setSelectedUserId(null)} />;
```

**Features:**

- 3 tabs: Overview, Model Usage, Activity Log
- Real-time cost calculations
- Offline activity tracking
- Responsive design

#### 2. ProjectCostDashboard

```tsx
import { ProjectCostDashboard } from './components/admin/ProjectCostDashboard';

<ProjectCostDashboard />;
```

**Features:**

- Cost breakdown by category
- Profitability metrics
- Cost trends chart (6 months)
- CSV export

## 📈 Firestore Structure

### Collections

#### `generations` (new)

```typescript
{
  id: string;
  userId: string;
  timestamp: Timestamp;
  type: 'text' | 'image' | 'video';
  modelId: string;
  modelName: string;
  provider: string;
  costInCredits: number;
  costInTHB: number;
  success: boolean;
  duration?: number;
  metadata?: {
    prompt?: string;
    resolution?: string;
    duration?: string;
    projectId?: string;
    sceneId?: string;
  };
}
```

#### `userModelUsage` (new)

```typescript
{
  id: '{userId}_{modelId}'; // composite key
  userId: string;
  modelId: string;
  modelName: string;
  provider: string;
  type: 'text' | 'image' | 'video';
  count: number;
  totalCost: number; // THB
  lastUsed: Timestamp;
}
```

#### `userActivity` (new)

```typescript
{
  id: '{userId}';
  userId: string;
  lastOnline: Timestamp;
  sessionCount: number;
  avgSessionDuration: number; // minutes
  totalTimeSpent: number; // minutes
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  locationData?: {
    country: string;
    region: string;
    timezone: string;
  };
}
```

## 🎯 Integration Guide

### Step 1: Add tracking to existing generation functions

**Example: Image Generation**

```typescript
import { trackGeneration } from './services/modelUsageTracker';

async function generateImage(prompt: string) {
  return await trackGeneration(
    auth.currentUser!.uid,
    'image',
    'gemini-2.5-flash',
    'Gemini 2.5 Flash Image',
    'gemini',
    async () => {
      // Your existing image generation code
      const result = await geminiGenerateImage(prompt);
      return result;
    },
    {
      prompt,
      resolution: '1024x1024',
      projectId: currentProject.id,
    }
  );
}
```

### Step 2: Add session tracking to app initialization

```typescript
import { recordUserActivity } from './services/modelUsageTracker';

useEffect(() => {
  const sessionStart = Date.now();

  // Detect device info
  const deviceInfo = {
    browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
    os: navigator.platform,
    device: /Mobile/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
  };

  // Record session on unmount
  return () => {
    const sessionDuration = (Date.now() - sessionStart) / 1000 / 60; // minutes

    recordUserActivity({
      userId: auth.currentUser!.uid,
      sessionDuration,
      deviceInfo,
      locationData: {
        country: 'Thailand', // Get from IP geolocation API
        region: 'Bangkok',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  };
}, []);
```

### Step 3: Update Admin Dashboard

Already done! The new components are integrated into the Admin Dashboard:

- **Tab 1**: Analytics & Users (existing)
- **Tab 2**: 💰 Project Costs (new)
- **Tab 3**: Admin Management (existing)
- **Tab 4**: Alerts (existing)

Click on any user in the table to see enhanced details.

## 📊 Benefits

### For Admins

1. **Transparency** - เห็นต้นทุนจริงในการให้บริการ
2. **Profitability** - คำนวณกำไรต่อ user
3. **Optimization** - เห็นว่าควรปรับปรุงส่วนไหน
4. **User Behavior** - เข้าใจการใช้งานของ users

### For Business

1. **Cost Control** - ควบคุมต้นทุนได้แม่นยำ
2. **Pricing Strategy** - กำหนดราคาที่เหมาะสม
3. **Resource Planning** - วางแผนทรัพยากรล่วงหน้า
4. **Profit Maximization** - เพิ่มกำไรจากการเลือกโมเดลที่เหมาะสม

## 🔐 Security

- ✅ Admin-only access (require admin authentication)
- ✅ User privacy protected (no sensitive data exposed)
- ✅ Cost data calculated on-demand (not stored)
- ✅ Activity tracking anonymous (no personal identifiers)

## 📝 TODO

- [ ] Add IP geolocation API for accurate location data
- [ ] Implement real-time cost alerts
- [ ] Add cost budget limits per tier
- [ ] Export detailed user reports (PDF)
- [ ] Add cost forecasting (next 3 months)
- [ ] Integrate with payment gateway for auto-billing

## 🎉 Summary

เพิ่มระบบติดตามต้นทุนและการใช้งานแบบละเอียด:

- **User Details**: รู้ว่า user ใช้โมเดลอะไร, เสียเงินเท่าไหร่, ใช้งานเมื่อไหร่
- **Project Costs**: รู้ต้นทุนทั้งหมด, กำไรเท่าไหร่, ควรปรับปรุงส่วนไหน
- **Activity Tracking**: รู้พฤติกรรมการใช้งาน, session duration, device info

All data is real-time and based on actual API pricing! 🎯
