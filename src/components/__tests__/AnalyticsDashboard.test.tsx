import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { getUserSubscription } from '../../services/userStore';
import {
  getUsageStats,
  calculateCostSavings,
  getUsageHistory,
} from '../../services/usageTracker';

// Mock services
vi.mock('../../services/userStore', () => ({
  getUserSubscription: vi.fn(),
}));

vi.mock('../../services/usageTracker', () => ({
  getUsageStats: vi.fn(),
  calculateCostSavings: vi.fn(),
  getUsageHistory: vi.fn(),
  exportUsageData: vi.fn(),
}));

describe('AnalyticsDashboard - Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    (getUserSubscription as any).mockReturnValue({
      tier: 'free',
      features: {
        maxProjects: 1,
        maxCharacters: 3,
        maxScenes: 10,
        storageLimit: 100,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 0,
        images: 0,
        videos: 0,
        projects: 0,
      },
      projects: {
        total: 0,
      },
      characters: {
        total: 0,
      },
      scenes: {
        total: 0,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should render AnalyticsDashboard component', () => {
    const { container } = render(<AnalyticsDashboard />);
    expect(container).toBeTruthy();
  });

  it('should display dashboard header', () => {
    render(<AnalyticsDashboard />);
    const headers = screen.getAllByText(/แดชบอร์ดการใช้งาน/i);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should display subscription tier label', () => {
    render(<AnalyticsDashboard />);
    const tierLabels = screen.getAllByText(/FREE/i);
    expect(tierLabels.length).toBeGreaterThan(0);
  });

  it('should display time range selector', () => {
    const { container } = render(<AnalyticsDashboard />);
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should display export button', () => {
    render(<AnalyticsDashboard />);
    const exportButtons = screen.getAllByText(/Export ข้อมูล/i);
    expect(exportButtons.length).toBeGreaterThan(0);
  });

  it('should render credits usage card', () => {
    render(<AnalyticsDashboard />);
    const creditsLabels = screen.getAllByText(/Credits/i);
    expect(creditsLabels.length).toBeGreaterThan(0);
  });

  it('should render storage usage card', () => {
    render(<AnalyticsDashboard />);
    const storageLabels = screen.getAllByText(/Storage/i);
    expect(storageLabels.length).toBeGreaterThan(0);
  });

  it('should render projects usage card', () => {
    render(<AnalyticsDashboard />);
    const projectsLabels = screen.getAllByText(/โปรเจกต์/i);
    expect(projectsLabels.length).toBeGreaterThan(0);
  });
});

describe('AnalyticsDashboard - Usage Stats Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should display image generation stats', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 25,
        failed: 3,
        totalCreditsUsed: 50,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 100,
        images: 80,
        videos: 10,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 20,
      },
      apiCalls: {
        geminiText: 15,
      },
    });

    render(<AnalyticsDashboard />);
    const imageStats = screen.getAllByText('25');
    expect(imageStats.length).toBeGreaterThan(0);
  });

  it('should display video generation stats', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 10,
        totalDuration: 120,
        totalCreditsUsed: 30,
      },
      storage: {
        used: 50,
        images: 10,
        videos: 30,
        projects: 10,
      },
      projects: {
        total: 1,
      },
      characters: {
        total: 3,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 8,
      },
    });

    render(<AnalyticsDashboard />);
    const videoStats = screen.getAllByText('10');
    expect(videoStats.length).toBeGreaterThan(0);
  });

  it('should display storage breakdown', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 150,
        images: 80,
        videos: 50,
        projects: 20,
      },
      projects: {
        total: 0,
      },
      characters: {
        total: 0,
      },
      scenes: {
        total: 0,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const storageLabels = screen.getAllByText(/รูปภาพ:/i);
    expect(storageLabels.length).toBeGreaterThan(0);
  });

  it('should display project count', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 0,
        images: 0,
        videos: 0,
        projects: 0,
      },
      projects: {
        total: 3,
      },
      characters: {
        total: 8,
      },
      scenes: {
        total: 25,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const projectCounts = screen.getAllByText(/3/);
    expect(projectCounts.length).toBeGreaterThan(0);
  });

  it('should display character count', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 0,
        images: 0,
        videos: 0,
        projects: 0,
      },
      projects: {
        total: 1,
      },
      characters: {
        total: 7,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const characterLabels = screen.getAllByText(/ตัวละคร:/i);
    expect(characterLabels.length).toBeGreaterThan(0);
  });

  it('should display scene count', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 0,
        images: 0,
        videos: 0,
        projects: 0,
      },
      projects: {
        total: 1,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 30,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const sceneLabels = screen.getAllByText(/ฉาก:/i);
    expect(sceneLabels.length).toBeGreaterThan(0);
  });

  it('should display API calls summary', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 10,
        failed: 2,
        totalCreditsUsed: 20,
      },
      videos: {
        generated: 5,
        totalDuration: 60,
        totalCreditsUsed: 15,
      },
      storage: {
        used: 50,
        images: 30,
        videos: 15,
        projects: 5,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 6,
      },
      scenes: {
        total: 18,
      },
      apiCalls: {
        geminiText: 42,
      },
    });

    render(<AnalyticsDashboard />);
    const apiCallsLabels = screen.getAllByText(/การเรียกใช้ API/i);
    expect(apiCallsLabels.length).toBeGreaterThan(0);
  });
});

describe('AnalyticsDashboard - Cost Savings Alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      features: {
        maxProjects: Infinity,
        maxCharacters: Infinity,
        maxScenes: Infinity,
        storageLimit: Infinity,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 50,
        failed: 5,
        totalCreditsUsed: 100,
      },
      videos: {
        generated: 20,
        totalDuration: 240,
        totalCreditsUsed: 60,
      },
      storage: {
        used: 500,
        images: 300,
        videos: 150,
        projects: 50,
      },
      projects: {
        total: 10,
      },
      characters: {
        total: 30,
      },
      scenes: {
        total: 100,
      },
      apiCalls: {
        geminiText: 80,
      },
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should display cost savings alert when savings exist', () => {
    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 5000,
    });

    render(<AnalyticsDashboard />);
    const savingsTexts = screen.getAllByText(/ประหยัดได้/i);
    expect(savingsTexts.length).toBeGreaterThan(0);
  });

  it('should show correct savings amount', () => {
    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 3500,
    });

    render(<AnalyticsDashboard />);
    const amountTexts = screen.getAllByText(/฿3,500/);
    expect(amountTexts.length).toBeGreaterThan(0);
  });

  it('should mention free providers in savings alert', () => {
    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 2000,
    });

    render(<AnalyticsDashboard />);
    const providerTexts = screen.getAllByText(/ComfyUI/i);
    expect(providerTexts.length).toBeGreaterThan(0);
  });

  it('should not display savings alert when savings is 0', () => {
    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    render(<AnalyticsDashboard />);
    const savingsTexts = screen.queryAllByText(/ประหยัดได้/i);
    expect(savingsTexts.length).toBe(0);
  });
});

describe('AnalyticsDashboard - Upgrade Recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should show upgrade recommendation when storage > 80%', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'free',
      features: {
        maxProjects: 1,
        maxCharacters: 3,
        maxScenes: 10,
        storageLimit: 100,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 85, // 85% of 100MB
        images: 60,
        videos: 20,
        projects: 5,
      },
      projects: {
        total: 0,
      },
      characters: {
        total: 0,
      },
      scenes: {
        total: 0,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const upgradeTexts = screen.getAllByText(/Upgrade/i);
    expect(upgradeTexts.length).toBeGreaterThan(0);
  });

  it('should show upgrade recommendation when projects > 80%', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 100,
        images: 70,
        videos: 20,
        projects: 10,
      },
      projects: {
        total: 5, // 100% of 5 projects (> 80%)
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 20,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const upgradeTexts = screen.getAllByText(/Upgrade/i);
    expect(upgradeTexts.length).toBeGreaterThan(0);
  });

  it('should not show upgrade for pro tier users', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      features: {
        maxProjects: Infinity,
        maxCharacters: Infinity,
        maxScenes: Infinity,
        storageLimit: Infinity,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 100,
        failed: 10,
        totalCreditsUsed: 200,
      },
      videos: {
        generated: 50,
        totalDuration: 600,
        totalCreditsUsed: 150,
      },
      storage: {
        used: 5000,
        images: 3000,
        videos: 1500,
        projects: 500,
      },
      projects: {
        total: 50,
      },
      characters: {
        total: 200,
      },
      scenes: {
        total: 500,
      },
      apiCalls: {
        geminiText: 300,
      },
    });

    render(<AnalyticsDashboard />);
    const upgradeTexts = screen.queryAllByText(/คุณใช้งานเกือบหมดแล้ว/i);
    expect(upgradeTexts.length).toBe(0);
  });

  it('should display upgrade button', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'free',
      features: {
        maxProjects: 1,
        maxCharacters: 3,
        maxScenes: 10,
        storageLimit: 100,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 90,
        images: 60,
        videos: 25,
        projects: 5,
      },
      projects: {
        total: 0,
      },
      characters: {
        total: 0,
      },
      scenes: {
        total: 0,
      },
      apiCalls: {
        geminiText: 0,
      },
    });

    render(<AnalyticsDashboard />);
    const upgradeButtons = screen.getAllByText(/Upgrade เลย/i);
    expect(upgradeButtons.length).toBeGreaterThan(0);
  });
});

describe('AnalyticsDashboard - Generation Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should display image generation card', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 30,
        failed: 5,
        totalCreditsUsed: 60,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 100,
        images: 80,
        videos: 10,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 20,
      },
    });

    render(<AnalyticsDashboard />);
    const imageCards = screen.getAllByText(/การสร้างรูปภาพ/i);
    expect(imageCards.length).toBeGreaterThan(0);
  });

  it('should display video generation card', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 15,
        totalDuration: 180,
        totalCreditsUsed: 45,
      },
      storage: {
        used: 100,
        images: 30,
        videos: 60,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 10,
      },
    });

    render(<AnalyticsDashboard />);
    const videoCards = screen.getAllByText(/การสร้างวิดีโอ/i);
    expect(videoCards.length).toBeGreaterThan(0);
  });

  it('should display success rate for images', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 45,
        failed: 5,
        totalCreditsUsed: 90,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 100,
        images: 80,
        videos: 10,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 25,
      },
    });

    render(<AnalyticsDashboard />);
    const rateLabels = screen.getAllByText(/อัตราสำเร็จ/i);
    expect(rateLabels.length).toBeGreaterThan(0);
  });

  it('should display failed image count', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 20,
        failed: 8,
        totalCreditsUsed: 40,
      },
      videos: {
        generated: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
      },
      storage: {
        used: 80,
        images: 60,
        videos: 10,
        projects: 10,
      },
      projects: {
        total: 1,
      },
      characters: {
        total: 3,
      },
      scenes: {
        total: 10,
      },
      apiCalls: {
        geminiText: 15,
      },
    });

    render(<AnalyticsDashboard />);
    const failedLabels = screen.getAllByText(/ล้มเหลว/i);
    expect(failedLabels.length).toBeGreaterThan(0);
  });

  it('should display total video duration', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      },
      videos: {
        generated: 12,
        totalDuration: 300,
        totalCreditsUsed: 36,
      },
      storage: {
        used: 100,
        images: 30,
        videos: 60,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 18,
      },
    });

    render(<AnalyticsDashboard />);
    const durationLabels = screen.getAllByText(/ระยะเวลารวม/i);
    expect(durationLabels.length).toBeGreaterThan(0);
  });

  it('should display average daily stats', () => {
    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 60,
        failed: 10,
        totalCreditsUsed: 120,
      },
      videos: {
        generated: 30,
        totalDuration: 450,
        totalCreditsUsed: 90,
      },
      storage: {
        used: 200,
        images: 120,
        videos: 60,
        projects: 20,
      },
      projects: {
        total: 3,
      },
      characters: {
        total: 8,
      },
      scenes: {
        total: 25,
      },
      apiCalls: {
        geminiText: 50,
      },
    });

    render(<AnalyticsDashboard />);
    const dailyLabels = screen.getAllByText(/เฉลี่ยต่อวัน/i);
    expect(dailyLabels.length).toBeGreaterThan(1); // Should appear in both image and video cards
  });
});

describe('AnalyticsDashboard - Activity History', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 10,
        failed: 2,
        totalCreditsUsed: 20,
      },
      videos: {
        generated: 5,
        totalDuration: 60,
        totalCreditsUsed: 15,
      },
      storage: {
        used: 100,
        images: 70,
        videos: 20,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 12,
      },
    });

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });
  });

  it('should display recent activity section', () => {
    (getUsageHistory as any).mockReturnValue([]);

    render(<AnalyticsDashboard />);
    const activityLabels = screen.getAllByText(/กิจกรรมล่าสุด/i);
    expect(activityLabels.length).toBeGreaterThan(0);
  });

  it('should show empty state when no activity', () => {
    (getUsageHistory as any).mockReturnValue([]);

    render(<AnalyticsDashboard />);
    const emptyTexts = screen.getAllByText(/ยังไม่มีกิจกรรม/i);
    expect(emptyTexts.length).toBeGreaterThan(0);
  });

  it('should display activity entries', () => {
    (getUsageHistory as any).mockReturnValue([
      {
        type: 'image',
        provider: 'ComfyUI',
        success: true,
        timestamp: new Date('2024-01-15T10:00:00Z'),
        credits: 2,
      },
      {
        type: 'video',
        provider: 'Replicate',
        success: true,
        timestamp: new Date('2024-01-15T11:00:00Z'),
        credits: 5,
      },
    ]);

    render(<AnalyticsDashboard />);
    const successTexts = screen.getAllByText(/สำเร็จ/i);
    expect(successTexts.length).toBeGreaterThan(0);
  });

  it('should display failed activity entries', () => {
    (getUsageHistory as any).mockReturnValue([
      {
        type: 'image',
        provider: 'FLUX',
        success: false,
        timestamp: new Date('2024-01-15T12:00:00Z'),
        credits: 0,
      },
    ]);

    render(<AnalyticsDashboard />);
    const failedTexts = screen.getAllByText(/ล้มเหลว/i);
    expect(failedTexts.length).toBeGreaterThan(0);
  });
});

describe('AnalyticsDashboard - User Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 10,
        failed: 2,
        totalCreditsUsed: 20,
      },
      videos: {
        generated: 5,
        totalDuration: 60,
        totalCreditsUsed: 15,
      },
      storage: {
        used: 100,
        images: 70,
        videos: 20,
        projects: 10,
      },
      projects: {
        total: 2,
      },
      characters: {
        total: 5,
      },
      scenes: {
        total: 15,
      },
      apiCalls: {
        geminiText: 12,
      },
    });

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);
  });

  it('should allow changing time range', () => {
    const { container } = render(<AnalyticsDashboard />);
    const select = container.querySelector('select') as HTMLSelectElement;

    if (select) {
      fireEvent.change(select, { target: { value: '7days' } });
      expect(select.value).toBe('7days');
    }
  });

  it('should have time range options', () => {
    render(<AnalyticsDashboard />);
    const sevenDaysOptions = screen.getAllByText(/7 วันที่แล้ว/i);
    const thirtyDaysOptions = screen.getAllByText(/30 วันที่แล้ว/i);
    const allTimeOptions = screen.getAllByText(/ทั้งหมด/i);

    expect(sevenDaysOptions.length).toBeGreaterThan(0);
    expect(thirtyDaysOptions.length).toBeGreaterThan(0);
    expect(allTimeOptions.length).toBeGreaterThan(0);
  });

  it('should have clickable export button', () => {
    const { container } = render(<AnalyticsDashboard />);
    const buttons = container.querySelectorAll('button');
    const exportButton = Array.from(buttons).find(btn =>
      btn.textContent?.includes('Export ข้อมูล')
    );

    expect(exportButton).toBeTruthy();
  });
});

describe('AnalyticsDashboard - Tier-Specific Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (calculateCostSavings as any).mockReturnValue({
      totalSaved: 0,
    });

    (getUsageHistory as any).mockReturnValue([]);

    (getUsageStats as any).mockReturnValue({
      images: {
        generated: 50,
        failed: 5,
        totalCreditsUsed: 100,
      },
      videos: {
        generated: 20,
        totalDuration: 240,
        totalCreditsUsed: 60,
      },
      storage: {
        used: 500,
        images: 300,
        videos: 150,
        projects: 50,
      },
      projects: {
        total: 10,
      },
      characters: {
        total: 30,
      },
      scenes: {
        total: 100,
      },
      apiCalls: {
        geminiText: 80,
      },
    });
  });

  it('should display FREE tier correctly', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'free',
      features: {
        maxProjects: 1,
        maxCharacters: 3,
        maxScenes: 10,
        storageLimit: 100,
      },
    });

    render(<AnalyticsDashboard />);
    const tierLabels = screen.getAllByText(/FREE/i);
    expect(tierLabels.length).toBeGreaterThan(0);
  });

  it('should display BASIC tier correctly', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      features: {
        maxProjects: 5,
        maxCharacters: 10,
        maxScenes: 50,
        storageLimit: 1000,
      },
    });

    render(<AnalyticsDashboard />);
    const tierLabels = screen.getAllByText(/BASIC/i);
    expect(tierLabels.length).toBeGreaterThan(0);
  });

  it('should display PRO tier correctly', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      features: {
        maxProjects: Infinity,
        maxCharacters: Infinity,
        maxScenes: Infinity,
        storageLimit: Infinity,
      },
    });

    render(<AnalyticsDashboard />);
    const tierLabels = screen.getAllByText(/PRO/i);
    expect(tierLabels.length).toBeGreaterThan(0);
  });

  it('should show infinity symbol for unlimited features', () => {
    (getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      features: {
        maxProjects: Infinity,
        maxCharacters: Infinity,
        maxScenes: Infinity,
        storageLimit: Infinity,
      },
    });

    render(<AnalyticsDashboard />);
    const infinitySymbols = screen.getAllByText(/∞/);
    expect(infinitySymbols.length).toBeGreaterThan(0);
  });
});
