# 🏗️ Storage Architecture - Image Management

## 📊 ปัญหาและแนวทางแก้ไข

### ❌ ปัญหาเดิม: Base64 ใน Firestore

```
┌─────────────────────────────────────┐
│ Firestore Document                  │
│ ┌─────────────────────────────────┐ │
│ │ posterImage: "data:image/png;   │ │
│ │   base64,iVBORw0KGgoAAAANSUhE... │ │
│ │   ... (1.33 MB)                 │ │ ❌ เกิน 1MB limit!
│ └─────────────────────────────────┘ │
│ title: "My Movie"                   │
│ genre: "Action"                     │
└─────────────────────────────────────┘
```

**ปัญหา:**

- ❌ Base64 = 1.33 MB (เกิน Firestore 1MB limit)
- ❌ ไม่มี caching
- ❌ โหลดช้า (ต้องดึงทุกครั้ง)
- ❌ เปลือง bandwidth

---

### ✅ แนวทางแก้ไข: 3-Tier Storage

```
┌────────────────────────────────────────────────────────┐
│ Tier 1: Firestore Metadata (เล็ก, เร็ว)               │
│ ┌────────────────────────────────────────────────────┐ │
│ │ posterUrl: "https://storage.googleapis.com/..."   │ │ ✅ ~100 bytes
│ │ posterThumbnail: "data:image/jpeg;base64,/9j/..." │ │ ✅ ~35 KB
│ │ title: "My Movie"                                  │ │
│ │ genre: "Action"                                    │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
         ↓ อ้างอิง                          ↓ ใช้ทันที
┌──────────────────────┐          ┌──────────────────────┐
│ Tier 2: Thumbnail    │          │ Tier 3: Full Image   │
│ (Project Card)       │          │ (Detail View)        │
│                      │          │                      │
│ • JPEG 70% quality  │          │ • PNG/JPEG original │
│ • 300x400 px        │          │ • ~1 MB             │
│ • ~35 KB            │          │ • Browser cached    │
│ • แสดงทันที         │          │ • โหลดเมื่อต้องการ │
└──────────────────────┘          └──────────────────────┘
```

---

## 🔢 การคำนวณขนาดไฟล์

### Base64 Encoding Overhead

**สูตร:**

```
Base64 Size = Original Size × 4/3
            = Original Size × 1.333...
            = Original Size + 33.33% overhead
```

**ตัวอย่าง:**

| Original (Binary) | Base64 Encoded | Overhead               |
| ----------------- | -------------- | ---------------------- |
| 100 KB            | 133 KB         | +33%                   |
| 500 KB            | 667 KB         | +33%                   |
| 1,000 KB (1 MB)   | 1,333 KB       | +33% ❌ เกิน Firestore |
| 750 KB            | 1,000 KB       | +33% ⚠️ ใกล้ limit     |

**เหตุผลทางเทคนิค:**

```python
# Binary to Base64 conversion
Binary: 3 bytes = 24 bits
       ┌────────┬────────┬────────┐
       │ 8 bits │ 8 bits │ 8 bits │ = 24 bits total
       └────────┴────────┴────────┘

Base64: 4 characters = 24 bits (6 bits each)
       ┌──────┬──────┬──────┬──────┐
       │6 bits│6 bits│6 bits│6 bits│ = 24 bits total
       └──────┴──────┴──────┴──────┘

Efficiency = 3 bytes → 4 characters = 75% efficient
Overhead   = (4-3)/3 = 33.33%
```

---

## 🚫 Firestore Limits (ไม่สามารถปรับได้)

### Official Limits

| Resource          | Limit          | Can Change? |
| ----------------- | -------------- | ----------- |
| **Document size** | **1 MB**       | ❌ **NO**   |
| **Field value**   | **1 MB**       | ❌ **NO**   |
| Collection ID     | 1,500 bytes    | ❌ NO       |
| Document ID       | 1,500 bytes    | ❌ NO       |
| Nested depth      | 20 levels      | ❌ NO       |
| Write batch       | 500 operations | ❌ NO       |
| Transaction       | 500 operations | ❌ NO       |

**Source:** [Firebase Documentation](https://firebase.google.com/docs/firestore/quotas)

### ทำไมไม่สามารถปรับได้?

1. **Architecture Design:**
   - Firestore ออกแบบสำหรับ structured data (metadata)
   - ไม่ใช่ file storage system
   - Optimized สำหรับ fast queries, indexing

2. **Performance:**
   - Document ใหญ่ = slow query
   - RAM overhead เยอะ
   - Network latency สูง

3. **Google's Infrastructure:**
   - Hardcoded limit ใน backend
   - ป้องกัน abuse
   - รักษา performance ของระบบ

---

## ✅ วิธีแก้ที่ถูกต้อง: Firebase Storage + Thumbnail

### 1. Firebase Storage (Full Image)

**ข้อดี:**

- ✅ ไม่จำกัดขนาด (up to 5 TB)
- ✅ CDN auto-enabled (เร็ว)
- ✅ Browser caching
- ✅ Progressive loading
- ✅ Resumable upload

**ขนาดไฟล์:**

```
Original PNG:     1,000 KB
Storage URL:          100 bytes (just a link)
```

**Example:**

```typescript
const url = await imageStorageService.uploadPosterImage(
  base64Image, // 1 MB
  projectId,
  userId
);
// url = "https://firebasestorage.googleapis.com/v0/b/..."
// ✅ เก็บแค่ URL ใน Firestore (~100 bytes)
```

---

### 2. Thumbnail (Project Cards)

**ข้อดี:**

- ✅ ขนาดเล็ก (~35 KB)
- ✅ เก็บใน Firestore ได้
- ✅ โหลดเร็ว
- ✅ ประหยัด bandwidth

**Optimization:**

```typescript
// Original: 1000 KB, 2000x3000px
const thumbnail = await imageStorageService.createThumbnail(
  originalBase64,
  300, // maxWidth
  400 // maxHeight
);
// Result: 35 KB, 300x400px, JPEG 70% quality
```

**การบีบอัด:**

```
Original:   2000x3000 px × 24-bit color = 18 MB raw
PNG:        Lossless compression        = 1,000 KB
Thumbnail:  300x400 px × JPEG 70%       = 35 KB

Compression ratio: 35 KB / 1,000 KB = 3.5%
```

---

### 3. Hybrid Approach (Best Practice)

```typescript
interface ProjectData {
  // ✅ Firestore (Metadata)
  id: string;
  title: string;

  // ✅ Thumbnail (~35 KB) - แสดงทันทีในรายการ
  posterThumbnail: string; // base64 JPEG

  // ✅ Storage URL (~100 bytes) - โหลดเมื่อต้องการ
  posterUrl: string; // "https://..."
}
```

**การทำงาน:**

1. **Generate Image:**

   ```typescript
   const result = await generateAndUploadMoviePoster(scriptData, userId);
   // Returns:
   // {
   //   base64: "data:image/png;base64,...",  // 1 MB
   //   url: "https://storage...",            // Storage URL
   //   thumbnailBase64: "data:image/jpeg..." // 35 KB
   // }
   ```

2. **Save to Firestore:**

   ```typescript
   await firestoreService.createProject(userId, {
     title: 'My Movie',
     posterUrl: result.url, // ✅ 100 bytes
     posterThumbnail: result.thumbnailBase64, // ✅ 35 KB
     // ❌ ไม่เก็บ base64 ต้นฉบับ (1.33 MB)
   });
   ```

3. **Display:**

   ```tsx
   // Project Card - แสดง thumbnail
   <img src={project.posterThumbnail} /> {/* Fast! */}

   // Detail View - โหลดรูปเต็ม
   <img src={project.posterUrl} /> {/* Cached by browser */}
   ```

---

## 📊 Performance Comparison

### Scenario: 100 Projects

#### ❌ Old Way (Base64 in Firestore)

```
Load Projects:
- Firestore reads: 100 documents × 1.33 MB = 133 MB
- Time: ~15 seconds
- Cost: ~$0.50 per 100K reads
- Browser Memory: 133 MB
```

#### ✅ New Way (Storage URL + Thumbnail)

```
Load Projects:
- Firestore reads: 100 documents × 35 KB = 3.5 MB
- Time: ~0.5 seconds
- Cost: ~$0.50 per 100K reads
- Browser Memory: 3.5 MB

Load Full Images (on-demand):
- Storage reads: 1 image × 1 MB = 1 MB (only when clicked)
- Cached by browser: subsequent loads = 0 bytes
```

**Improvement:**

- 📈 Load time: 30× faster (15s → 0.5s)
- 📉 Memory: 38× less (133 MB → 3.5 MB)
- 💰 Bandwidth: 97% savings

---

## 🎯 Migration Strategy

### For Existing Projects with Base64

```typescript
async function migrateOldProjects() {
  const projects = await firestoreService.getUserProjects(userId);

  for (const project of projects) {
    if (project.posterImage && !project.posterUrl) {
      console.log(`Migrating project: ${project.id}`);

      // 1. Upload to Storage
      const url = await imageStorageService.uploadPosterImage(
        project.posterImage, // Old base64
        project.id,
        userId
      );

      // 2. Create thumbnail
      const thumbnail = await imageStorageService.createThumbnail(project.posterImage, 300, 400);

      // 3. Update Firestore
      await firestoreService.updateProject(project.id, {
        posterUrl: url, // New: Storage URL
        posterThumbnail: thumbnail, // New: Thumbnail
        posterImage: null, // Remove old base64
      });

      console.log(`✅ Migrated: ${project.id}`);
    }
  }
}
```

---

## 🔒 Security Rules

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Posters
    match /posters/{userId}/{projectId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }

    // Characters
    match /characters/{userId}/{projectId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 3 * 1024 * 1024; // 3MB limit
    }

    // Storyboards
    match /storyboards/{userId}/{projectId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
  }
}
```

---

## 💰 Cost Analysis

### Firebase Storage Pricing (US)

| Operation          | Cost            |
| ------------------ | --------------- |
| Storage            | $0.026/GB/month |
| Download (Class A) | $0.12/GB        |
| Download (Class B) | $0.01/GB        |

### Firestore Pricing

| Operation        | Cost           |
| ---------------- | -------------- |
| Document reads   | $0.06 per 100K |
| Document writes  | $0.18 per 100K |
| Document deletes | $0.02 per 100K |
| Storage          | $0.18/GB/month |

### Comparison (1000 projects, 1 year)

#### Old Way (Base64 in Firestore):

```
Storage: 1000 × 1.33 MB = 1.33 GB
Cost: 1.33 GB × $0.18/month × 12 = $2.88/year

Reads: 1000 projects × 365 days = 365K reads
Cost: 365K × $0.06/100K = $0.22/year

Total: $3.10/year
```

#### New Way (Storage + Thumbnail):

```
Firestore:
Storage: 1000 × 35 KB = 35 MB
Cost: 0.035 GB × $0.18/month × 12 = $0.08/year
Reads: 365K × $0.06/100K = $0.22/year

Firebase Storage:
Storage: 1000 × 1 MB = 1 GB
Cost: 1 GB × $0.026/month × 12 = $0.31/year
Downloads: 1000 × 1 MB (cached) = 1 GB/year
Cost: 1 GB × $0.01 = $0.01/year

Total: $0.62/year
```

**Savings: 80% ($3.10 → $0.62)**

---

## 📝 Best Practices

### 1. Always Create Thumbnails

```typescript
// ✅ Good
const { url, thumbnailBase64 } = await generateAndUploadMoviePoster(...);

// ❌ Bad
const base64 = await generateMoviePoster(...); // No thumbnail!
```

### 2. Use Appropriate Image Formats

```typescript
// Thumbnail: JPEG (smaller)
canvas.toDataURL('image/jpeg', 0.7);

// Full image: PNG (quality)
canvas.toDataURL('image/png');
```

### 3. Implement Progressive Loading

```tsx
<img
  src={thumbnail} // Show immediately
  onLoad={() => {
    // Then load full image
    img.src = fullUrl;
  }}
/>
```

### 4. Clean Up Old Images

```typescript
// When deleting project
await imageStorageService.deleteImage(project.posterUrl);
```

---

## 🎓 Summary

### Key Takeaways:

1. **Base64 ใหญ่กว่าต้นฉบับ 33%** เสมอ (4/3 ratio)
2. **Firestore limit 1MB ปรับไม่ได้** (hardcoded by Google)
3. **ใช้ Firebase Storage สำหรับไฟล์ใหญ่** (ไม่จำกัด)
4. **ใช้ Thumbnail ใน Firestore** (~35 KB, fast load)
5. **เก็บ URL แทน base64** (100 bytes vs 1.33 MB)

### Architecture Decision:

```
Firestore (Metadata) + Firebase Storage (Files) + Thumbnail (Fast Preview)
= Best Performance + Lowest Cost + Better UX
```

---

**Last Updated:** 4 ธันวาคม 2568  
**Status:** ✅ Implemented and Deployed
