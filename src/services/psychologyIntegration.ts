/**
 * Psychology Integration Service
 * Integrates psychologyEvolution with scene generation workflow
 */

import type { ScriptData, PlotPoint, GeneratedScene, Character } from '../types';
import {
  updatePsychologyTimeline,
  initializePsychologyTimeline,
  validateCharacterArc,
} from './psychologyEvolution';

/**
 * Initialize psychology timelines for all characters in a project
 */
export function initializeProjectPsychology(scriptData: ScriptData): ScriptData {
  const psychologyTimelines: Record<string, any> = {};

  scriptData.characters.forEach(character => {
    psychologyTimelines[character.id] = initializePsychologyTimeline(character);
  });

  return {
    ...scriptData,
    psychologyTimelines,
  };
}

/**
 * Update character psychology after scene generation
 * Returns updated scriptData with modified characters and timelines
 */
export function updatePsychologyAfterScene(
  scriptData: ScriptData,
  scene: GeneratedScene,
  plotPoint: PlotPoint
): ScriptData {
  // Initialize timelines if not exists
  if (!scriptData.psychologyTimelines) {
    scriptData = initializeProjectPsychology(scriptData);
  }

  const updatedCharacters: Character[] = [...scriptData.characters];
  const updatedTimelines = { ...scriptData.psychologyTimelines };

  // Update psychology for each character that appears in the scene
  scene.sceneDesign.characters.forEach(characterName => {
    const characterIndex = updatedCharacters.findIndex(c => c.name === characterName);
    if (characterIndex === -1) return; // Character not found

    const character = updatedCharacters[characterIndex];
    const timeline = updatedTimelines[character.id] || initializePsychologyTimeline(character);

    // Update timeline and get updated character
    const { timeline: newTimeline, updatedCharacter } = updatePsychologyTimeline(
      timeline,
      character,
      scene,
      plotPoint.title
    );

    // Replace character and timeline
    updatedCharacters[characterIndex] = updatedCharacter;
    updatedTimelines[character.id] = newTimeline;

    console.log(`📊 Psychology updated for ${character.name} in Scene ${scene.sceneNumber}`);
    console.log(`   Change: ${newTimeline.changes[newTimeline.changes.length - 1].reasoning}`);
  });

  return {
    ...scriptData,
    characters: updatedCharacters,
    psychologyTimelines: updatedTimelines,
  };
}

/**
 * Validate all character arcs in the project
 * Call this after all scenes are generated
 */
export function validateProjectPsychology(scriptData: ScriptData): {
  valid: boolean;
  characterResults: Record<
    string,
    {
      characterName: string;
      valid: boolean;
      warnings: string[];
      recommendations: string[];
    }
  >;
  overallSummary: string;
} {
  const characterResults: Record<string, any> = {};
  let totalWarnings = 0;

  if (!scriptData.psychologyTimelines) {
    return {
      valid: false,
      characterResults: {},
      overallSummary: 'ยังไม่มีข้อมูล Psychology Timeline',
    };
  }

  Object.entries(scriptData.psychologyTimelines).forEach(([charId, timeline]: [string, any]) => {
    const validation = validateCharacterArc(timeline);
    characterResults[charId] = {
      characterName: timeline.characterName,
      ...validation,
    };
    totalWarnings += validation.warnings.length;
  });

  const valid = totalWarnings === 0;
  const overallSummary = valid
    ? '✅ ตัวละครทุกตัวมีการพัฒนาที่สอดคล้องกับหลักธรรม'
    : `⚠️ พบข้อควรปรับปรุง ${totalWarnings} จุด ในการพัฒนาตัวละคร`;

  return {
    valid,
    characterResults,
    overallSummary,
  };
}

/**
 * Get psychology summary for display
 */
export function getPsychologySummary(scriptData: ScriptData): string {
  if (!scriptData.psychologyTimelines) {
    return 'ยังไม่มีข้อมูลการพัฒนาตัวละคร';
  }

  const summaries: string[] = [];

  Object.values(scriptData.psychologyTimelines).forEach((timeline: any) => {
    const { characterName, overallArc } = timeline;
    summaries.push(
      `**${characterName}**: ${overallArc.direction} (${overallArc.totalChange > 0 ? '+' : ''}${overallArc.totalChange.toFixed(1)} คะแนน)\n` +
        `${overallArc.interpretation}`
    );
  });

  return summaries.join('\n\n');
}
