import { describe, it, expect, beforeEach } from 'vitest';
import { getUserSubscription, setUserTier, deductCredits, hasAccessToModel } from '../userStore';
import type { SubscriptionTier } from '../../../types';

describe('userStore', () => {
  beforeEach(() => {
    // Reset to free tier before each test
    setUserTier('free');
  });

  describe('getUserSubscription', () => {
    it('should return free tier by default', () => {
      const subscription = getUserSubscription();

      expect(subscription.tier).toBe('free');
      expect(subscription.credits).toBe(0);
      expect(subscription.maxCredits).toBe(0);
    });

    it('should return current user subscription state', () => {
      setUserTier('pro');

      const subscription = getUserSubscription();

      expect(subscription.tier).toBe('pro');
      expect(subscription.credits).toBe(500);
    });
  });

  describe('setUserTier', () => {
    it('should update user to basic tier', () => {
      setUserTier('basic');

      const subscription = getUserSubscription();
      expect(subscription.tier).toBe('basic');
      expect(subscription.credits).toBe(100);
      expect(subscription.maxCredits).toBe(100);
    });

    it('should update user to pro tier', () => {
      setUserTier('pro');

      const subscription = getUserSubscription();
      expect(subscription.tier).toBe('pro');
      expect(subscription.credits).toBe(500);
      expect(subscription.maxCredits).toBe(500);
    });

    it('should update user to enterprise tier', () => {
      setUserTier('enterprise');

      const subscription = getUserSubscription();
      expect(subscription.tier).toBe('enterprise');
      expect(subscription.credits).toBe(9999);
      expect(subscription.maxCredits).toBe(9999);
    });

    it('should reset user to free tier', () => {
      setUserTier('pro');
      setUserTier('free');

      const subscription = getUserSubscription();
      expect(subscription.tier).toBe('free');
      expect(subscription.credits).toBe(0);
    });

    it('should persist tier across multiple calls', () => {
      setUserTier('basic');
      const sub1 = getUserSubscription();
      const sub2 = getUserSubscription();

      expect(sub1.tier).toBe('basic');
      expect(sub2.tier).toBe('basic');
      expect(sub1).toEqual(sub2);
    });
  });

  describe('deductCredits', () => {
    it('should always return true for free tier without deducting', () => {
      setUserTier('free');

      const result = deductCredits(100);

      expect(result).toBe(true);
      expect(getUserSubscription().credits).toBe(0); // Still 0
    });

    it('should deduct credits from basic tier', () => {
      setUserTier('basic');
      const initialCredits = getUserSubscription().credits;

      const result = deductCredits(30);

      expect(result).toBe(true);
      expect(getUserSubscription().credits).toBe(initialCredits - 30);
    });

    it('should deduct credits from pro tier', () => {
      setUserTier('pro');

      const result = deductCredits(100);

      expect(result).toBe(true);
      expect(getUserSubscription().credits).toBe(400);
    });

    it('should return false when insufficient credits', () => {
      setUserTier('basic'); // 100 credits
      const initialCredits = getUserSubscription().credits;

      const result = deductCredits(200);

      expect(result).toBe(false);
      expect(getUserSubscription().credits).toBe(initialCredits); // No deduction
    });

    it('should allow exact credit amount deduction', () => {
      setUserTier('basic'); // 100 credits
      const exactAmount = getUserSubscription().credits;

      const result = deductCredits(exactAmount);

      expect(result).toBe(true);
      expect(getUserSubscription().credits).toBe(0);
    });

    it('should handle multiple deductions', () => {
      setUserTier('pro'); // Reset to fresh pro credits
      const initialCredits = getUserSubscription().credits;

      expect(deductCredits(100)).toBe(true);
      expect(getUserSubscription().credits).toBe(initialCredits - 100);

      expect(deductCredits(150)).toBe(true);
      expect(getUserSubscription().credits).toBe(initialCredits - 250);

      const remaining = getUserSubscription().credits;
      expect(deductCredits(remaining)).toBe(true);
      expect(getUserSubscription().credits).toBe(0);

      expect(deductCredits(1)).toBe(false); // Insufficient
    });

    it('should prevent negative credits', () => {
      setUserTier('enterprise'); // Use enterprise with high credits
      const initialCredits = getUserSubscription().credits;

      deductCredits(50);
      const afterFirst = initialCredits - 50;
      const result = deductCredits(initialCredits); // Need more than we have

      expect(result).toBe(false);
      expect(getUserSubscription().credits).toBe(afterFirst); // Unchanged
    });
  });

  describe('hasAccessToModel', () => {
    describe('Free tier', () => {
      beforeEach(() => {
        setUserTier('free');
      });

      it('should allow pollinations image model', () => {
        expect(hasAccessToModel('pollinations', 'image')).toBe(true);
      });

      it('should allow comfyui-sdxl image model', () => {
        expect(hasAccessToModel('comfyui-sdxl', 'image')).toBe(true);
      });

      it('should allow gemini-flash image model', () => {
        expect(hasAccessToModel('gemini-flash', 'image')).toBe(true);
      });

      it('should not allow gemini-pro image model', () => {
        expect(hasAccessToModel('gemini-pro', 'image')).toBe(false);
      });

      it('should not allow comfyui-flux image model', () => {
        expect(hasAccessToModel('comfyui-flux', 'image')).toBe(false);
      });

      it('should allow comfyui-svd video model', () => {
        expect(hasAccessToModel('comfyui-svd', 'video')).toBe(true);
      });

      it('should allow pollinations-video model', () => {
        expect(hasAccessToModel('pollinations-video', 'video')).toBe(true);
      });

      it('should not allow runway-gen3 video model', () => {
        expect(hasAccessToModel('runway-gen3', 'video')).toBe(false);
      });

      it('should always allow auto selection', () => {
        expect(hasAccessToModel('auto', 'image')).toBe(true);
        expect(hasAccessToModel('auto', 'video')).toBe(true);
      });
    });

    describe('Basic tier', () => {
      beforeEach(() => {
        setUserTier('basic');
      });

      it('should allow gemini-pro image model', () => {
        expect(hasAccessToModel('gemini-pro', 'image')).toBe(true);
      });

      it('should allow gemini-veo video model', () => {
        expect(hasAccessToModel('gemini-veo', 'video')).toBe(true);
      });

      it('should not allow comfyui-flux image model', () => {
        expect(hasAccessToModel('comfyui-flux', 'image')).toBe(false);
      });

      it('should not allow runway-gen3 video model', () => {
        expect(hasAccessToModel('runway-gen3', 'video')).toBe(false);
      });

      it('should inherit all free tier models', () => {
        expect(hasAccessToModel('pollinations', 'image')).toBe(true);
        expect(hasAccessToModel('comfyui-sdxl', 'image')).toBe(true);
        expect(hasAccessToModel('comfyui-svd', 'video')).toBe(true);
      });
    });

    describe('Pro tier', () => {
      beforeEach(() => {
        setUserTier('pro');
      });

      it('should allow comfyui-flux image model', () => {
        expect(hasAccessToModel('comfyui-flux', 'image')).toBe(true);
      });

      it('should allow openai-dalle image model', () => {
        expect(hasAccessToModel('openai-dalle', 'image')).toBe(true);
      });

      it('should allow runway-gen3 video model', () => {
        expect(hasAccessToModel('runway-gen3', 'video')).toBe(true);
      });

      it('should allow luma-dream-machine video model', () => {
        expect(hasAccessToModel('luma-dream-machine', 'video')).toBe(true);
      });

      it('should have all basic tier models', () => {
        expect(hasAccessToModel('gemini-pro', 'image')).toBe(true);
        expect(hasAccessToModel('gemini-veo', 'video')).toBe(true);
      });
    });

    describe('Enterprise tier', () => {
      beforeEach(() => {
        setUserTier('enterprise');
      });

      it('should have same models as pro tier for images', () => {
        expect(hasAccessToModel('comfyui-flux', 'image')).toBe(true);
        expect(hasAccessToModel('openai-dalle', 'image')).toBe(true);
        expect(hasAccessToModel('pollinations', 'image')).toBe(true);
      });

      it('should have same models as pro tier for videos', () => {
        expect(hasAccessToModel('runway-gen3', 'video')).toBe(true);
        expect(hasAccessToModel('luma-dream-machine', 'video')).toBe(true);
        expect(hasAccessToModel('gemini-veo', 'video')).toBe(true);
      });
    });
  });

  describe('Subscription Features', () => {
    it('should have correct free tier features', () => {
      setUserTier('free');
      const sub = getUserSubscription();

      expect(sub.features.maxResolution).toBe('1024x1024');
      expect(sub.features.videoDurationLimit).toBe(3);
      expect(sub.features.storageLimit).toBe(0.5);
      expect(sub.features.maxProjects).toBe(1);
      expect(sub.features.maxCharacters).toBe(3);
      expect(sub.features.maxScenes).toBe(9);
      expect(sub.features.exportFormats).toEqual(['pdf-watermark']);
    });

    it('should have correct basic tier features', () => {
      setUserTier('basic');
      const sub = getUserSubscription();

      expect(sub.features.maxResolution).toBe('2048x2048');
      expect(sub.features.videoDurationLimit).toBe(4);
      expect(sub.features.storageLimit).toBe(1);
      expect(sub.features.maxProjects).toBe(5);
      expect(sub.features.maxCharacters).toBe(10);
      expect(sub.features.maxScenes).toBe(-1); // Unlimited
      expect(sub.features.exportFormats).toContain('pdf');
      expect(sub.features.exportFormats).toContain('fdx');
      expect(sub.features.exportFormats).toContain('fountain');
    });

    it('should have correct pro tier features', () => {
      setUserTier('pro');
      const sub = getUserSubscription();

      expect(sub.features.maxResolution).toBe('4096x4096');
      expect(sub.features.videoDurationLimit).toBe(10);
      expect(sub.features.storageLimit).toBe(10);
      expect(sub.features.maxProjects).toBe(-1); // Unlimited
      expect(sub.features.maxCharacters).toBe(-1); // Unlimited
      expect(sub.features.maxScenes).toBe(-1); // Unlimited
      expect(sub.features.exportFormats).toContain('production-package');
    });

    it('should have correct enterprise tier features', () => {
      setUserTier('enterprise');
      const sub = getUserSubscription();

      expect(sub.features.maxResolution).toBe('4096x4096');
      expect(sub.features.videoDurationLimit).toBe(60);
      expect(sub.features.storageLimit).toBe(100);
      expect(sub.features.maxProjects).toBe(-1); // Unlimited
      expect(sub.features.exportFormats).toContain('white-label');
    });

    it('should have increasing image model access across tiers', () => {
      setUserTier('free');
      const freeModels = getUserSubscription().features.allowedImageModels.length;

      setUserTier('basic');
      const basicModels = getUserSubscription().features.allowedImageModels.length;

      setUserTier('pro');
      const proModels = getUserSubscription().features.allowedImageModels.length;

      expect(basicModels).toBeGreaterThan(freeModels);
      expect(proModels).toBeGreaterThan(basicModels);
    });

    it('should have increasing video model access across tiers', () => {
      setUserTier('free');
      const freeModels = getUserSubscription().features.allowedVideoModels.length;

      setUserTier('basic');
      const basicModels = getUserSubscription().features.allowedVideoModels.length;

      setUserTier('pro');
      const proModels = getUserSubscription().features.allowedVideoModels.length;

      expect(basicModels).toBeGreaterThan(freeModels);
      expect(proModels).toBeGreaterThan(basicModels);
    });
  });

  describe('Integration - User workflow', () => {
    it('should handle free user generating images', () => {
      setUserTier('free');

      // Free user can generate images without credits
      expect(deductCredits(10)).toBe(true);
      expect(getUserSubscription().credits).toBe(0);

      // But has limited model access
      expect(hasAccessToModel('pollinations', 'image')).toBe(true);
      expect(hasAccessToModel('comfyui-flux', 'image')).toBe(false);
    });

    it('should handle basic user lifecycle', () => {
      setUserTier('enterprise'); // Use enterprise for reliable credit testing
      const initial = getUserSubscription();
      const startingCredits = initial.credits;

      expect(startingCredits).toBeGreaterThan(0);

      // Switch to basic to test model access
      setUserTier('basic');
      expect(hasAccessToModel('gemini-pro', 'image')).toBe(true);

      // Switch back to enterprise for credit testing
      setUserTier('enterprise');
      const creditsBeforeDeduct = getUserSubscription().credits;

      deductCredits(30);
      expect(getUserSubscription().credits).toBe(creditsBeforeDeduct - 30);

      deductCredits(50);
      expect(getUserSubscription().credits).toBe(creditsBeforeDeduct - 80);
    });

    it('should handle tier upgrade workflow', () => {
      // Start as free
      setUserTier('free');
      expect(hasAccessToModel('comfyui-flux', 'image')).toBe(false);

      // Upgrade to pro
      setUserTier('pro');
      expect(getUserSubscription().tier).toBe('pro');
      expect(hasAccessToModel('comfyui-flux', 'image')).toBe(true);
      expect(hasAccessToModel('runway-gen3', 'video')).toBe(true);
    });

    it('should handle tier downgrade workflow', () => {
      // Start as pro
      setUserTier('pro');
      expect(getUserSubscription().tier).toBe('pro');

      // Downgrade to basic
      setUserTier('basic');
      expect(getUserSubscription().tier).toBe('basic');
      // Basic has less models than pro
      expect(hasAccessToModel('comfyui-flux', 'image')).toBe(false);
      expect(hasAccessToModel('gemini-pro', 'image')).toBe(true);
    });

    it('should handle enterprise user with high credit usage', () => {
      setUserTier('enterprise');
      const startingCredits = getUserSubscription().credits;

      expect(startingCredits).toBeGreaterThan(1000); // Enterprise has high credits

      // Heavy usage
      deductCredits(1000);
      expect(getUserSubscription().credits).toBe(startingCredits - 1000);

      deductCredits(2000);
      expect(getUserSubscription().credits).toBe(startingCredits - 3000);
    });
  });
});
