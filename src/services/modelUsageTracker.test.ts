import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordGeneration } from './modelUsageTracker';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    fromDate: (date: Date) => date,
    now: () => new Date(),
  },
  doc: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  db: {},
}));

describe('modelUsageTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record generation and check budget', async () => {
    // Mock getDocs for budget check (first call for generations, second for alerts)
    const mockGenerations = [
      { data: () => ({ costInTHB: 100 }) },
      { data: () => ({ costInTHB: 450 }) }, // Total 550 > 500
    ];
    
    const mockAlerts: any[] = []; // No alerts yet

    (getDocs as any)
      .mockResolvedValueOnce({
        forEach: (cb: any) => mockGenerations.forEach(cb),
      })
      .mockResolvedValueOnce({
        empty: true,
        forEach: (cb: any) => mockAlerts.forEach(cb),
      });

    await recordGeneration({
      userId: 'test-user',
      type: 'text',
      modelId: 'gemini-1.5-flash',
      modelName: 'Gemini Flash',
      provider: 'google',
      costInCredits: 1,
      costInTHB: 10, // This triggers the check
      success: true,
      metadata: {
        tokens: { input: 100, output: 50 }
      }
    });

    // Verify generation was recorded
    expect(addDoc).toHaveBeenCalledWith(
      undefined, // collection result (mocked as undefined)
      expect.objectContaining({
        userId: 'test-user',
        costInTHB: 10,
        metadata: expect.objectContaining({
          tokens: { input: 100, output: 50 }
        })
      })
    );

    // Verify budget alert was created (since 550 > 500)
    // Note: recordGeneration calls checkGlobalDailyBudget without awaiting, 
    // so we might need to wait a bit or ensure the promise resolves.
    // However, in the implementation it's .catch(), so it runs. 
    // Since we mocked getDocs, it should run synchronously enough for the test or we wait.
    
    // We need to wait for the async operation in recordGeneration to complete.
    // Since checkGlobalDailyBudget is not awaited in recordGeneration, this is tricky.
    // But for this test, we can assume the mocks are fast enough or we can spy on console.warn
    
    // Actually, let's verify that addDoc was called TWICE.
    // 1. For 'generations'
    // 2. For 'system_alerts'
    
    // We might need a small delay to allow the un-awaited promise to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(addDoc).toHaveBeenCalledTimes(2);
    
    // Check the second call (alert)
    expect(addDoc).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({
        type: 'budget_exceeded',
        threshold: 500
      })
    );
  });

  it('should NOT create alert if budget is under limit', async () => {
    const mockGenerations = [
      { data: () => ({ costInTHB: 100 }) },
      { data: () => ({ costInTHB: 200 }) }, // Total 300 < 500
    ];

    (getDocs as any).mockResolvedValueOnce({
      forEach: (cb: any) => mockGenerations.forEach(cb),
    });

    await recordGeneration({
      userId: 'test-user',
      type: 'text',
      modelId: 'gemini-1.5-flash',
      modelName: 'Gemini Flash',
      provider: 'google',
      costInCredits: 1,
      costInTHB: 10,
      success: true,
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only be called once for the generation record
    expect(addDoc).toHaveBeenCalledTimes(1);
  });
});

