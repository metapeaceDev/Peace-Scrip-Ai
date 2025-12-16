# 💰 Peace Script AI - Realistic Pricing Model (คำนึงถึงกำไร)

**Updated**: 10 ธันวาคม 2568  
**Philosophy**: "Sustainable Business with Profitable Margins"

---

## 📊 Cost Analysis (ต้นทุนจริง)

### Infrastructure Costs (รายเดือน)

| Item | Provider | Cost | Notes |
|------|----------|------|-------|
| **Firebase Hosting** | Google | ฿0-50 | Free tier covers ~10K users |
| **Firebase Firestore** | Google | ฿0-100 | ฿1.8/GB stored, ฿0.36/100K reads |
| **Firebase Storage** | Google | ฿0-200 | ฿0.90/GB stored, ฿0.45/GB download |
| **Cloud Functions** | Google | ฿0-300 | Free tier 2M invocations |
| **Domain & SSL** | - | ฿0 | Firebase includes free |
| **Monitoring** | Firebase | ฿0 | Free tier adequate |
| **Total Base** | - | **฿0-650/month** | Scales with usage |

### AI API Costs (ต่อ User ต่อเดือน)

#### Scenario: User สร้าง 1 โปรเจกต์/เดือน (ใช้งานปกติ)

**Text Generation** (3 passes):
- Genre + Boundary: ~5,000 tokens
- Characters: ~8,000 tokens (3 characters)
- Scenes: ~15,000 tokens (9 scenes)
- **Total**: ~28,000 tokens/เดือน

**Gemini 2.0 Flash** (Free Tier):
- Cost: ฿0 (ภายใน 15 RPM quota)
- ⚠️ ถ้าเกิน → ฿0.10 per 1M tokens = **~฿0.003**

**Ollama/Groq Alternative**:
- Cost: **฿0** (100% ฟรี)

---

**Image Generation** (12 images/โปรเจกต์):
- Character portraits: 3 images
- Storyboard scenes: 9 images

**Gemini Imagen 3**:
- Cost: ~$0.04/image = ฿1.40/รูป
- Total: 12 × ฿1.40 = **฿16.80/โปรเจกต์**

**ComfyUI FLUX (Local/Self-hosted)**:
- Cost: ฿0 (hardware cost only)
- GPU Server: RTX 4090 (~฿50,000 one-time)
- Electricity: ~฿500/เดือน (24/7 running)
- **Cost per user**: ฿0.50-2 (shared across 500 users)

**Pollinations.ai (Free)**:
- Cost: **฿0** (unlimited, but lower quality)

---

**Video Generation** (1 video/โปรเจกต์):

**Gemini Veo 3.1**:
- Cost: ~$0.10-0.50 per 5-10s video = **฿3.5-17.5/video**
- Quality: ⭐⭐⭐⭐⭐

**ComfyUI AnimateDiff (Local)**:
- Cost: ฿0 (hardware)
- **Cost per user**: ฿0.50-1 (shared GPU)

---

### Total Cost Per Active User

| Scenario | Text | Image | Video | **Total** | Margin Target |
|----------|------|-------|-------|-----------|--------------|
| **100% Free APIs** | ฿0 | ฿16.8 | ฿17.5 | **฿34.3** | Need ฿100+ revenue |
| **Hybrid (Free+Paid)** | ฿0 | ฿5 | ฿5 | **฿10** | Need ฿50+ revenue |
| **100% Open Source** | ฿0 | ฿2 | ฿1 | **฿3** | Need ฿20+ revenue |

**Infrastructure overhead**: ฿5-10 per user (Firebase, bandwidth, storage)

---

## 💎 Revised Pricing Tiers (มีกำไร)

### 🆓 FREE TRIAL (7 วัน)
**ราคา**: ฿0 (Trial period only)

**Limits**:
- ⏰ **7 วันทดลองใช้** (หมดเวลา → ต้อง upgrade)
- ✅ 1 โปรเจกต์
- ✅ 3 ตัวละคร
- ✅ 3 ฉาก (ทดสอบเท่านั้น)
- ✅ 100 MB Storage
- ✅ AI: Pollinations.ai + Groq (Free APIs เท่านั้น)

**ข้อจำกัด**:
- ⚠️ Watermark on exports
- ⚠️ Standard queue (อาจช้า)
- ⚠️ No commercial use
- ⚠️ After 7 days → Must upgrade or lose data

**Cost to provide**: ~฿3-5 (Open Source APIs)  
**Purpose**: User acquisition, conversion funnel

---

### 💫 HOBBY (สำหรับผู้เริ่มต้น)
**ราคา**: **฿199/เดือน** (~$6 USD)

**Features**:
- ✅ 3 โปรเจกต์/เดือน
- ✅ 5 ตัวละคร/โปรเจกต์
- ✅ 15 ฉาก/โปรเจกต์
- ✅ 1 GB Storage
- ✅ PDF Export (no watermark)

**AI Options**:
```
● Free Mode (Default - ฟรี)
  • Groq (text)
  • Pollinations.ai (image)
  • ComfyUI SVD (video - if available)
  
○ Hybrid Mode (+฿50/month)
  • Groq (text)
  • ComfyUI FLUX (image - better quality)
  • ComfyUI AnimateDiff (video)
  
○ Premium Mode (+฿150/month)
  • Gemini 2.0 (text)
  • Gemini Imagen 3 (image)
  • Limited Veo access (20 credits/month)
```

**Cost Analysis**:
- Base: ฿199/เดือน
- Cost to provide (Free Mode): ฿5-10
- Cost to provide (Hybrid): ฿15-25
- Cost to provide (Premium): ฿50-80

**Profit Margins**:
- Free Mode: ฿189 profit (**95% margin**) ✅
- Hybrid Mode: ฿174 profit (**70% margin**) ✅
- Premium Mode: ฿119 profit (**34% margin**) ⚠️

**Target Market**: Students, Hobbyists, Learning  
**Conversion from Trial**: 10-15%

---

### ⭐ CREATOR (แนะนำ)
**ราคา**: **฿499/เดือน** (~$15 USD)

**Features**:
- ✅ 10 โปรเจกต์/เดือน
- ✅ 10 ตัวละคร/โปรเจกต์
- ✅ Unlimited ฉาก
- ✅ 5 GB Storage
- ✅ Export: PDF, Final Draft, Fountain
- ✅ Remove watermark
- ✅ Personal commercial use ✅

**AI Options**:
```
○ Free Mode (ฟรี)
● Hybrid Mode (Default - Recommended)
  • Groq (text)
  • ComfyUI FLUX (image - ดีสุด)
  • ComfyUI AnimateDiff (video)
  • Cost: ฿0 extra
  
○ Premium Mode (+฿200/month)
  • Gemini 2.0 (text)
  • Gemini Imagen 3 (image)
  • Veo 3.1 (video)
  • 100 credits/month
```

**Cost Analysis**:
- Base: ฿499/เดือน
- Cost to provide (Hybrid - Default): ฿20-40
- Cost to provide (Premium add-on): ฿100-150

**Profit Margins**:
- Hybrid Mode: ฿459 profit (**92% margin**) ✅✅
- Premium Mode: ฿349 profit (**50% margin**) ✅

**Target Market**: Indie Filmmakers, Content Creators  
**Expected**: 60% of paid users choose this tier

---

### 🚀 PRO (สำหรับมืออาชีพ)
**ราคา**: **฿1,499/เดือน** (~$45 USD)

**Features**:
- ✅ Unlimited โปรเจกต์
- ✅ Unlimited ตัวละคร
- ✅ Unlimited ฉาก
- ✅ 20 GB Storage
- ✅ Export: All formats + Production Package
- ✅ Full commercial license ✅
- ✅ Collaboration (3 team members)
- ✅ Priority support (24h response)
- ✅ API Access (Beta)

**AI Included**:
```
● Premium Mode (Included)
  • Gemini 2.0 Flash Exp (text)
  • Gemini Imagen 3 (image - 4096×4096)
  • Veo 3.1 (video - 10 วินาที)
  • 500 credits/month
  • Priority Queue
  
Optional: Buy more credits
  • ฿99 per 100 credits
```

**Cost Analysis**:
- Base: ฿1,499/เดือน
- Cost to provide: ฿200-400 (heavy usage with Premium APIs)
- Extra credits: User pays ฿99, costs ฿40 (฿59 profit)

**Profit Margins**:
- Base: ฿1,099 profit (**73% margin**) ✅✅
- With extra credits: +฿59 per 100 credits

**Target Market**: Production Houses, Professional Studios  
**Expected**: 15% of paid users

---

### 🏢 STUDIO (Enterprise)
**ราคา**: **฿4,999/เดือน** (~$150 USD)

**Features**:
- ✅ Everything in PRO
- ✅ 10 team members
- ✅ 100 GB Storage
- ✅ 2,000 credits/month
- ✅ White label option
- ✅ Dedicated support
- ✅ SLA guarantee (99.9%)
- ✅ Custom integrations
- ✅ On-premise option (additional cost)

**Cost Analysis**:
- Base: ฿4,999/เดือน
- Cost to provide: ฿800-1,500
- Dedicated support: ฿500/month

**Profit Margins**:
- ฿2,999 profit (**60% margin**) ✅

**Target Market**: Film Studios, Agencies, Education  
**Expected**: 5% of paid users

---

## 💡 Strategic Pricing Decisions

### Why No Permanent Free Tier?

1. **Cost Control**:
   - Free users cost ฿5-10/month (infrastructure)
   - 1,000 free users = ฿5,000-10,000/month cost
   - Zero revenue = unsustainable

2. **7-Day Trial Instead**:
   - ✅ User gets to test everything
   - ✅ Limited exposure (only 7 days of cost)
   - ✅ Strong conversion incentive
   - ✅ Data cleanup after trial ends

3. **Conversion Funnel**:
   ```
   100 trial users → ฿500 cost
   ↓ (15% convert)
   15 HOBBY users → ฿2,985 revenue
   ↓
   Net: ฿2,485 profit (497% ROI)
   ```

### Why HOBBY Tier at ฿199?

1. **Psychology**: Under ฿200 = "affordable"
2. **Competition**: Adobe Creative Cloud ฿619/month (we're 3x cheaper)
3. **Value**: 3 complete projects/month = ฿66 per project
4. **Margin**: 95% profit on Free Mode users
5. **Upsell**: Easy to upgrade to ฿499 (2.5x value)

### Why CREATOR Tier at ฿499?

1. **Sweet Spot**: Not too cheap, not too expensive
2. **Target**: Indie filmmakers budget ฿500-1,000/month for tools
3. **Margin**: 92% profit with Hybrid Mode (best margin!)
4. **Value**: Unlimited scenes = huge value
5. **Default Mode**: Hybrid (free APIs) = low cost

### Why PRO Tier at ฿1,499?

1. **Professional Budget**: Studios budget ฿2,000-5,000/month
2. **Margin**: Still 73% profit even with Premium APIs
3. **Credits**: 500 credits = ~30-40 high-quality generations
4. **Upsell**: If need more → buy credits at good margin
5. **Perception**: Premium price = premium service

---

## 📈 Revenue Projections (Realistic)

### Month 1-3 (Launch)
```
Trial Users:     500 (฿2,500 cost, 0 revenue)
↓ Convert 12%
HOBBY:           40 × ฿199 = ฿7,960
CREATOR:         15 × ฿499 = ฿7,485
PRO:              5 × ฿1,499 = ฿7,495
STUDIO:           0

Revenue:  ฿22,940
Costs:    ฿5,500 (infrastructure + support)
Profit:   ฿17,440/month (~76% margin)
```

### Month 6-12 (Growth)
```
Trial Users:     2,000 (฿10,000 cost, 0 revenue)
↓ Convert 15%
HOBBY:          150 × ฿199 = ฿29,850
CREATOR:         100 × ฿499 = ฿49,900
PRO:             40 × ฿1,499 = ฿59,960
STUDIO:           3 × ฿4,999 = ฿14,997

Revenue:  ฿154,707
Costs:    ฿35,000 (infrastructure + support team)
Profit:   ฿119,707/month (~77% margin)

Annual:   ฿1,436,484 profit (~฿1.4M)
```

### Year 2 (Scale)
```
Trial Users:     10,000 (฿50,000 cost)
↓ Convert 18%
HOBBY:          800 × ฿199 = ฿159,200
CREATOR:        600 × ฿499 = ฿299,400
PRO:            300 × ฿1,499 = ฿449,700
STUDIO:          100 × ฿4,999 = ฿499,900

Revenue:  ฿1,408,200/month
Costs:    ฿350,000 (infrastructure + team of 5)
Profit:   ฿1,058,200/month (~75% margin)

Annual:   ฿12,698,400 profit (~฿12.7M)
```

---

## 🎯 Cost Optimization Strategies

### 1. Shared GPU Infrastructure
```
RTX 4090 Server: ฿50,000 (one-time)
Electricity: ฿500/month
Serves: 500 concurrent users

Cost per user: ฿1-2/month
Savings vs Gemini: ฿15-30/user/month
ROI: 2-3 months
```

### 2. Smart API Routing
```typescript
// Default to free/cheap, upgrade on demand
if (user.tier === 'HOBBY' && user.aiMode === 'free') {
  providers = ['groq', 'pollinations', 'comfyui-sdxl'];
  estimatedCost = ฿0;
}
else if (user.tier === 'CREATOR' && user.aiMode === 'hybrid') {
  providers = ['groq', 'comfyui-flux', 'animatediff'];
  estimatedCost = ฿2-5;
}
else if (user.tier === 'PRO') {
  providers = ['gemini', 'imagen', 'veo'];
  estimatedCost = ฿50-100;
  deductCredits(estimatedCost / 10); // 10 credits = ฿1
}
```

### 3. Credits Economy
```
PRO user pays ฿1,499:
- Includes 500 credits (฿500 value)
- Actual cost: ฿200-400 (API usage)
- Profit: ฿1,099

If user needs more:
- Buy 100 credits for ฿99
- Costs us ฿40 (API calls)
- Profit: ฿59 per purchase

Heavy user buys 500 credits extra:
- Pays ฿495
- Costs us ฿200
- Profit: ฿295 additional
```

### 4. Freemium Funnel Optimization
```
100 trial signups
↓
Cost: ฿500 (7 days × 100 users)

Convert 15 users to HOBBY (Free Mode):
Revenue: 15 × ฿199 = ฿2,985
Cost: 15 × ฿10 = ฿150
Profit: ฿2,835

ROI: 567%
Customer Acquisition Cost: ฿33
Lifetime Value (12 months): ฿2,388
LTV/CAC Ratio: 72x
```

---

## 🚨 Risk Mitigation

### Risk 1: Too Many Trial Users (Cost Spike)
**Solution**:
- Limit trials: 100/day max
- Require valid email + phone verification
- Auto-delete trial data after 14 days
- Show upgrade prompt at day 5

### Risk 2: Users Abuse Free Mode
**Solution**:
- Rate limiting: 10 generations/day on HOBBY tier
- Queue system: Free mode goes to standard queue (slower)
- Premium mode gets priority queue

### Risk 3: API Cost Spikes
**Solution**:
- Daily spending cap per tier
- Auto-switch to ComfyUI if quota exceeded
- Alert system for unusual usage patterns
- Budget alerts for users

---

## ✅ Implementation Plan

### Phase 1: Soft Launch (Week 1-2)
- [ ] Enable 7-day trial only
- [ ] Collect 100 trial users
- [ ] Monitor costs closely
- [ ] A/B test pricing (฿199 vs ฿249 for HOBBY)

### Phase 2: Paid Tiers (Week 3-4)
- [ ] Launch HOBBY + CREATOR tiers
- [ ] Integrate Stripe/Omise
- [ ] Set up credit system
- [ ] Monitor conversion rate (target 12%+)

### Phase 3: PRO Tier (Month 2)
- [ ] Launch PRO tier
- [ ] Add collaboration features
- [ ] Priority queue implementation
- [ ] Target 5-10 PRO users

### Phase 4: Scale (Month 3+)
- [ ] Deploy shared GPU infrastructure
- [ ] Launch STUDIO tier
- [ ] Enterprise sales team
- [ ] Target ฿100K+ MRR

---

## 💰 Final Pricing Summary

| Tier | Price | Target Users | Est. Margin | Monthly Goal |
|------|-------|--------------|-------------|--------------|
| **Trial** | ฿0 (7 days) | 1,000-2,000 | -฿5,000 | Acquisition |
| **HOBBY** | ฿199 | 200-400 | 95% | ฿40-80K |
| **CREATOR** | ฿499 | 150-300 | 92% | ฿75-150K |
| **PRO** | ฿1,499 | 50-100 | 73% | ฿75-150K |
| **STUDIO** | ฿4,999 | 10-20 | 60% | ฿50-100K |

**Target Monthly Revenue**: ฿240-480K  
**Target Monthly Costs**: ฿50-100K  
**Target Profit Margin**: 75-80%  
**Break-even Point**: 60 paid users (~Month 2)

---

**Status**: Ready for implementation  
**Risk Level**: Low (high margins, scalable)  
**Recommendation**: Start with Trial → HOBBY → CREATOR funnel

🎬 **Let's build a profitable, sustainable AI filmmaking platform!**
