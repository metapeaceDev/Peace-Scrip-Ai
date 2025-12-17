/**
 * Subscription Manager Tests
 * Tests for subscription plans, quotas, and feature access
 */

import { describe, it, expect } from 'vitest';
import { SUBSCRIPTION_PLANS, getPlansComparison } from '../subscriptionManager';
import type { SubscriptionTier } from '../../../types';

describe('subscriptionManager', () => {
  describe('SUBSCRIPTION_PLANS constant', () => {
    it('should have all 4 subscription tiers', () => {
      expect(Object.keys(SUBSCRIPTION_PLANS).length).toBe(4);
      expect(SUBSCRIPTION_PLANS).toHaveProperty('free');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('basic');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('pro');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('enterprise');
    });

    it('should have correct tier values', () => {
      expect(SUBSCRIPTION_PLANS.free.tier).toBe('free');
      expect(SUBSCRIPTION_PLANS.basic.tier).toBe('basic');
      expect(SUBSCRIPTION_PLANS.pro.tier).toBe('pro');
      expect(SUBSCRIPTION_PLANS.enterprise.tier).toBe('enterprise');
    });

    it('should have increasing credit limits', () => {
      expect(SUBSCRIPTION_PLANS.free.credits).toBe(20);       // อัพเดตจาก 30 → 20
      expect(SUBSCRIPTION_PLANS.basic.credits).toBe(150);
      expect(SUBSCRIPTION_PLANS.pro.credits).toBe(600);        // อัพเดตจาก 500 → 600
      expect(SUBSCRIPTION_PLANS.enterprise.credits).toBe(-1); // Unlimited
    });

    it('should have all required properties', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan).toHaveProperty('tier');
        expect(plan).toHaveProperty('credits');
        expect(plan).toHaveProperty('maxCredits');
        expect(plan).toHaveProperty('features');
      });
    });

    it('should have credits equal to maxCredits', () => {
      expect(SUBSCRIPTION_PLANS.free.credits).toBe(SUBSCRIPTION_PLANS.free.maxCredits);
      expect(SUBSCRIPTION_PLANS.basic.credits).toBe(SUBSCRIPTION_PLANS.basic.maxCredits);
      expect(SUBSCRIPTION_PLANS.pro.credits).toBe(SUBSCRIPTION_PLANS.pro.maxCredits);
      expect(SUBSCRIPTION_PLANS.enterprise.credits).toBe(SUBSCRIPTION_PLANS.enterprise.maxCredits);
    });
  });

  describe('Free Tier', () => {
    const freePlan = SUBSCRIPTION_PLANS.free;

    it('should have limited credits', () => {
      expect(freePlan.credits).toBe(30);
      expect(freePlan.maxCredits).toBe(30);
    });

    it('should have basic resolution', () => {
      expect(freePlan.features.maxResolution).toBe('512x512');
    });

    it('should have limited image models', () => {
      expect(freePlan.features.allowedImageModels).toContain('gemini-2.0');
      expect(freePlan.features.allowedImageModels.length).toBe(1);
    });

    it('should not allow video generation', () => {
      expect(freePlan.features.allowedVideoModels).toEqual([]);
      expect(freePlan.features.videoDurationLimit).toBe(0);
    });

    it('should have minimal storage', () => {
      expect(freePlan.features.storageLimit).toBe(0.1); // 100MB
    });

    it('should allow 1 project only', () => {
      expect(freePlan.features.maxProjects).toBe(1);
    });

    it('should have limited characters and scenes', () => {
      expect(freePlan.features.maxCharacters).toBe(3);
      expect(freePlan.features.maxScenes).toBe(10);
    });

    it('should allow only PDF export', () => {
      expect(freePlan.features.exportFormats).toEqual(['pdf']);
    });
  });

  describe('Basic Tier', () => {
    const basicPlan = SUBSCRIPTION_PLANS.basic;

    it('should have moderate credits', () => {
      expect(basicPlan.credits).toBe(150);
      expect(basicPlan.maxCredits).toBe(150);
    });

    it('should have better resolution', () => {
      expect(basicPlan.features.maxResolution).toBe('2048x2048');
    });

    it('should have more image models', () => {
      expect(basicPlan.features.allowedImageModels).toContain('gemini-2.0');
      expect(basicPlan.features.allowedImageModels).toContain('gemini-2.5');
      expect(basicPlan.features.allowedImageModels.length).toBe(2);
    });

    it('should allow basic video generation', () => {
      expect(basicPlan.features.allowedVideoModels).toContain('replicate-animatediff');
      expect(basicPlan.features.videoDurationLimit).toBe(10);
    });

    it('should have 1GB storage', () => {
      expect(basicPlan.features.storageLimit).toBe(1);
    });

    it('should allow 5 projects', () => {
      expect(basicPlan.features.maxProjects).toBe(5);
    });

    it('should allow 10 characters and 50 scenes', () => {
      expect(basicPlan.features.maxCharacters).toBe(10);
      expect(basicPlan.features.maxScenes).toBe(50);
    });

    it('should allow multiple export formats', () => {
      expect(basicPlan.features.exportFormats).toContain('pdf');
      expect(basicPlan.features.exportFormats).toContain('fdx');
      expect(basicPlan.features.exportFormats).toContain('fountain');
    });
  });

  describe('Pro Tier', () => {
    const proPlan = SUBSCRIPTION_PLANS.pro;

    it('should have substantial credits', () => {
      expect(proPlan.credits).toBe(500);
      expect(proPlan.maxCredits).toBe(500);
    });

    it('should have highest resolution', () => {
      expect(proPlan.features.maxResolution).toBe('4096x4096');
    });

    it('should have all image models', () => {
      expect(proPlan.features.allowedImageModels).toContain('gemini-2.0');
      expect(proPlan.features.allowedImageModels).toContain('gemini-2.5');
      expect(proPlan.features.allowedImageModels).toContain('stable-diffusion');
      expect(proPlan.features.allowedImageModels).toContain('comfyui');
      expect(proPlan.features.allowedImageModels.length).toBe(4);
    });

    it('should allow advanced video generation', () => {
      expect(proPlan.features.allowedVideoModels).toContain('gemini-veo');
      expect(proPlan.features.allowedVideoModels).toContain('comfyui-svd');
      expect(proPlan.features.videoDurationLimit).toBe(120); // 2 minutes
    });

    it('should have 10GB storage', () => {
      expect(proPlan.features.storageLimit).toBe(10);
    });

    it('should allow 20 projects', () => {
      expect(proPlan.features.maxProjects).toBe(20);
    });

    it('should allow 50 characters and 200 scenes', () => {
      expect(proPlan.features.maxCharacters).toBe(50);
      expect(proPlan.features.maxScenes).toBe(200);
    });

    it('should include production package export', () => {
      expect(proPlan.features.exportFormats).toContain('production-package');
    });
  });

  describe('Enterprise Tier', () => {
    const enterprisePlan = SUBSCRIPTION_PLANS.enterprise;

    it('should have unlimited credits', () => {
      expect(enterprisePlan.credits).toBe(-1);
      expect(enterprisePlan.maxCredits).toBe(-1);
    });

    it('should have highest resolution', () => {
      expect(enterprisePlan.features.maxResolution).toBe('4096x4096');
    });

    it('should have all image models', () => {
      expect(enterprisePlan.features.allowedImageModels).toContain('gemini-2.0');
      expect(enterprisePlan.features.allowedImageModels).toContain('gemini-2.5');
      expect(enterprisePlan.features.allowedImageModels).toContain('stable-diffusion');
      expect(enterprisePlan.features.allowedImageModels).toContain('comfyui');
    });

    it('should have unlimited video duration', () => {
      expect(enterprisePlan.features.videoDurationLimit).toBe(-1);
    });

    it('should have unlimited storage', () => {
      expect(enterprisePlan.features.storageLimit).toBe(-1);
    });

    it('should have unlimited projects', () => {
      expect(enterprisePlan.features.maxProjects).toBe(-1);
    });

    it('should have unlimited characters and scenes', () => {
      expect(enterprisePlan.features.maxCharacters).toBe(-1);
      expect(enterprisePlan.features.maxScenes).toBe(-1);
    });

    it('should include white-label export', () => {
      expect(enterprisePlan.features.exportFormats).toContain('white-label');
    });
  });

  describe('Plan Hierarchy', () => {
    it('should have increasing project limits', () => {
      expect(SUBSCRIPTION_PLANS.free.features.maxProjects).toBeLessThan(
        SUBSCRIPTION_PLANS.basic.features.maxProjects
      );
      expect(SUBSCRIPTION_PLANS.basic.features.maxProjects).toBeLessThan(
        SUBSCRIPTION_PLANS.pro.features.maxProjects
      );
    });

    it('should have increasing character limits', () => {
      expect(SUBSCRIPTION_PLANS.free.features.maxCharacters).toBeLessThan(
        SUBSCRIPTION_PLANS.basic.features.maxCharacters
      );
      expect(SUBSCRIPTION_PLANS.basic.features.maxCharacters).toBeLessThan(
        SUBSCRIPTION_PLANS.pro.features.maxCharacters
      );
    });

    it('should have increasing scene limits', () => {
      expect(SUBSCRIPTION_PLANS.free.features.maxScenes).toBeLessThan(
        SUBSCRIPTION_PLANS.basic.features.maxScenes
      );
      expect(SUBSCRIPTION_PLANS.basic.features.maxScenes).toBeLessThan(
        SUBSCRIPTION_PLANS.pro.features.maxScenes
      );
    });

    it('should have increasing storage limits', () => {
      expect(SUBSCRIPTION_PLANS.free.features.storageLimit).toBeLessThan(
        SUBSCRIPTION_PLANS.basic.features.storageLimit
      );
      expect(SUBSCRIPTION_PLANS.basic.features.storageLimit).toBeLessThan(
        SUBSCRIPTION_PLANS.pro.features.storageLimit
      );
    });

    it('should have increasing model access', () => {
      expect(SUBSCRIPTION_PLANS.free.features.allowedImageModels.length).toBeLessThan(
        SUBSCRIPTION_PLANS.basic.features.allowedImageModels.length
      );
      expect(SUBSCRIPTION_PLANS.basic.features.allowedImageModels.length).toBeLessThan(
        SUBSCRIPTION_PLANS.pro.features.allowedImageModels.length
      );
    });
  });

  describe('getPlansComparison', () => {
    it('should return all 4 plans', () => {
      const plans = getPlansComparison();

      expect(plans.length).toBe(4);
    });

    it('should have correct plan order', () => {
      const plans = getPlansComparison();

      expect(plans[0].tier).toBe('free');
      expect(plans[1].tier).toBe('basic');
      expect(plans[2].tier).toBe('pro');
      expect(plans[3].tier).toBe('enterprise');
    });

    it('should have all required properties', () => {
      const plans = getPlansComparison();

      plans.forEach(plan => {
        expect(plan).toHaveProperty('tier');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('features');
      });
    });

    it('should mark basic as recommended', () => {
      const plans = getPlansComparison();
      const basicPlan = plans.find(p => p.tier === 'basic');

      expect(basicPlan?.recommended).toBe(true);
    });

    it('should have pricing information', () => {
      const plans = getPlansComparison();

      expect(plans[0].price).toBe('฿0/เดือน');
      expect(plans[1].price).toBe('฿399/เดือน');
      expect(plans[2].price).toBe('฿999/เดือน');
      expect(plans[3].price).toBe('ติดต่อเรา');
    });

    it('should have feature lists', () => {
      const plans = getPlansComparison();

      plans.forEach(plan => {
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it('should have increasing or equal feature count', () => {
      const plans = getPlansComparison();

      expect(plans[0].features.length).toBeLessThan(plans[1].features.length);
      expect(plans[1].features.length).toBeLessThan(plans[2].features.length);
      // Pro and Enterprise may have same number of features (enterprise adds white-label, same count)
      expect(plans[2].features.length).toBeLessThanOrEqual(plans[3].features.length);
    });
  });

  describe('Feature Access Control', () => {
    it('should allow video only in paid tiers', () => {
      expect(SUBSCRIPTION_PLANS.free.features.allowedVideoModels.length).toBe(0);
      expect(SUBSCRIPTION_PLANS.basic.features.allowedVideoModels.length).toBeGreaterThan(0);
      expect(SUBSCRIPTION_PLANS.pro.features.allowedVideoModels.length).toBeGreaterThan(0);
      expect(SUBSCRIPTION_PLANS.enterprise.features.allowedVideoModels.length).toBeGreaterThan(0);
    });

    it('should allow ComfyUI only in pro and enterprise', () => {
      expect(SUBSCRIPTION_PLANS.free.features.allowedImageModels).not.toContain('comfyui');
      expect(SUBSCRIPTION_PLANS.basic.features.allowedImageModels).not.toContain('comfyui');
      expect(SUBSCRIPTION_PLANS.pro.features.allowedImageModels).toContain('comfyui');
      expect(SUBSCRIPTION_PLANS.enterprise.features.allowedImageModels).toContain('comfyui');
    });

    it('should allow Stable Diffusion only in pro and enterprise', () => {
      expect(SUBSCRIPTION_PLANS.free.features.allowedImageModels).not.toContain('stable-diffusion');
      expect(SUBSCRIPTION_PLANS.basic.features.allowedImageModels).not.toContain(
        'stable-diffusion'
      );
      expect(SUBSCRIPTION_PLANS.pro.features.allowedImageModels).toContain('stable-diffusion');
      expect(SUBSCRIPTION_PLANS.enterprise.features.allowedImageModels).toContain(
        'stable-diffusion'
      );
    });

    it('should allow production package only in pro and enterprise', () => {
      expect(SUBSCRIPTION_PLANS.free.features.exportFormats).not.toContain('production-package');
      expect(SUBSCRIPTION_PLANS.basic.features.exportFormats).not.toContain('production-package');
      expect(SUBSCRIPTION_PLANS.pro.features.exportFormats).toContain('production-package');
      expect(SUBSCRIPTION_PLANS.enterprise.features.exportFormats).toContain('production-package');
    });

    it('should allow white-label only in enterprise', () => {
      expect(SUBSCRIPTION_PLANS.free.features.exportFormats).not.toContain('white-label');
      expect(SUBSCRIPTION_PLANS.basic.features.exportFormats).not.toContain('white-label');
      expect(SUBSCRIPTION_PLANS.pro.features.exportFormats).not.toContain('white-label');
      expect(SUBSCRIPTION_PLANS.enterprise.features.exportFormats).toContain('white-label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unlimited values consistently', () => {
      const enterprise = SUBSCRIPTION_PLANS.enterprise;

      expect(enterprise.credits).toBe(-1);
      expect(enterprise.features.videoDurationLimit).toBe(-1);
      expect(enterprise.features.storageLimit).toBe(-1);
      expect(enterprise.features.maxProjects).toBe(-1);
      expect(enterprise.features.maxCharacters).toBe(-1);
      expect(enterprise.features.maxScenes).toBe(-1);
    });

    it('should have positive values for limited plans', () => {
      const tiers: SubscriptionTier[] = ['free', 'basic', 'pro'];

      tiers.forEach(tier => {
        const plan = SUBSCRIPTION_PLANS[tier];
        expect(plan.credits).toBeGreaterThan(0);
        expect(plan.features.storageLimit).toBeGreaterThan(0);
        expect(plan.features.maxProjects).toBeGreaterThan(0);
        expect(plan.features.maxCharacters).toBeGreaterThan(0);
        expect(plan.features.maxScenes).toBeGreaterThan(0);
      });
    });

    it('should have all tiers with at least one image model', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan.features.allowedImageModels.length).toBeGreaterThan(0);
      });
    });

    it('should have all tiers with at least one export format', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan.features.exportFormats.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should support quota checking workflow', () => {
      const checkQuota = (tier: SubscriptionTier, usage: number): boolean => {
        const plan = SUBSCRIPTION_PLANS[tier];
        if (plan.maxCredits === -1) return true; // Unlimited
        return usage <= plan.maxCredits;
      };

      expect(checkQuota('free', 5)).toBe(true);
      expect(checkQuota('free', 15)).toBe(false);
      expect(checkQuota('enterprise', 100000)).toBe(true);
    });

    it('should support feature access checking', () => {
      const hasFeature = (tier: SubscriptionTier, model: string): boolean => {
        const plan = SUBSCRIPTION_PLANS[tier];
        return plan.features.allowedImageModels.includes(model);
      };

      expect(hasFeature('free', 'gemini-2.0')).toBe(true);
      expect(hasFeature('free', 'comfyui')).toBe(false);
      expect(hasFeature('pro', 'comfyui')).toBe(true);
    });

    it('should support upgrade path determination', () => {
      const tierOrder: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];

      const canUpgrade = (currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean => {
        return tierOrder.indexOf(targetTier) > tierOrder.indexOf(currentTier);
      };

      expect(canUpgrade('free', 'basic')).toBe(true);
      expect(canUpgrade('pro', 'basic')).toBe(false);
      expect(canUpgrade('basic', 'enterprise')).toBe(true);
    });
  });
});
