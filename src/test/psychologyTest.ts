/**
 * Psychology System Test
 * This file demonstrates and tests the psychology calculation system
 */

import type { Character } from '../types';
import {
  calculatePsychologyProfile,
  calculateReaction,
  formatPsychologyForPrompt,
} from '../services/psychologyCalculator';

// Test Character 1: High Consciousness (Virtuous Monk)
const virtuousMonk: Character = {
  id: 'test-monk-01',
  name: 'พระอรุณ',
  role: 'Protagonist (Main)',
  description: 'A wise and compassionate monk',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {
      'Mindfulness (remembrance)': 95,
      'Wisdom (right view)': 90,
      'Faith (Belief in the right)': 92,
      'Hiri (Shame of sin)': 88,
      'Karuna (Compassion, knowing suffering)': 98,
      'Mudita (Joy in happiness)': 85,
    },
    subconscious: {
      Attachment: 'Minimal attachment to worldly things',
      Taanha: 'Craving for enlightenment only',
    },
    defilement: {
      'Lobha (Greed)': 5,
      'Anger (Anger)': 8,
      'Moha (delusion)': 10,
      'Mana (arrogance)': 12,
      'Titthi (obsession)': 7,
      'Vicikiccha (doubt)': 6,
      'Thina (depression)': 5,
      'Uthachcha (distraction)': 9,
      'Ahirika (shamelessness)': 3,
      'Amodtappa (fearlessness of sin)': 4,
    },
  },
  goals: {
    objective: 'Guide others to enlightenment',
    need: 'To help suffering beings',
    action: 'Teach and practice Dhamma',
    conflict: 'Worldly temptations',
    backstory: 'Former businessman who renounced everything',
  },
};

// Test Character 2: High Defilement (Corrupt Politician)
const corruptPolitician: Character = {
  id: 'test-politician-01',
  name: 'นายพลอุดม',
  role: 'Antagonist (Main)',
  description: 'A greedy and power-hungry politician',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {
      'Mindfulness (remembrance)': 15,
      'Wisdom (right view)': 20,
      'Faith (Belief in the right)': 10,
      'Hiri (Shame of sin)': 12,
      'Karuna (Compassion, knowing suffering)': 18,
      'Mudita (Joy in happiness)': 22,
    },
    subconscious: {
      Attachment: 'Extreme attachment to power and wealth',
      Taanha: 'Insatiable desire for more',
    },
    defilement: {
      'Lobha (Greed)': 95,
      'Anger (Anger)': 78,
      'Moha (delusion)': 82,
      'Mana (arrogance)': 92,
      'Titthi (obsession)': 88,
      'Vicikiccha (doubt)': 45,
      'Thina (depression)': 35,
      'Uthachcha (distraction)': 70,
      'Ahirika (shamelessness)': 90,
      'Amodtappa (fearlessness of sin)': 88,
    },
  },
  goals: {
    objective: 'Gain absolute power',
    need: 'To control others',
    action: 'Manipulate and exploit',
    conflict: 'Moral opposition',
    backstory: 'Rose through corruption and betrayal',
  },
};

// Run tests
export function runPsychologyTests() {
  console.log('=== PEACE SCRIPT PSYCHOLOGY SYSTEM TEST ===\n');

  // Test 1: Profile Calculation
  console.log('TEST 1: Psychology Profile Calculation\n');

  const monkProfile = calculatePsychologyProfile(virtuousMonk);
  console.log('พระอรุณ (Virtuous Monk):');
  console.log(`  Consciousness Score: ${monkProfile.consciousnessScore.toFixed(1)}/100`);
  console.log(`  Defilement Score: ${monkProfile.defilementScore.toFixed(1)}/100`);
  console.log(`  Mental Balance: ${monkProfile.mentalBalance.toFixed(1)}`);
  console.log(`  Dominant Emotion: ${monkProfile.dominantEmotion}`);
  console.log(`  Strongest Virtue: ${monkProfile.strongestVirtue}`);
  console.log(`  Personality: ${monkProfile.personalityDescription}`);
  console.log('');

  const politicianProfile = calculatePsychologyProfile(corruptPolitician);
  console.log('นายพลอุดม (Corrupt Politician):');
  console.log(`  Consciousness Score: ${politicianProfile.consciousnessScore.toFixed(1)}/100`);
  console.log(`  Defilement Score: ${politicianProfile.defilementScore.toFixed(1)}/100`);
  console.log(`  Mental Balance: ${politicianProfile.mentalBalance.toFixed(1)}`);
  console.log(`  Dominant Emotion: ${politicianProfile.dominantEmotion}`);
  console.log(`  Strongest Defilement: ${politicianProfile.strongestDefilement}`);
  console.log(`  Personality: ${politicianProfile.personalityDescription}`);
  console.log('\n---\n');

  // Test 2: Reaction Calculation
  console.log('TEST 2: Reaction to Same Event\n');

  const testEvent = 'Someone insults you publicly and tries to provoke a fight';
  const eventIntensity = 8; // High intensity event

  console.log(`Event: "${testEvent}" (Intensity: ${eventIntensity}/10)\n`);

  const monkReaction = calculateReaction(virtuousMonk, testEvent, eventIntensity);
  console.log('พระอรุณ Reaction:');
  console.log(`  Type: ${monkReaction.reactionType}`);
  console.log(`  Emotional Tone: ${monkReaction.emotionalTone}`);
  console.log(`  Intensity: ${monkReaction.intensity.toFixed(1)}/100`);
  console.log(`  Reasoning: ${monkReaction.reasoning}`);
  console.log('');

  const politicianReaction = calculateReaction(corruptPolitician, testEvent, eventIntensity);
  console.log('นายพลอุดม Reaction:');
  console.log(`  Type: ${politicianReaction.reactionType}`);
  console.log(`  Emotional Tone: ${politicianReaction.emotionalTone}`);
  console.log(`  Intensity: ${politicianReaction.intensity.toFixed(1)}/100`);
  console.log(`  Reasoning: ${politicianReaction.reasoning}`);
  console.log('\n---\n');

  // Test 3: AI Prompt Formatting
  console.log('TEST 3: AI Prompt Formatting\n');

  console.log('พระอรุณ AI Prompt:');
  console.log(formatPsychologyForPrompt(virtuousMonk));
  console.log('\n---\n');

  console.log('นายพลอุดม AI Prompt:');
  console.log(formatPsychologyForPrompt(corruptPolitician));
  console.log('\n---\n');

  // Test 4: Comparison Summary
  console.log('TEST 4: Character Comparison Summary\n');
  console.log('When insulted publicly:');
  console.log(`  - พระอรุณ: ${monkReaction.emotionalTone} (${monkReaction.reactionType})`);
  console.log(
    `  - นายพลอุดม: ${politicianReaction.emotionalTone} (${politicianReaction.reactionType})`
  );
  console.log('');
  console.log('This demonstrates that characters with different psychology profiles');
  console.log('will react VERY differently to the same situation!');
  console.log('\n=== TEST COMPLETE ===');

  return {
    monk: { profile: monkProfile, reaction: monkReaction },
    politician: { profile: politicianProfile, reaction: politicianReaction },
  };
}

// Export test characters for use in actual scenes
export { virtuousMonk, corruptPolitician };
