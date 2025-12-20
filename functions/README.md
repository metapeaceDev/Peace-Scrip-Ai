# Firebase Cloud Functions - Replicate Proxy

## ปัญหาที่แก้ไข

- **CORS Error**: Browser ไม่สามารถเรียก Replicate API โดยตรงได้
- **API Key Security**: ซ่อน API key ไม่ให้โผล่ใน client-side code

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
cd functions
npm install
```

### 2. ตั้งค่า Replicate API Token

```bash
firebase functions:config:set replicate.api_token="YOUR_REPLICATE_API_TOKEN"
```

### 3. Build Functions

```bash
npm run build
```

### 4. Deploy

```bash
npm run deploy
# หรือ
firebase deploy --only functions
```

## การใช้งานใน Client

### ก่อนหน้า (เรียก API โดยตรง - มี CORS error)

```typescript
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... })
});
```

### หลังแก้ไข (เรียกผ่าน Cloud Function)

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const replicateProxy = httpsCallable(functions, 'replicateProxy');

const result = await replicateProxy({
  endpoint: '/v1/predictions',
  method: 'POST',
  body: {
    version: 'model-version-id',
    input: { ... }
  }
});

if (result.data.success) {
  const prediction = result.data.data;
  console.log('Prediction ID:', prediction.id);
}
```

## Functions ที่มี

### 1. `replicateProxy`

เป็น proxy สำหรับเรียก Replicate API ผ่าน Cloud Function

**Parameters:**

- `endpoint`: Replicate API endpoint (เช่น `/v1/predictions`)
- `method`: HTTP method (default: 'POST')
- `body`: Request body object

**Returns:**

```typescript
{
  success: boolean,
  data: any // Replicate API response
}
```

### 2. `checkReplicateStatus`

ตรวจสอบสถานะการสร้างวิดีโอ

**Parameters:**

- `predictionId`: ID ของ prediction ที่ต้องการตรวจสอบ

**Returns:**

```typescript
{
  success: boolean,
  data: {
    status: 'starting' | 'processing' | 'succeeded' | 'failed',
    output: string | null,
    error: string | null
  }
}
```

## ตัวอย่างการใช้งาน

### สร้างวิดีโอด้วย AnimateDiff

```typescript
const createVideo = async (prompt: string, imageUrl: string) => {
  const functions = getFunctions();
  const replicateProxy = httpsCallable(functions, 'replicateProxy');

  const result = await replicateProxy({
    endpoint: '/v1/predictions',
    method: 'POST',
    body: {
      version: 'animatediff-version-id',
      input: {
        prompt,
        image: imageUrl,
        num_frames: 16,
        fps: 8,
      },
    },
  });

  return result.data.data.id; // prediction ID
};
```

### ตรวจสอบสถานะ

```typescript
const checkStatus = async (predictionId: string) => {
  const functions = getFunctions();
  const checkReplicateStatus = httpsCallable(functions, 'checkReplicateStatus');

  const result = await checkReplicateStatus({ predictionId });

  if (result.data.success) {
    const { status, output } = result.data.data;

    if (status === 'succeeded') {
      console.log('Video URL:', output);
      return output;
    } else if (status === 'failed') {
      throw new Error('Video generation failed');
    } else {
      console.log('Status:', status);
      // ยังไม่เสร็จ, รอแล้วลองใหม่
      return null;
    }
  }
};
```

## Local Development

### ทดสอบ Functions ในเครื่อง

```bash
cd functions
npm run serve
```

### ดู Logs

```bash
npm run logs
```

## Security

- ✅ ต้อง Authentication ก่อนเรียก Function
- ✅ API Token ถูกซ่อนใน Firebase Config
- ✅ ไม่โผล่ใน client-side code
- ✅ มี error handling ครบถ้วน
