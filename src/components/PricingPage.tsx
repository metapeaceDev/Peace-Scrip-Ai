import React from 'react';
import { SubscriptionTier } from '../../types';

interface PricingPageProps {
  onSelectTier: (tier: SubscriptionTier) => void;
  currentTier?: SubscriptionTier;
}

interface PricingTier {
  tier: SubscriptionTier;
  name: string;
  price: string;
  priceNote: string;
  popular?: boolean;
  features: string[];
  limits: {
    projects: string;
    characters: string;
    scenes: string;
    resolution: string;
    storage: string;
    credits: string;
  };
}

const PRICING_TIERS: PricingTier[] = [
  {
    tier: 'free',
    name: 'FREE',
    price: '฿0',
    priceNote: '/เดือน',
    features: [
      '✅ 1 โปรเจกต์',
      '✅ 3 ตัวละคร/โปรเจกต์',
      '✅ 9 ฉาก (1 ฉากต่อ plot point)',
      '✅ รูปภาพ 1024×1024',
      '✅ วิดีโอ 3 วินาที',
      '✅ 500 MB Storage',
      '✅ Export PDF (Watermark)',
      '⚠️ Free AI Models เท่านั้น',
      '❌ ไม่สามารถใช้เชิงพาณิชย์',
    ],
    limits: {
      projects: '1 โปรเจกต์',
      characters: '3 ตัวละคร',
      scenes: '9 ฉาก',
      resolution: '1024×1024',
      storage: '500 MB',
      credits: '-',
    },
  },
  {
    tier: 'basic',
    name: 'BASIC',
    price: '฿299',
    priceNote: '/เดือน',
    popular: true,
    features: [
      '✅ 5 โปรเจกต์',
      '✅ 10 ตัวละคร/โปรเจกต์',
      '✅ ฉาก Unlimited',
      '✅ รูปภาพ 2048×2048',
      '✅ วิดีโอ 4 วินาที',
      '✅ 1 GB Storage',
      '✅ 100 Credits/เดือน',
      '✅ Export PDF, Final Draft, Fountain',
      '✅ Priority Queue (Standard)',
      '✅ Gemini Pro Image',
      '✅ Gemini Veo Video',
      '⚠️ Personal Use (ระบุ Credit ถ้าใช้เชิงพาณิชย์)',
    ],
    limits: {
      projects: '5 โปรเจกต์',
      characters: '10 ตัวละคร',
      scenes: 'Unlimited',
      resolution: '2048×2048',
      storage: '1 GB',
      credits: '100 credits/เดือน',
    },
  },
  {
    tier: 'pro',
    name: 'PRO',
    price: '฿999',
    priceNote: '/เดือน',
    features: [
      '✅ โปรเจกต์ Unlimited',
      '✅ ตัวละคร Unlimited',
      '✅ ฉาก Unlimited',
      '✅ รูปภาพ 4096×4096',
      '✅ วิดีโอ 10 วินาที',
      '✅ 10 GB Storage',
      '✅ 500 Credits/เดือน',
      '✅ Export ทุกรูปแบบ + Production Package',
      '✅ Priority Queue (High)',
      '✅ ComfyUI FLUX, OpenAI DALL-E 3',
      '✅ Luma Dream Machine, Runway Gen-3',
      '✅ Commercial License (Full Rights)',
      '✅ API Access (Beta)',
      '✅ Collaboration Tools',
      '✅ Version Control',
    ],
    limits: {
      projects: 'Unlimited',
      characters: 'Unlimited',
      scenes: 'Unlimited',
      resolution: '4096×4096',
      storage: '10 GB',
      credits: '500 credits/เดือน',
    },
  },
  {
    tier: 'enterprise',
    name: 'ENTERPRISE',
    price: 'ติดต่อ',
    priceNote: 'เริ่มต้น ฿5,000+/เดือน',
    features: [
      '✅ ทุกอย่างใน PRO',
      '✅ 9,999 Credits/เดือน (หรือกำหนดเอง)',
      '✅ วิดีโอ 60 วินาที',
      '✅ 100 GB+ Storage',
      '✅ On-Premise Deployment (Optional)',
      '✅ Custom Workflows',
      '✅ Dedicated Support',
      '✅ Team Accounts (Unlimited users)',
      '✅ SLA Guarantee (99.9% uptime)',
      '✅ Training & Onboarding',
      '✅ White Label Option',
      '✅ Custom Integrations',
    ],
    limits: {
      projects: 'Unlimited',
      characters: 'Unlimited',
      scenes: 'Unlimited',
      resolution: '4096×4096',
      storage: '100 GB+',
      credits: '9,999+ credits',
    },
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ onSelectTier, currentTier = 'free' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            เลือกแพ็กเกจที่เหมาะกับคุณ
          </h1>
          <p className="text-xl text-gray-400">ราคาคุ้มค่า ทุกแพ็กเกจได้ AI ที่ดีที่สุด</p>
          <div className="mt-6 inline-block bg-green-900/30 border border-green-500/50 rounded-lg px-6 py-3">
            <p className="text-green-400 font-semibold">
              🎉 Early Bird Promotion: ลด 50% สำหรับผู้สมัครในปีแรก!
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PRICING_TIERS.map(tier => (
            <div
              key={tier.tier}
              className={`relative bg-gray-800 rounded-xl overflow-hidden transition-all duration-300 ${
                tier.popular
                  ? 'border-2 border-cyan-500 shadow-2xl shadow-cyan-500/50 scale-105'
                  : 'border border-gray-700 hover:border-cyan-500/50'
              } ${currentTier === tier.tier ? 'ring-2 ring-green-500' : ''}`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ⭐ POPULAR
                </div>
              )}

              {/* Current Badge */}
              {currentTier === tier.tier && (
                <div className="absolute top-4 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ✓ CURRENT
                </div>
              )}

              <div className="p-6">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-gray-400 ml-2">{tier.priceNote}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">
                        {feature.startsWith('✅') ? '✓' : feature.startsWith('⚠️') ? '⚠' : '×'}
                      </span>
                      <span className={feature.startsWith('❌') ? 'text-gray-500' : ''}>
                        {feature.replace(/^(✅|⚠️|❌)\s*/, '').trim()}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => onSelectTier(tier.tier)}
                  disabled={currentTier === tier.tier}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    currentTier === tier.tier
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : tier.popular
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {currentTier === tier.tier
                    ? 'แพ็กเกจปัจจุบัน'
                    : tier.tier === 'enterprise'
                      ? 'ติดต่อฝ่ายขาย'
                      : tier.tier === 'free'
                        ? 'ใช้งานฟรี'
                        : 'เริ่มใช้งาน'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-center">เปรียบเทียบแพ็กเกจ</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">Feature</th>
                  {PRICING_TIERS.map(tier => (
                    <th key={tier.tier} className="text-center py-3 px-4">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(PRICING_TIERS[0].limits).map(key => (
                  <tr key={key} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-gray-400 capitalize">
                      {key === 'projects' && 'โปรเจกต์'}
                      {key === 'characters' && 'ตัวละคร'}
                      {key === 'scenes' && 'ฉาก'}
                      {key === 'resolution' && 'ความละเอียด'}
                      {key === 'storage' && 'พื้นที่จัดเก็บ'}
                      {key === 'credits' && 'Credits'}
                    </td>
                    {PRICING_TIERS.map(tier => (
                      <td key={tier.tier} className="text-center py-3 px-4">
                        {tier.limits[key as keyof typeof tier.limits]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-6">คำถามที่พบบ่อย</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="font-bold mb-2">💳 รับชำระเงินอย่างไร?</h3>
              <p className="text-gray-400 text-sm">
                รับชำระผ่าน Credit Card, PromptPay, Bank Transfer (Coming Soon)
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="font-bold mb-2">🔄 ยกเลิกได้ไหม?</h3>
              <p className="text-gray-400 text-sm">
                ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ใช้งานได้จนจบรอบบิล
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="font-bold mb-2">📈 อัพเกรดกลางเดือนได้ไหม?</h3>
              <p className="text-gray-400 text-sm">ได้! คิดเฉพาะส่วนต่างตามจำนวนวันที่เหลือ</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="font-bold mb-2">💰 Credits คืออะไร?</h3>
              <p className="text-gray-400 text-sm">
                ใช้สร้างรูป/วิดีโอด้วย Premium AI Models (5-50 credits/ครั้ง)
              </p>
            </div>
          </div>
        </div>

        {/* Contact for Enterprise */}
        <div className="mt-12 text-center bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/50 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">ต้องการ Enterprise Plan?</h2>
          <p className="text-gray-300 mb-6">
            เรามีแพ็กเกจที่ปรับแต่งได้สำหรับองค์กรใหญ่ บริษัทผลิตภาพยนตร์ และสถาบันการศึกษา
          </p>
          <a
            href="mailto:sales@peace-script-ai.com"
            className="inline-block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-lg"
          >
            📧 ติดต่อฝ่ายขาย
          </a>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
