# 💰 Peace Script AI - กลยุทธ์การกำหนดราคา (Pricing Strategy)

**วันที่วิเคราะห์:** 4 ธันวาคม 2568  
**สถานะ:** ✅ วิเคราะห์เสร็จสมบูรณ์

---

## 📊 สรุปผลการวิเคราะห์

### ต้นทุนการดำเนินงานปัจจุบัน

| บริการ | Plan | ต้นทุน/เดือน | สถานะ |
|---------|------|-------------|-------|
| **Gemini API** | Free Tier | ฿0 | ✅ 15 RPM quota |
| **HuggingFace** | Free + Token | ฿0 | ✅ 20x credits |
| **Firebase Hosting** | Blaze (Pay-as-go) | ฿0 | ✅ ภายใน Free tier |
| **Firebase Storage** | Blaze (Pay-as-go) | ฿0 | ✅ 34.86 MB used |
| **Firebase Firestore** | Blaze (Pay-as-go) | ฿0 | ✅ ภายใน Free tier |
| **ComfyUI (Optional)** | Self-hosted | ฿0 | ⚪ Disabled |
| **รวม** | - | **฿0/เดือน** | 🎉 |

---

## 💡 การใช้งาน Resources ต่อ User (ประมาณการ)

### สถานการณ์ทั่วไป (Typical User Journey)

**1 โปรเจกต์ภาพยนตร์เต็มรูปแบบ ประกอบด้วย:**

- **Text Generation (Gemini 2.5 Flash)**
  - Script Outline: ~2,000 tokens
  - Character Details (3 characters): ~1,500 tokens/char = 4,500 tokens
  - Scenes (9 plot points × 2 scenes): ~18,000 tokens
  - **รวม Text:** ~24,500 tokens ≈ **$0.00245** (Free tier: 15 RPM)

- **Image Generation**
  - Character Portraits (3): 3 images
  - Character Costumes (3): 3 images
  - Storyboard Images (18 scenes × 5 shots): 90 images
  - **รวม Images:** 96 images
  - **Tier 1 (Gemini Flash Image):** Free (10 RPM quota)
  - **Tier 2 (Gemini 2.0 Exp):** Free (better quota)
  - **Tier 3 (SD XL Pollinations):** Unlimited Free
  - **Tier 4 (ComfyUI FLUX):** Hardware cost (ถ้าใช้)

- **Video Generation**
  - Storyboard Videos (18 scenes × 2 shots): 36 videos @ 3-4 sec
  - **Tier 1 (Gemini Veo 3.1):** Free tier (limited quota)
  - **Tier 2 (ComfyUI SVD):** Hardware cost (ถ้าใช้)

- **Storage (Firebase)**
  - Images: 96 × 200KB = ~19 MB
  - Videos: 36 × 5MB = ~180 MB
  - JSON Data: ~2 MB
  - **รวม Storage:** ~201 MB

### ประมาณการต้นทุนจริง (ถ้าเกิน Free Tier)

| Resource | ต้นทุนต่อหน่วย | จำนวน/โปรเจกต์ | ต้นทุนรวม |
|----------|---------------|----------------|----------|
| Gemini Text | $0.10/1M tokens | 24,500 tokens | $0.00245 |
| Gemini Image | $0.04/image | 96 images | $3.84 |
| Gemini Video | $0.10/sec | 120 sec | $12.00 |
| Firebase Storage | $0.026/GB | 0.2 GB | $0.0052 |
| Firebase Bandwidth | $0.12/GB | 0.2 GB | $0.024 |
| **รวม** | - | - | **~$15.87/โปรเจกต์** |

**🎯 ต้นทุนจริง (ด้วย Free Tier + Fallback):** **≈ ฿0-50/โปรเจกต์**

---

## 🏆 คู่แข่งในตลาด (Competitor Analysis)

### เครื่องมือ AI Screenwriting ที่มีอยู่

| เครื่องมือ | ราคา/เดือน | Features | Target User |
|-----------|-----------|----------|-------------|
| **Final Draft** | $249 (1 ครั้ง) / $7.99/mo | Script editor, no AI | Professional writers |
| **Sudowrite** | $19-100/mo | AI story writing | Fiction writers |
| **Jasper** | $49-125/mo | AI content creation | Marketers |
| **ChatGPT Plus** | $20/mo | General AI (can write scripts) | General users |
| **Runway Gen-2** | $15-95/mo | AI video only | Video creators |
| **Midjourney** | $10-60/mo | AI image only | Visual artists |
| **WriteSonic** | $16-79/mo | AI writing (limited scripts) | Content creators |

### Peace Script AI - ตำแหน่งในตลาด

**Unique Value Proposition:**
- ✅ **All-in-One Solution:** Text + Images + Videos + Storyboards
- ✅ **Pre-Production Focus:** Character profiles, scene breakdowns, shot lists
- ✅ **Thai Language Support:** Native Thai screenplay writing
- ✅ **Multi-Tier Generation:** Intelligent fallback system
- ✅ **Film Industry Standards:** 9-point structure, professional formatting

**Target Market:**
- 🎬 นักเขียนบทภาพยนตร์ไทย
- 🎥 ผู้กำกับอิสระ / Indie filmmakers
- 🎓 นักศึกษาสาขาภาพยนตร์
- 🏢 บริษัทผลิตคอนเทนต์
- 📺 ผู้สร้าง YouTube / Content Creators

---

## 💰 โมเดลราคาที่แนะนำ (Recommended Pricing Tiers)

### 🆓 FREE Tier (Freemium)

**ราคา:** ฟรี  
**เป้าหมาย:** ดึงดูดผู้ใช้ใหม่, นักศึกษา, ผู้ทดลองใช้

**Features:**
- ✅ สร้างโปรเจกต์: **1 โปรเจกต์**
- ✅ ตัวละคร: **3 ตัวละคร/โปรเจกต์**
- ✅ ฉาก: **9 ฉาก** (1 ฉากต่อ plot point)
- ✅ รูปภาพ: **ความละเอียด 1024×1024**
  - Models: Pollinations, ComfyUI SDXL, Gemini Flash
- ✅ วิดีโอ: **3 วินาที/คลิป**
  - Models: ComfyUI SVD, Pollinations Video
- ✅ Storage: **500 MB**
- ✅ Export: PDF (Watermark)
- ❌ Advanced AI Models (FLUX, DALL-E, Veo, Runway)
- ❌ Priority Queue
- ❌ Commercial License

**ข้อจำกัด:**
- Gemini quota limits (15 RPM)
- Fallback เป็น Pollinations อัตโนมัติ
- ไม่สามารถใช้เชิงพาณิชย์

---

### ⭐ BASIC Tier (Entry Professional)

**ราคา:** **฿299/เดือน** (~$9 USD)  
**เป้าหมาย:** Indie filmmakers, นักเขียนบทมืออาชีพ

**Features:**
- ✅ สร้างโปรเจกต์: **5 โปรเจกต์**
- ✅ ตัวละคร: **10 ตัวละคร/โปรเจกต์**
- ✅ ฉาก: **Unlimited**
- ✅ รูปภาพ: **ความละเอียด 2048×2048**
  - Models: ทุก Free models + **Gemini Pro Image**
- ✅ วิดีโอ: **4 วินาที/คลิป**
  - Models: ทุก Free models
- ✅ Storage: **1 GB**
- ✅ Export: PDF, Final Draft (fdx), Fountain
- ✅ Priority Queue (Standard)
- ✅ Credits: **100 credits/เดือน**
  - Image: 5 credits/gen
  - Video: 10 credits/gen
- ❌ Premium Models (FLUX, DALL-E 3, Runway Gen-3)
- ⚠️ Personal Use License (ใช้ Commercial ต้องระบุ Credit)

**ต้นทุนต่อ User:** ~฿20-50/เดือน  
**Margin:** ~฿249/เดือน (**83% margin**)

---

### 🚀 PRO Tier (Professional Studio)

**ราคา:** **฿999/เดือน** (~$30 USD)  
**เป้าหมาย:** Production houses, สตูดิโอขนาดกลาง

**Features:**
- ✅ สร้างโปรเจกต์: **Unlimited**
- ✅ ตัวละคร: **Unlimited**
- ✅ ฉาก: **Unlimited**
- ✅ รูปภาพ: **ความละเอียด 4096×4096**
  - Models: ทุก models + **ComfyUI FLUX, OpenAI DALL-E 3**
- ✅ วิดีโอ: **10 วินาที/คลิป**
  - Models: ทุก models + **Gemini Veo, Luma Dream Machine, Runway Gen-3**
- ✅ Storage: **10 GB**
- ✅ Export: ทุกรูปแบบ + **Production Package**
- ✅ Priority Queue (High)
- ✅ Credits: **500 credits/เดือน**
  - Image: 5 credits/gen
  - Video: 15 credits/gen
- ✅ Commercial License (Full Rights)
- ✅ API Access (Beta)
- ✅ Collaboration Tools (Share projects)
- ✅ Version Control

**ต้นทุนต่อ User:** ~฿100-200/เดือน (ถ้าใช้ Premium APIs)  
**Margin:** ~฿799/เดือน (**80% margin**)

---

### 🏢 ENTERPRISE Tier (Custom)

**ราคา:** **ติดต่อเพื่อเสนอราคา** (เริ่มต้น ฿5,000+/เดือน)  
**เป้าหมาย:** บริษัทผลิตภาพยนตร์, สถาบันการศึกษา, องค์กร

**Features:**
- ✅ **ทุกอย่างใน PRO**
- ✅ Credits: **9,999 credits/เดือน** (หรือกำหนดเอง)
- ✅ วิดีโอ: **60 วินาที/คลิป**
- ✅ Storage: **100 GB+**
- ✅ On-Premise Deployment (Optional)
- ✅ Custom Workflows
- ✅ Dedicated Support
- ✅ Team Accounts (Unlimited users)
- ✅ SLA Guarantee (99.9% uptime)
- ✅ Training & Onboarding
- ✅ White Label Option
- ✅ Custom Integrations

**ต้นทุนต่อ Enterprise:** ~฿500-2,000/เดือน  
**Margin:** Negotiable (**60-80% margin**)

---

## 📈 Financial Model & Projections

### Scenario 1: Conservative (6 เดือนแรก)

| Tier | จำนวน Users | รายได้/เดือน | ต้นทุน/เดือน | กำไร/เดือน |
|------|------------|-------------|-------------|-----------|
| Free | 500 | ฿0 | ฿0 | ฿0 |
| Basic | 20 | ฿5,980 | ฿1,000 | ฿4,980 |
| Pro | 5 | ฿4,995 | ฿1,000 | ฿3,995 |
| Enterprise | 1 | ฿8,000 | ฿1,500 | ฿6,500 |
| **รวม** | **526** | **฿18,975** | **฿3,500** | **฿15,475** |

**Conversion Rate:** 5% (Free → Paid)

---

### Scenario 2: Growth (1 ปี)

| Tier | จำนวน Users | รายได้/เดือน | ต้นทุน/เดือน | กำไร/เดือน |
|------|------------|-------------|-------------|-----------|
| Free | 2,000 | ฿0 | ฿0 | ฿0 |
| Basic | 100 | ฿29,900 | ฿3,000 | ฿26,900 |
| Pro | 30 | ฿29,970 | ฿5,000 | ฿24,970 |
| Enterprise | 5 | ฿50,000 | ฿8,000 | ฿42,000 |
| **รวม** | **2,135** | **฿109,870** | **฿16,000** | **฿93,870** |

**Conversion Rate:** 6.3%  
**รายได้ต่อปี:** **฿1,318,440** (~$39,952 USD)

---

### Scenario 3: Scale (2-3 ปี)

| Tier | จำนวน Users | รายได้/เดือน | ต้นทุน/เดือน | กำไร/เดือน |
|------|------------|-------------|-------------|-----------|
| Free | 10,000 | ฿0 | ฿5,000 | -฿5,000 |
| Basic | 500 | ฿149,500 | ฿15,000 | ฿134,500 |
| Pro | 150 | ฿149,850 | ฿30,000 | ฿119,850 |
| Enterprise | 20 | ฿200,000 | ฿35,000 | ฿165,000 |
| **รวม** | **10,670** | **฿499,350** | **฿85,000** | **฿414,350** |

**Conversion Rate:** 6.7%  
**รายได้ต่อปี:** **฿5,992,200** (~$181,582 USD)  
**กำไรต่อปี:** **฿4,972,200** (~$150,673 USD)

---

## 🎯 Break-Even Analysis

### ต้นทุนคงที่ (Fixed Costs)

| รายการ | ต้นทุน/เดือน | หมายเหตุ |
|--------|-------------|----------|
| **Firebase Hosting** | ฿0-500 | ฟรีจนกว่า 10GB bandwidth |
| **Domain & SSL** | ฿100 | peace-script-ai.com |
| **Development** | ฿0 | Self-maintained (ถ้า hire: ฿30,000+) |
| **Marketing** | ฿2,000 | Google Ads, Social Media |
| **Support** | ฿0 | Self-service (ถ้า hire: ฿15,000+) |
| **รวม Fixed** | **฿2,100/เดือน** | Conservative estimate |

### Break-Even Point

**Break-Even Users:**
- Basic: 2,100 ÷ 249 = **9 users**
- Pro: 2,100 ÷ 799 = **3 users**
- Mix (5 Basic + 2 Pro): **7 total paid users**

**เวลาถึง Break-Even:** **1-3 เดือน** (ถ้า Conversion Rate ≥ 5%)

---

## 🚀 กลยุทธ์การเติบโต (Growth Strategy)

### Phase 1: Launch (เดือน 1-3)

**เป้าหมาย:** สร้าง User Base, รับ Feedback

**กลยุทธ์:**
- ✅ เปิดตัว **Free Tier** (ไม่จำกัดจำนวน users)
- ✅ ให้ Basic Tier ฟรี **14 วัน Trial**
- ✅ Content Marketing: YouTube tutorials (Thai)
- ✅ Partnership: นักเขียนบท, สถาบันสอนหนัง
- ✅ แจก **Early Bird Discount:** 50% off ปีแรก

**KPI:**
- 500 Free users
- 10 Paid users (Basic/Pro)
- Feedback score ≥ 4.5/5

---

### Phase 2: Grow (เดือน 4-12)

**เป้าหมาย:** เพิ่ม Conversion, สร้าง Brand Awareness

**กลยุทธ์:**
- ✅ เปิดตัว **Referral Program:** แนะนำเพื่อน +50 credits
- ✅ Success Stories: Case studies จาก paid users
- ✅ SEO Optimization: Blog posts เกี่ยวกับการเขียนบท
- ✅ Webinars: การใช้ AI เขียนบท (ฟรี)
- ✅ Affiliate Program: 20% commission

**KPI:**
- 2,000 Free users
- 100 Paid users
- MRR (Monthly Recurring Revenue) ≥ ฿50,000

---

### Phase 3: Scale (ปี 2-3)

**เป้าหมาย:** ขยายตลาดต่างประเทศ, เพิ่ม Features

**กลยุทธ์:**
- ✅ International Expansion: English version
- ✅ API Marketplace: ให้นักพัฒนาต่อยอด
- ✅ Enterprise Sales Team
- ✅ Cloud GPU Infrastructure (ลด dependency on free APIs)
- ✅ Mobile App (iOS/Android)

**KPI:**
- 10,000+ Free users
- 500+ Paid users
- MRR ≥ ฿400,000

---

## 💡 คำแนะนำเพิ่มเติม (Recommendations)

### 1. การกำหนดราคา (Pricing)

✅ **เริ่มต้นด้วย:**
- Free Tier: ใช้ดึงดูด users (ใช้ Free APIs เท่านั้น)
- Basic: **฿299/เดือน** (ราคาต่ำกว่าคู่แข่ง 40%)
- Pro: **฿999/เดือน** (ราคาเทียบเท่าหรือต่ำกว่า Jasper/Sudowrite)

✅ **Upsell Strategy:**
- Add-on: Extra credits (100 credits = ฿200)
- Add-on: Extra storage (5GB = ฿100/เดือน)
- Annual Plan: ลด 20% (10 เดือนได้ 12 เดือน)

---

### 2. การลดต้นทุน (Cost Optimization)

✅ **Short-term (0-6 เดือน):**
- ใช้ Free Tier APIs ให้ครบ quota
- Intelligent fallback system (ลด Premium API calls)
- Caching: ลดการ regenerate ซ้ำ
- Compression: ลดขนาด images/videos

✅ **Long-term (1-2 ปี):**
- Self-hosted ComfyUI: ประหยัดต้นทุน image/video generation
- Bulk API pricing: เจรจาส่วนลดกับ Gemini
- CDN: ใช้ Cloudflare (ฟรี) แทน Firebase bandwidth
- Optimize storage: Auto-delete old unused projects

---

### 3. การจัดการ Quota (Quota Management)

✅ **สำหรับ Free Users:**
- Rate Limiting: 10 requests/ชม.
- Queue System: รอ 30 วินาทีระหว่าง generation
- Watermark: ใส่ลายน้ำใน exports

✅ **สำหรับ Paid Users:**
- Priority Queue: ประมวลผลก่อน Free users
- Higher Rate Limits: 50-100 requests/ชม.
- No Watermark

---

### 4. Revenue Diversification

✅ **Additional Revenue Streams:**
- **Templates Marketplace:** ขายเทมเพลต script (฿99-299/template)
- **Training Courses:** คอร์สเรียนการเขียนบทด้วย AI (฿1,500-3,000)
- **Custom LoRA Models:** สร้าง custom LoRA สำหรับ studio (฿5,000-20,000)
- **Consulting Services:** ที่ปรึกษาการนำ AI เข้า workflow (฿10,000+/วัน)

---

## 📊 สรุปคำแนะนำ (Final Recommendations)

### ราคาที่แนะนำ (เริ่มต้น)

| Tier | ราคา | เป้าหมาย Users | Margin |
|------|------|---------------|--------|
| **Free** | ฿0 | 70% | -฿0 |
| **Basic** | **฿299/เดือน** | 20% | 83% |
| **Pro** | **฿999/เดือน** | 9% | 80% |
| **Enterprise** | **฿8,000+/เดือน** | 1% | 70% |

### Break-Even

- **Users ที่ต้องการ:** 7 paid users (mix)
- **เวลา:** 1-3 เดือน
- **MRR Target:** ฿3,000+

### ROI Projection (1 ปี)

- **รายได้:** ฿109,870/เดือน
- **ต้นทุน:** ฿16,000/เดือน
- **กำไร:** ฿93,870/เดือน
- **ROI:** **586% margin**

---

## ✅ Next Steps

1. ✅ **Implement Pricing Tiers** → Update `userStore.ts` credits & limits
2. ✅ **Create Stripe/Payment Integration** → รับชำระเงิน
3. ✅ **Launch Landing Page** → peace-script-ai.com
4. ✅ **Free Beta Testing** → รับ feedback จาก 50-100 users
5. ✅ **Public Launch** → เปิดตัวพร้อม Early Bird Promotion

---

**สรุป:** ราคา **฿299 (Basic)** และ **฿999 (Pro)** เป็นจุดที่สมดุลระหว่าง **คุ้มค่าสำหรับลูกค้า** และ **กำไรสูง** (80%+ margin) 🎯

**Margin สูง** = สามารถลงทุน Marketing และ R&D เพิ่มเติมได้ → เติบโตยั่งยืน 🚀
