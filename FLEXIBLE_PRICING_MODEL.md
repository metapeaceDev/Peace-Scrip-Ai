# 💎 Flexible Pricing Model - Peace Script AI

**วันที่**: 10 ธันวาคม 2568  
**Concept**: ให้ User เลือกได้ว่าจะใช้แบบฟรี หรือแบบเสียเงิน

---

## 🎯 Philosophy: "Your Choice, Your Budget"

```
┌─────────────────────────────────────────────────────────────┐
│  Free Tier          Hybrid              Premium             │
│  (Open Source)      (Best Value)        (Fastest)           │
├─────────────────────────────────────────────────────────────┤
│  • ฟรี 100%         • ฟรี + Paid        • เสียเงิน         │
│  • ช้ากว่า          • สมดุล             • เร็วสุด          │
│  • คุณภาพดี         • คุณภาพดีมาก        • คุณภาพสูงสุด     │
│  • ไม่จำกัด quota   • Mix & Match        • Priority         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Pricing Tiers Comparison

| Feature | 🆓 FREE | 💎 HYBRID | 🚀 PREMIUM |
|---------|---------|-----------|------------|
| **Monthly Cost** | **฿0** | **฿100-300** | **฿500-1,000** |
| **Text Generation** | Ollama (Local) | Groq/Together (Free Cloud) | Gemini 2.0 Flash Exp |
| **Image Generation** | ComfyUI + SDXL | ComfyUI + FLUX | Gemini 2.5 Flash |
| **Video Generation** | AnimateDiff | AnimateDiff + SVD | Veo 3.1 |
| **Generation Speed** | ⚡⚡ 30-60s | ⚡⚡⚡ 10-30s | ⚡⚡⚡⚡ 3-10s |
| **Quality** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Best |
| **Quota Limit** | ♾️ Unlimited | 100-500/day | 1,000+/day |
| **Priority Queue** | Standard | Medium | High |
| **Support** | Community | Email (48h) | Priority (24h) |
| **Hardware Required** | GPU (8GB+) or Cloud | Optional | None |
| **Best For** | Learning, Testing | Regular Use | Professional |

---

## 🎨 Implementation Strategy

### 1. User Preference System

```typescript
// src/types/pricing.ts
export enum PricingTier {
  FREE = 'free',
  HYBRID = 'hybrid',
  PREMIUM = 'premium',
}

export interface UserPreference {
  tier: PricingTier;
  
  // Per-feature preferences (for Hybrid users)
  textProvider: 'ollama' | 'groq' | 'together' | 'gemini';
  imageProvider: 'comfyui-sdxl' | 'comfyui-flux' | 'gemini';
  videoProvider: 'animatediff' | 'svd' | 'veo';
  
  // Fallback settings
  autoFallback: boolean; // If free provider fails, use paid?
  maxCostPerGeneration: number; // Baht limit
  
  // Quality preferences
  preferSpeed: boolean; // Speed over quality?
  preferQuality: boolean; // Quality over cost?
}

export const DEFAULT_PREFERENCES: Record<PricingTier, UserPreference> = {
  [PricingTier.FREE]: {
    tier: PricingTier.FREE,
    textProvider: 'ollama',
    imageProvider: 'comfyui-sdxl',
    videoProvider: 'animatediff',
    autoFallback: false,
    maxCostPerGeneration: 0,
    preferSpeed: false,
    preferQuality: false,
  },
  
  [PricingTier.HYBRID]: {
    tier: PricingTier.HYBRID,
    textProvider: 'groq', // Free cloud (faster than local)
    imageProvider: 'comfyui-flux', // Best free quality
    videoProvider: 'animatediff',
    autoFallback: true, // Use paid if free fails
    maxCostPerGeneration: 5, // Max 5 baht per generation
    preferSpeed: true,
    preferQuality: true,
  },
  
  [PricingTier.PREMIUM]: {
    tier: PricingTier.PREMIUM,
    textProvider: 'gemini',
    imageProvider: 'gemini',
    videoProvider: 'veo',
    autoFallback: true,
    maxCostPerGeneration: 50, // Max 50 baht
    preferSpeed: true,
    preferQuality: true,
  },
};
```

### 2. Smart Provider Selection

```typescript
// src/services/providerSelector.ts
import { UserPreference, PricingTier } from '@/types/pricing';

export class ProviderSelector {
  constructor(private userPref: UserPreference) {}
  
  /**
   * Select best text generation provider
   */
  async selectTextProvider(): Promise<string[]> {
    const { tier, textProvider, autoFallback } = this.userPref;
    
    if (tier === PricingTier.PREMIUM) {
      return ['gemini']; // Premium: Gemini only
    }
    
    if (tier === PricingTier.FREE) {
      return autoFallback
        ? ['ollama', 'groq', 'together'] // Try free options
        : ['ollama']; // Strict free only
    }
    
    // HYBRID: Custom priority
    const priority = [textProvider]; // User's choice first
    
    if (autoFallback) {
      // Add other free options as fallback
      if (textProvider !== 'ollama') priority.push('ollama');
      if (textProvider !== 'groq') priority.push('groq');
      if (textProvider !== 'together') priority.push('together');
      
      // Last resort: Paid API
      priority.push('gemini');
    }
    
    return priority;
  }
  
  /**
   * Select best image generation provider
   */
  async selectImageProvider(): Promise<string[]> {
    const { tier, imageProvider, autoFallback, preferQuality } = this.userPref;
    
    if (tier === PricingTier.PREMIUM) {
      return ['gemini']; // Premium: Gemini Imagen only
    }
    
    if (tier === PricingTier.FREE) {
      return preferQuality
        ? ['comfyui-flux', 'comfyui-sdxl'] // Quality first
        : ['comfyui-sdxl', 'comfyui-flux']; // Speed first
    }
    
    // HYBRID: User's choice + fallbacks
    const priority = [imageProvider];
    
    if (autoFallback) {
      // Add other ComfyUI options
      if (imageProvider !== 'comfyui-flux') priority.push('comfyui-flux');
      if (imageProvider !== 'comfyui-sdxl') priority.push('comfyui-sdxl');
      
      // Last resort: Paid API
      priority.push('gemini', 'huggingface');
    }
    
    return priority;
  }
  
  /**
   * Select best video generation provider
   */
  async selectVideoProvider(): Promise<string[]> {
    const { tier, videoProvider, autoFallback } = this.userPref;
    
    if (tier === PricingTier.PREMIUM) {
      return ['veo']; // Premium: Veo 3.1
    }
    
    if (tier === PricingTier.FREE) {
      return ['animatediff', 'svd']; // Free options only
    }
    
    // HYBRID
    const priority = [videoProvider];
    
    if (autoFallback) {
      if (videoProvider !== 'animatediff') priority.push('animatediff');
      if (videoProvider !== 'svd') priority.push('svd');
      priority.push('veo'); // Last resort
    }
    
    return priority;
  }
  
  /**
   * Estimate cost for generation
   */
  estimateCost(providers: {
    text: string;
    image: string;
    video: string;
  }): number {
    const costs = {
      // Text
      ollama: 0,
      groq: 0,
      together: 0,
      gemini: 0.01, // ~฿0.35 per 1000 tokens
      
      // Image
      'comfyui-sdxl': 0,
      'comfyui-flux': 0,
      huggingface: 0.1, // ~฿3.5 per image (Pro plan)
      
      // Video
      animatediff: 0,
      svd: 0,
      veo: 1.5, // ~฿50 per video
    };
    
    return (
      (costs[providers.text] || 0) +
      (costs[providers.image] || 0) * 4 + // 4 images per storyboard
      (costs[providers.video] || 0)
    );
  }
}
```

### 3. Pricing Selector UI Component

```typescript
// src/components/PricingSelector.tsx
import React, { useState } from 'react';
import { PricingTier, UserPreference, DEFAULT_PREFERENCES } from '@/types/pricing';

export function PricingSelector() {
  const [selectedTier, setSelectedTier] = useState<PricingTier>(PricingTier.HYBRID);
  const [preferences, setPreferences] = useState<UserPreference>(
    DEFAULT_PREFERENCES[PricingTier.HYBRID]
  );
  
  const handleTierChange = (tier: PricingTier) => {
    setSelectedTier(tier);
    setPreferences(DEFAULT_PREFERENCES[tier]);
  };
  
  return (
    <div className="pricing-selector">
      {/* Tier Selection Cards */}
      <div className="tier-cards">
        {/* FREE TIER */}
        <div
          className={`tier-card ${selectedTier === PricingTier.FREE ? 'active' : ''}`}
          onClick={() => handleTierChange(PricingTier.FREE)}
        >
          <div className="tier-icon">🆓</div>
          <h3>FREE</h3>
          <div className="tier-price">฿0/เดือน</div>
          <ul className="tier-features">
            <li>✅ ใช้งานไม่จำกัด</li>
            <li>✅ Ollama (Local AI)</li>
            <li>✅ ComfyUI + SDXL</li>
            <li>✅ AnimateDiff Video</li>
            <li>⚠️ ต้องมี GPU (8GB+)</li>
            <li>⏱️ ช้ากว่า (30-60s)</li>
          </ul>
          <div className="tier-best-for">
            💡 เหมาะกับ: Learning, Testing
          </div>
        </div>
        
        {/* HYBRID TIER */}
        <div
          className={`tier-card recommended ${selectedTier === PricingTier.HYBRID ? 'active' : ''}`}
          onClick={() => handleTierChange(PricingTier.HYBRID)}
        >
          <div className="tier-badge">🌟 แนะนำ</div>
          <div className="tier-icon">💎</div>
          <h3>HYBRID</h3>
          <div className="tier-price">฿100-300/เดือน</div>
          <ul className="tier-features">
            <li>✅ เลือกได้ Free + Paid</li>
            <li>✅ Groq (Free Cloud)</li>
            <li>✅ ComfyUI + FLUX</li>
            <li>✅ Auto Fallback</li>
            <li>✅ ไม่ต้องมี GPU</li>
            <li>⚡ เร็วกลาง (10-30s)</li>
          </ul>
          <div className="tier-best-for">
            💡 เหมาะกับ: ใช้งานทั่วไป
          </div>
        </div>
        
        {/* PREMIUM TIER */}
        <div
          className={`tier-card ${selectedTier === PricingTier.PREMIUM ? 'active' : ''}`}
          onClick={() => handleTierChange(PricingTier.PREMIUM)}
        >
          <div className="tier-icon">🚀</div>
          <h3>PREMIUM</h3>
          <div className="tier-price">฿500-1,000/เดือน</div>
          <ul className="tier-features">
            <li>✅ เร็วที่สุด</li>
            <li>✅ Gemini 2.0 Flash</li>
            <li>✅ Gemini Imagen 3</li>
            <li>✅ Veo 3.1 Video</li>
            <li>✅ Priority Queue</li>
            <li>⚡⚡⚡ เร็วมาก (3-10s)</li>
          </ul>
          <div className="tier-best-for">
            💡 เหมาะกับ: Professional
          </div>
        </div>
      </div>
      
      {/* Advanced Settings (Hybrid only) */}
      {selectedTier === PricingTier.HYBRID && (
        <div className="advanced-settings">
          <h4>⚙️ ตั้งค่าขั้นสูง</h4>
          
          <div className="setting-group">
            <label>Text Generation:</label>
            <select
              value={preferences.textProvider}
              onChange={(e) =>
                setPreferences({ ...preferences, textProvider: e.target.value as any })
              }
            >
              <option value="ollama">Ollama (ฟรี, Local, ช้า)</option>
              <option value="groq">Groq (ฟรี, Cloud, เร็ว) 🌟</option>
              <option value="together">Together.ai (ฟรี, หลายโมเดล)</option>
              <option value="gemini">Gemini (เสียเงิน, ดีสุด)</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>Image Generation:</label>
            <select
              value={preferences.imageProvider}
              onChange={(e) =>
                setPreferences({ ...preferences, imageProvider: e.target.value as any })
              }
            >
              <option value="comfyui-sdxl">ComfyUI + SDXL (ฟรี, เร็ว)</option>
              <option value="comfyui-flux">ComfyUI + FLUX (ฟรี, คุณภาพสูง) 🌟</option>
              <option value="gemini">Gemini Imagen (เสียเงิน, ดีสุด)</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>Video Generation:</label>
            <select
              value={preferences.videoProvider}
              onChange={(e) =>
                setPreferences({ ...preferences, videoProvider: e.target.value as any })
              }
            >
              <option value="animatediff">AnimateDiff (ฟรี) 🌟</option>
              <option value="svd">SVD (ฟรี)</option>
              <option value="veo">Veo 3.1 (เสียเงิน, ดีสุด)</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={preferences.autoFallback}
                onChange={(e) =>
                  setPreferences({ ...preferences, autoFallback: e.target.checked })
                }
              />
              Auto Fallback (ถ้าฟรีไม่ได้ ให้ลองของเสียเงิน)
            </label>
          </div>
          
          <div className="setting-group">
            <label>ค่าใช้จ่ายสูงสุดต่อครั้ง:</label>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={preferences.maxCostPerGeneration}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  maxCostPerGeneration: Number(e.target.value),
                })
              }
            />
            <span>฿{preferences.maxCostPerGeneration}</span>
          </div>
        </div>
      )}
      
      {/* Cost Estimator */}
      <div className="cost-estimator">
        <h4>💰 ประมาณการค่าใช้จ่าย</h4>
        <div className="estimate-table">
          <div className="estimate-row">
            <span>Text Generation (1 screenplay):</span>
            <span className="estimate-cost">
              {selectedTier === PricingTier.FREE ? '฿0' : '฿0.01-0.35'}
            </span>
          </div>
          <div className="estimate-row">
            <span>Image Generation (4 scenes):</span>
            <span className="estimate-cost">
              {selectedTier === PricingTier.FREE ? '฿0' : '฿0-14'}
            </span>
          </div>
          <div className="estimate-row">
            <span>Video Generation (1 video):</span>
            <span className="estimate-cost">
              {selectedTier === PricingTier.FREE ? '฿0' : '฿0-50'}
            </span>
          </div>
          <hr />
          <div className="estimate-row total">
            <span><strong>Total per Project:</strong></span>
            <span className="estimate-cost">
              <strong>
                {selectedTier === PricingTier.FREE
                  ? '฿0'
                  : selectedTier === PricingTier.HYBRID
                  ? '฿0-10'
                  : '฿50-65'}
              </strong>
            </span>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <button
        className="save-preferences-btn"
        onClick={() => {
          localStorage.setItem('userPreferences', JSON.stringify(preferences));
          alert('✅ บันทึกการตั้งค่าแล้ว!');
        }}
      >
        💾 บันทึกการตั้งค่า
      </button>
    </div>
  );
}
```

### 4. CSS Styling

```css
/* src/components/PricingSelector.css */
.pricing-selector {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.tier-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.tier-card {
  position: relative;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tier-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.tier-card.active {
  border-color: #4CAF50;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
}

.tier-card.recommended {
  border-color: #FF9800;
}

.tier-badge {
  position: absolute;
  top: -10px;
  right: 10px;
  background: linear-gradient(135deg, #FF9800, #FF5722);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
}

.tier-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 0.5rem;
}

.tier-card h3 {
  text-align: center;
  margin: 0.5rem 0;
  color: #333;
}

.tier-price {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: #4CAF50;
  margin: 1rem 0;
}

.tier-features {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.tier-features li {
  padding: 0.4rem 0;
  font-size: 0.9rem;
}

.tier-best-for {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  margin-top: 1rem;
}

.advanced-settings {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.advanced-settings h4 {
  margin-top: 0;
  color: #333;
}

.setting-group {
  margin: 1rem 0;
}

.setting-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #555;
}

.setting-group select,
.setting-group input[type="range"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.cost-estimator {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.cost-estimator h4 {
  margin-top: 0;
}

.estimate-table {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 6px;
}

.estimate-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.estimate-row.total {
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-size: 1.1rem;
}

.estimate-cost {
  font-weight: bold;
}

.save-preferences-btn {
  width: 100%;
  background: #4CAF50;
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
}

.save-preferences-btn:hover {
  background: #45a049;
}
```

---

## 🎮 User Experience Flow

### Scenario 1: Budget-Conscious User (FREE)
```
1. User selects "FREE" tier
2. System uses only open source:
   - Ollama for text
   - ComfyUI + SDXL for images
   - AnimateDiff for video
3. Result: ฿0 cost, ~60s generation time
4. User can upgrade anytime
```

### Scenario 2: Smart User (HYBRID) ⭐ Recommended
```
1. User selects "HYBRID" tier
2. User customizes:
   - Text: Groq (free cloud, fast)
   - Image: ComfyUI + FLUX (free, best quality)
   - Video: AnimateDiff (free)
   - Auto Fallback: ON (use paid if free fails)
   - Max Cost: ฿5 per generation
3. Result: Mostly ฿0-5, ~20s generation, excellent quality
```

### Scenario 3: Professional User (PREMIUM)
```
1. User selects "PREMIUM" tier
2. System uses best services:
   - Gemini 2.0 Flash for text
   - Gemini Imagen 3 for images
   - Veo 3.1 for video
3. Result: ฿50-65 per project, ~10s generation, best quality
4. Priority queue (faster processing)
```

---

## 📈 Revenue Model (Optional)

### Freemium Strategy

**FREE Tier**: 100% free forever
- Revenue: ฿0 (Community-driven)
- Goal: User acquisition, brand awareness

**HYBRID Tier**: Pay-as-you-go
- Revenue: ฿100-300/month
- Goal: Sustainable usage

**PREMIUM Tier**: Subscription
- Revenue: ฿500-1,000/month
- Goal: Professional users, studios

### Additional Revenue Streams

1. **Cloud ComfyUI Hosting** (฿200/month)
   - No need for local GPU
   - Shared infrastructure cost

2. **Custom LoRA Training** (฿500-2,000 per LoRA)
   - Train on user's style/characters
   - One-time fee

3. **Priority Processing** (฿50/month extra)
   - Skip queue
   - Faster generation

4. **Team Plan** (฿2,000/month for 5 users)
   - Shared quota
   - Collaboration features

---

## 🛠️ Implementation Checklist

### Phase 1: Core Pricing System (Week 1)
- [ ] Create `PricingTier` enum and types
- [ ] Implement `ProviderSelector` class
- [ ] Build `PricingSelector` UI component
- [ ] Add localStorage for user preferences
- [ ] Test tier switching

### Phase 2: Provider Integration (Week 2)
- [ ] Update `geminiService.ts` to use `ProviderSelector`
- [ ] Add cost tracking for each generation
- [ ] Implement budget limits
- [ ] Add usage analytics
- [ ] Test fallback mechanism

### Phase 3: UI/UX Polish (Week 3)
- [ ] Design tier comparison cards
- [ ] Add cost estimator
- [ ] Build usage dashboard
- [ ] Add "Upgrade" prompts
- [ ] Mobile responsive design

### Phase 4: Monetization (Week 4+)
- [ ] Integrate Stripe/Omise payment
- [ ] Build subscription management
- [ ] Add usage tracking & billing
- [ ] Create admin dashboard
- [ ] Launch beta pricing

---

## 💡 Smart Features

### 1. Cost Alerts
```typescript
// Alert user when approaching budget limit
if (estimatedCost > userPreferences.maxCostPerGeneration * 0.8) {
  showWarning(`⚠️ การสร้างนี้จะใช้ ~฿${estimatedCost.toFixed(2)}
               เกินงบประมาณที่ตั้งไว้ (฿${userPreferences.maxCostPerGeneration})
               ต้องการดำเนินการต่อหรือไม่?`);
}
```

### 2. Usage Dashboard
```typescript
// Show monthly usage stats
interface UsageStats {
  totalGenerations: number;
  totalCost: number;
  providers: {
    ollama: number; // Free
    groq: number;   // Free
    gemini: number; // Paid (฿X.XX)
  };
  savingsVsPremium: number; // "คุณประหยัดได้ ฿XXX"
}
```

### 3. Smart Recommendations
```typescript
// AI-powered tier recommendation
function recommendTier(userUsage: UsageStats): PricingTier {
  if (userUsage.totalGenerations < 10/month) return PricingTier.FREE;
  if (userUsage.totalCost > 500/month) return PricingTier.PREMIUM;
  return PricingTier.HYBRID; // Most users
}
```

---

## 🎯 Success Metrics

### User Satisfaction
- ✅ 80%+ users can use for free
- ✅ 15% choose Hybrid (best value)
- ✅ 5% choose Premium (professionals)

### Cost Efficiency
- ✅ Average cost: ฿50-100/month (Hybrid users)
- ✅ 90% cost reduction vs all-premium

### Performance
- ✅ Free: 30-60s (acceptable)
- ✅ Hybrid: 10-30s (good)
- ✅ Premium: 3-10s (excellent)

---

## 🚀 Launch Strategy

### Phase 1: Free Beta (Month 1-2)
- All users get FREE + HYBRID access
- Collect usage data
- Optimize provider selection
- Fix bugs

### Phase 2: Soft Launch (Month 3)
- Introduce pricing tiers
- Existing users: Grandfathered (special discount)
- New users: Choose tier
- Monitor conversion rate

### Phase 3: Full Launch (Month 4+)
- Marketing campaign
- Case studies from beta users
- Referral program
- Partnerships with film schools

---

## 📝 Summary

| Aspect | FREE | HYBRID | PREMIUM |
|--------|------|--------|---------|
| **Target** | Students, Hobbyists | Regular Users | Studios |
| **Cost** | ฿0 | ฿100-300 | ฿500-1,000 |
| **Speed** | ⚡⚡ 30-60s | ⚡⚡⚡ 10-30s | ⚡⚡⚡⚡ 3-10s |
| **Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Quota** | Unlimited | 100-500/day | 1,000+/day |
| **Best For** | Learning | Production | Professional |

**Philosophy**: "Your Choice, Your Budget - Everyone can create films with AI"

---

**Status**: Ready to implement  
**Recommendation**: Start with HYBRID tier for best balance  
**Next Step**: Build `PricingSelector` component

🎬 **Let's democratize filmmaking with flexible pricing!**
