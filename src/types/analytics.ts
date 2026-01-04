/**
 * Enhanced Analytics Types
 *
 * ข้อมูลการใช้งานแบบละเอียด พร้อมต้นทุนจริง
 */

// ===== Model Usage Tracking =====

export interface ModelUsage {
  modelId: string;
  modelName: string;
  provider: 'gemini' | 'replicate' | 'comfyui' | 'pollinations' | 'openai';
  type: 'text' | 'image' | 'video';
  count: number;
  totalCost: number; // THB
  lastUsed: Date;
}

export interface GenerationDetails {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
  modelId: string;
  modelName: string;
  provider: string;
  costInCredits: number;
  costInTHB: number;
  success: boolean;
  duration?: number; // seconds
  metadata?: {
    prompt?: string;
    resolution?: string;
    duration?: string;
    projectId?: string;
    sceneId?: string;
    tokens?: { input: number; output: number };
    characters?: number;
  };
}

export interface UserOfflineActivity {
  userId: string;
  lastOnline: Date;
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

// ===== Enhanced User Details =====

export interface EnhancedUserDetails {
  profile: {
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    lastActive?: Date;
    loginCount?: number;
  };
  subscription: {
    tier: string;
    status: 'active' | 'canceled' | 'canceling' | 'past_due';
    billingCycle?: 'monthly' | 'yearly';
    amount?: number;
    startDate?: Date;
    nextBillingDate?: Date;
    canceledAt?: Date;
  };
  usage: {
    credits: {
      used: number;
      max: number;
      remaining: number;
    };
    veoVideos: {
      used: number;
      max: number;
    };
    projects: number;
    characters: number;
    scenes: number;
    storageUsed: number;
  };
  // 🆕 Enhanced: Model Usage Breakdown
  modelUsage: {
    byModel: ModelUsage[];
    totalGenerations: number;
    totalCostTHB: number;
    breakdown: {
      text: {
        count: number;
        cost: number;
        models: string[];
      };
      image: {
        count: number;
        cost: number;
        models: string[];
      };
      video: {
        count: number;
        cost: number;
        models: string[];
      };
    };
  };
  // 🆕 Enhanced: Recent Activity
  recentActivity: GenerationDetails[];
  // 🆕 Enhanced: Offline Behavior
  offlineActivity: UserOfflineActivity;
  projects: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  usageHistory: Array<{
    month: string;
    creditsUsed: number;
    veoVideos: number;
    apiCalls: {
      scripts: number;
      images: number;
      videos: number;
    };
  }>;
}

// ===== Project Cost Tracking =====

export interface ServiceCost {
  service: string;
  category: 'api' | 'storage' | 'compute' | 'bandwidth' | 'database' | 'other';
  provider: string;
  monthlyCost: number; // THB
  usage: string;
  description: string;
  lastUpdated: Date;
}

export interface ApiCostBreakdown {
  apiName: string;
  provider: string;
  pricing: {
    model: string; // e.g., "per request", "per 1M tokens", "per image"
    rate: number; // THB
    freeQuota?: string;
  };
  currentMonthUsage: {
    calls: number;
    cost: number; // THB
  };
  projectedMonthlyCost: number; // THB
}

export interface ProjectCostSummary {
  totalMonthlyCost: number; // THB
  breakdown: {
    apis: {
      total: number;
      services: ApiCostBreakdown[];
    };
    storage: {
      total: number;
      firebase: number;
      cloudStorage: number;
    };
    compute: {
      total: number;
      cloudRun: number;
      cloudFunctions: number;
    };
    database: {
      total: number;
      firestore: number;
    };
    bandwidth: {
      total: number;
      hosting: number;
      cdn: number;
    };
    other: {
      total: number;
      services: ServiceCost[];
    };
  };
  userCosts: {
    averageCostPerUser: number; // THB
    totalActiveUsers: number;
    totalRevenue: number; // THB
    profit: number; // THB
    profitMargin: number; // %
  };
  lastUpdated: Date;
}

// ===== Real-time API Pricing (as of Dec 2024) =====

export const API_PRICING = {
  GEMINI: {
    '2.0-flash-exp': {
      input: 0, // FREE (with quota: 15 RPM, 1500 RPD, 1M TPM)
      output: 0,
      freeQuota: '1,500 requests/day',
      description: 'Text generation (Thai script, characters, scenes)',
    },
    '2.5-flash': {
      input: (0.075 * 35) / 1000000, // $0.075/1M tokens → ฿0.000002625/token
      output: (0.3 * 35) / 1000000, // $0.30/1M tokens → ฿0.0000105/token
      image: 0.0025 * 35, // $0.0025/image → ฿0.0875 (~฿0.09)
      freeQuota: 'None',
      description: 'High-quality image generation',
    },
    'veo-3': {
      video5s: 0.1 * 35, // $0.10/5s video → ฿3.50
      video10s: 0.5 * 35, // $0.50/10s video → ฿17.50
      freeQuota: 'None',
      description: 'Premium video generation (1080p)',
    },
    // Legacy / Fallback Models
    '1.5-flash': {
      input: (0.075 * 35) / 1000000,
      output: (0.3 * 35) / 1000000,
      freeQuota: 'None',
      description: 'Legacy Flash model',
    },
    '1.5-pro': {
      input: (3.5 * 35) / 1000000,
      output: (10.5 * 35) / 1000000,
      freeQuota: 'None',
      description: 'Legacy Pro model',
    },
  },
  REPLICATE: {
    'stable-video-diffusion': {
      perRun: 0.018 * 35, // $0.018 → ฿0.63
      avgDuration: '30-60 seconds',
      description: 'SVD 1.1 (3s video, 1024x576)',
    },
    animatediff: {
      perRun: 0.025 * 35, // $0.025 → ฿0.875
      avgDuration: '60-90 seconds',
      description: 'AnimateDiff v3 (2-8s video, 512x512)',
    },
    'ltx-video': {
      perRun: 0.15 * 35, // $0.15 → ฿5.25
      avgDuration: '2-3 minutes',
      description: 'LTX Video (5-10s, 768p)',
    },
  },
  COMFYUI: {
    image: 0.5, // ฿0.50 per image (estimated cost for self-hosted/cloud GPU)
    video: 2.0, // ฿2.00 per video
    local: {
      cost: 0,
      description: 'Free (user own hardware)',
    },
    cloud: {
      // RunPod pricing (if we add cloud ComfyUI)
      rtx3090: 0.44 * 35, // $0.44/hour → ฿15.4/hour
      rtx4090: 0.69 * 35, // $0.69/hour → ฿24.15/hour
      description: 'Cloud GPU (future feature)',
    },
  },
  FIREBASE: {
    hosting: {
      storage: 0, // FREE (10 GB)
      bandwidth: 0, // FREE (360 MB/day)
      customDomain: 0, // FREE
      description: 'Static hosting for React app',
    },
    firestore: {
      reads: 0, // FREE (50K/day)
      writes: 0, // FREE (20K/day)
      deletes: 0, // FREE (20K/day)
      storage: 0, // FREE (1 GB)
      paidReads: 0.36 / 100000, // ฿0.36 per 100K reads
      paidWrites: 1.08 / 100000, // ฿1.08 per 100K writes
      description: 'NoSQL database',
    },
    cloudFunctions: {
      invocations: 0, // FREE (2M/month)
      compute: 0, // FREE (400K GB-sec/month)
      egress: 0, // FREE (5 GB/month)
      paidInvocations: 0.4 / 1000000, // ฿0.40 per 1M invocations
      description: 'Serverless functions (Node.js 20)',
    },
    authentication: {
      monthlyActiveUsers: 0, // FREE (unlimited)
      description: 'User authentication',
    },
    storage: {
      storage: 0, // FREE (5 GB)
      downloads: 0, // FREE (1 GB/day)
      uploads: 0, // FREE (unlimited)
      paidStorage: 0.026 * 35, // $0.026/GB → ฿0.91/GB
      paidDownloads: 0.12 * 35, // $0.12/GB → ฿4.20/GB
      description: 'File storage (images, videos)',
    },
  },
  GOOGLE_CLOUD: {
    cloudRun: {
      cpu: 0.0000625 * 35, // $0.0000625 per vCPU-second → ฿0.002187
      memory: 0.0000065 * 35, // $0.0000065 per GiB-second → ฿0.000227
      requests: 0.4 / 1000000, // ฿0.40 per 1M requests
      egress: 0.12 * 35, // $0.12/GB → ฿4.20/GB
      description: 'Voice Cloning API (min-instances=0)',
      config: {
        vcpu: 2,
        memory: '8Gi',
        minInstances: 0,
        maxInstances: 10,
      },
    },
  },
} as const;

// Exchange rate: 1 USD = 35 THB (approximate)
export const USD_TO_THB = 35;

// ===== Profit & Loss Analysis =====

/**
 * Thai Tax Rates (2024-2025)
 */
export interface TaxRates {
  corporateTax: number; // 20% for most companies in Thailand
  vat: number; // 7% Value Added Tax
  withholdingTax: number; // 3% for professional services
  socialSecurity: number; // 5% on salaries (capped at ฿750/month per employee)
}

export const THAI_TAX_RATES: TaxRates = {
  corporateTax: 0.2, // 20%
  vat: 0.07, // 7%
  withholdingTax: 0.03, // 3%
  socialSecurity: 0.05, // 5%
};

/**
 * Subscription Pricing (from paymentService.ts)
 */
export const SUBSCRIPTION_PRICING = {
  free: { monthly: 0, yearly: 0 },
  basic: { monthly: 299, yearly: 2999 }, // ฿299/month or ฿2,999/year (2 months free)
  pro: { monthly: 999, yearly: 9999 }, // ฿999/month or ฿9,999/year (2 months free)
  enterprise: { monthly: 8000, yearly: 80000 }, // Custom pricing
} as const;

/**
 * Period for comparison
 */
export type ComparisonPeriod = 'month' | 'quarter' | 'year' | 'custom';

/**
 * Profit & Loss Statement
 */
export interface ProfitLossStatement {
  period: {
    type: ComparisonPeriod;
    start: Date;
    end: Date;
    label: string; // "มกราคม 2568", "Q1 2568", etc.
  };

  // Revenue (รายได้)
  revenue: {
    subscriptions: number; // รายได้จาก subscription
    addons: number; // รายได้จากซื้อ credits เพิ่ม
    other: number; // รายได้อื่นๆ (ถ้ามี)
    total: number; // รวมรายได้
  };

  // Cost of Goods Sold (ต้นทุนขาย)
  cogs: {
    apiCosts: number; // ต้นทุน API (Gemini, Replicate)
    storageCosts: number; // Firebase Storage
    computeCosts: number; // Cloud Run, Functions
    databaseCosts: number; // Firestore operations
    bandwidthCosts: number; // Network egress
    total: number; // รวมต้นทุนขาย
  };

  // Gross Profit (กำไรขั้นต้น)
  grossProfit: number; // Revenue - COGS
  grossMargin: number; // (Gross Profit / Revenue) * 100

  // Operating Expenses (ค่าใช้จ่ายในการดำเนินงาน)
  operatingExpenses: {
    salaries: number; // เงินเดือนพนักงาน
    marketing: number; // ค่าโฆษณา, SEO
    infrastructure: number; // Server, domain, SSL
    software: number; // Third-party tools, licenses
    other: number; // อื่นๆ
    total: number; // รวมค่าใช้จ่าย
  };

  // EBITDA (Earnings Before Interest, Tax, Depreciation, Amortization)
  ebitda: number; // Gross Profit - Operating Expenses
  ebitdaMargin: number; // (EBITDA / Revenue) * 100

  // Tax Breakdown (ภาษี)
  taxes: {
    vat: number; // 7% VAT on revenue
    corporateTax: number; // 20% on net profit before tax
    withholdingTax: number; // 3% on services
    socialSecurity: number; // 5% on salaries
    total: number; // รวมภาษี
  };

  // Net Profit (กำไรสุทธิ)
  netProfitBeforeTax: number; // EBITDA - Interest - Depreciation
  netProfitAfterTax: number; // Net Profit Before Tax - Corporate Tax
  netMargin: number; // (Net Profit After Tax / Revenue) * 100
}

/**
 * Comparison between two periods
 */
export interface PeriodComparison {
  current: ProfitLossStatement;
  previous: ProfitLossStatement;
  changes: {
    revenue: { amount: number; percentage: number };
    cogs: { amount: number; percentage: number };
    grossProfit: { amount: number; percentage: number };
    operatingExpenses: { amount: number; percentage: number };
    ebitda: { amount: number; percentage: number };
    netProfitAfterTax: { amount: number; percentage: number };
  };
}

/**
 * Historical profit/loss data for trend analysis
 */
export interface HistoricalProfitLoss {
  periods: ProfitLossStatement[];
  trends: {
    revenueGrowth: number[]; // % growth per period
    profitMargins: number[]; // net margin % per period
    costRatios: number[]; // COGS as % of revenue per period
  };
}
