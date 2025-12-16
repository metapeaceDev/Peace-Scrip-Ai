# Stripe Payment Integration Guide

## 📋 Overview

ระบบ Peace Script ใช้ **Stripe Payment Links** สำหรับการชำระเงินแบบง่าย ไม่ต้อง setup backend ซับซ้อน

---

## 🎯 แผนและราคา

| แผน | ราคาปกติ (รายเดือน) | Early Bird (50% OFF) | ราคาต่อปี |
|-----|---------------------|---------------------|----------|
| **Basic** | ฿299 | ฿150 | ฿2,990 |
| **Pro** | ฿999 | ฿500 | ฿9,990 |
| **Enterprise** | ฿8,000+ | Contact Sales | ฿80,000+ |

---

## 🔧 ขั้นตอนการตั้งค่า Stripe

### Step 1: สร้าง Products ใน Stripe Dashboard

1. ไปที่ [Stripe Dashboard](https://dashboard.stripe.com)
2. เข้า **Products** → **Add Product**
3. สร้าง 3 products:

#### Product 1: Basic Plan
- **Name**: Peace Script - Basic Plan
- **Description**: เหมาะสำหรับผู้เริ่มต้น - 385M Tokens, 471 Images, 47 Videos, 1 Team Member
- **Pricing**:
  - Regular Monthly: ฿299 THB
  - Early Bird Monthly: ฿150 THB (with coupon)
  - Yearly: ฿2,990 THB
- **Billing**: Recurring subscription
- **Tax**: Exclude tax (or set up as needed)

#### Product 2: Pro Plan
- **Name**: Peace Script - Pro Plan
- **Description**: สำหรับนักสร้างสรรค์มืออาชีพ - 1,308M Tokens, 1,708 Images, 144 Videos, 3 Team Members
- **Pricing**:
  - Regular Monthly: ฿999 THB
  - Early Bird Monthly: ฿500 THB (with coupon)
  - Yearly: ฿9,990 THB
- **Billing**: Recurring subscription

#### Product 3: Enterprise Plan
- **Name**: Peace Script - Enterprise Plan
- **Description**: สำหรับองค์กรขนาดใหญ่ - 3,495M Tokens, 4,992 Images, 344 Videos, 5+ Team Members, Custom AI Training
- **Pricing**: Custom (Contact Sales)
- **Note**: ไม่ต้องสร้าง Payment Link สำหรับ Enterprise

---

### Step 2: สร้าง Coupons (สำหรับ Early Bird)

1. ไปที่ **Products** → **Coupons** → **Create Coupon**
2. สร้าง 2 coupons:

#### Coupon 1: Early Bird - Basic
- **ID**: `EARLYBIRD-BASIC`
- **Type**: Percentage discount
- **Percent Off**: 50%
- **Duration**: Forever (หรือจำกัดเวลาตามต้องการ)
- **Applies to**: Basic Plan only

#### Coupon 2: Early Bird - Pro
- **ID**: `EARLYBIRD-PRO`
- **Type**: Percentage discount
- **Percent Off**: 50%
- **Duration**: Forever
- **Applies to**: Pro Plan only

---

### Step 3: สร้าง Payment Links

1. ไปที่ **Payment Links** → **Create Payment Link**
2. สร้าง links ทั้งหมด 6 links:

#### Links สำหรับ Basic Plan
1. **Basic - Monthly (Regular)**
   - Product: Basic Plan (฿299/month)
   - No coupon
   
2. **Basic - Yearly**
   - Product: Basic Plan (฿2,990/year)
   - No coupon
   
3. **Basic - Early Bird**
   - Product: Basic Plan (฿299/month)
   - Apply coupon: `EARLYBIRD-BASIC` → Final price: ฿150/month

#### Links สำหรับ Pro Plan
4. **Pro - Monthly (Regular)**
   - Product: Pro Plan (฿999/month)
   - No coupon
   
5. **Pro - Yearly**
   - Product: Pro Plan (฿9,990/year)
   - No coupon
   
6. **Pro - Early Bird**
   - Product: Pro Plan (฿999/month)
   - Apply coupon: `EARLYBIRD-PRO` → Final price: ฿500/month

---

### Step 4: Copy Payment Links

หลังจากสร้าง Payment Links แล้ว ให้ copy URLs ทั้งหมด:

```typescript
// ตัวอย่าง URLs (จะได้จริงหลังสร้างใน Stripe)
const STRIPE_LINKS = {
  basic: {
    monthly: 'https://buy.stripe.com/xxxxxxxxxxxxx',
    yearly: 'https://buy.stripe.com/xxxxxxxxxxxxx',
    earlyBird: 'https://buy.stripe.com/xxxxxxxxxxxxx',
  },
  pro: {
    monthly: 'https://buy.stripe.com/xxxxxxxxxxxxx',
    yearly: 'https://buy.stripe.com/xxxxxxxxxxxxx',
    earlyBird: 'https://buy.stripe.com/xxxxxxxxxxxxx',
  },
};
```

---

### Step 5: อัพเดท Payment Links ในโค้ด

แก้ไขไฟล์: `/src/services/paymentService.ts`

```typescript
export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, SubscriptionPrice> = {
  free: {
    tier: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'THB',
  },
  basic: {
    tier: 'basic',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    currency: 'THB',
    earlyBirdDiscount: 50,
    stripeMonthlyLink: 'https://buy.stripe.com/xxxxxxxxxxxxx', // ← ใส่ link จริง
    stripeYearlyLink: 'https://buy.stripe.com/xxxxxxxxxxxxx',  // ← ใส่ link จริง
    stripeEarlyBirdLink: 'https://buy.stripe.com/xxxxxxxxxxxxx', // ← ใส่ link จริง
  },
  pro: {
    tier: 'pro',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'THB',
    earlyBirdDiscount: 50,
    stripeMonthlyLink: 'https://buy.stripe.com/xxxxxxxxxxxxx', // ← ใส่ link จริง
    stripeYearlyLink: 'https://buy.stripe.com/xxxxxxxxxxxxx',  // ← ใส่ link จริง
    stripeEarlyBirdLink: 'https://buy.stripe.com/xxxxxxxxxxxxx', // ← ใส่ link จริง
  },
  enterprise: {
    tier: 'enterprise',
    monthlyPrice: 8000,
    yearlyPrice: 80000,
    currency: 'THB',
    earlyBirdDiscount: 0,
    stripeMonthlyLink: '', // Enterprise: Contact Sales
    stripeYearlyLink: '',
  },
};
```

---

## 🔗 Success/Cancel URLs

เมื่อสร้าง Payment Links ใน Stripe ให้ตั้งค่า:

- **Success URL**: `https://peace-script-ai.web.app/payment/success`
- **Cancel URL**: `https://peace-script-ai.web.app/payment/cancel`

(URLs เหล่านี้จะถูกเรียกหลังจากชำระเงินสำเร็จหรือยกเลิก)

---

## 📊 Webhooks (Optional - สำหรับอัพเดท subscription อัตโนมัติ)

หากต้องการให้ระบบอัพเดท subscription status อัตโนมัติ:

1. ตั้งค่า Webhook URL ใน Stripe:
   - **Endpoint**: `https://your-backend.com/api/stripe/webhook`
   - **Events**: 
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. สร้าง backend endpoint รับ webhook
3. Verify webhook signature
4. Update user subscription in Firebase

**หมายเหตุ**: ตอนนี้ยังไม่จำเป็น เพราะใช้ Payment Links แบบง่าย

---

## ✅ Checklist

- [ ] สร้าง 3 Products ใน Stripe (Basic, Pro, Enterprise)
- [ ] สร้าง 2 Coupons สำหรับ Early Bird discount
- [ ] สร้าง 6 Payment Links (Basic x3, Pro x3)
- [ ] Copy URLs ทั้งหมด
- [ ] อัพเดท URLs ใน `paymentService.ts`
- [ ] ตั้งค่า Success/Cancel URLs
- [ ] ทดสอบการชำระเงิน (ใช้ Test Mode)
- [ ] Deploy ขึ้น production
- [ ] เปิดใช้งาน Live Mode ใน Stripe

---

## 🧪 การทดสอบ

### Test Mode
ใช้บัตรทดสอบของ Stripe:
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: อนาคตใดๆ (เช่น 12/34)
- **CVC**: 3 หลักใดๆ (เช่น 123)
- **ZIP**: 5 หลักใดๆ (เช่น 12345)

### สิ่งที่ต้องทดสอบ
- ✅ ชำระเงินสำเร็จ → redirect ไป Success page
- ✅ ยกเลิกการชำระเงิน → redirect ไป Cancel page
- ✅ Early Bird discount ทำงานถูกต้อง (ราคาลด 50%)
- ✅ แสดงราคาต่างกันระหว่าง monthly/yearly
- ✅ Enterprise plan แสดง "Contact Sales"

---

## 📞 Support

หากมีปัญหาหรือคำถาม:
- 📧 Email: metapeaceofficial@gmail.com
- 📱 Tel: 099-1923952
- 🌐 Stripe Dashboard: https://dashboard.stripe.com

---

## 🚀 Next Steps (Future)

1. **Webhook Integration**: อัพเดท subscription อัตโนมัติ
2. **Customer Portal**: ให้ลูกค้าจัดการ subscription เอง
3. **Usage-based Billing**: เรียกเก็บตาม usage จริง
4. **Promotions**: สร้าง promo codes ได้ยืดหยุ่นกว่า
5. **Multi-currency**: รองรับ USD, EUR นอกจาก THB
