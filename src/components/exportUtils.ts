/**
 * Export Utilities for Step5Output
 * Functions to generate screenplay, shot list CSV, and storyboard HTML
 */

import type { ScriptData } from '../../types';

/**
 * Safely render any value to string
 */
export const safeRender = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Flatten object to string to prevent React crash
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Center text for screenplay output
 */
const centerText = (text: string, width: number): string => {
  if (text.length >= width) return text;
  const leftPad = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPad) + text;
};

/**
 * Generate screenplay text in standard format
 */
export const generateScreenplayText = (data: ScriptData): string => {
  let output = '';

  // Title Page
  output += `\n\n\n\n\n\n`;
  output += `${centerText(data.title.toUpperCase(), 50)}\n`;
  output += `by\n`;
  output += `Peace Script AI\n\n\n\n`;
  output += `Genre: ${data.mainGenre}\n`;
  output += `Logline: ${data.logLine}\n`;
  output += `\n\n\n\n\n\n\n\n`; // Page break simulation

  data.structure.forEach((point) => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach((scene) => {
      const loc = (scene.sceneDesign.location || 'INT. UNKNOWN - DAY').toUpperCase();

      // Scene Heading
      output += `\n${loc}\n\n`;

      // Action / Description
      scene.sceneDesign.situations.forEach((sit) => {
        output += `${sit.description}\n\n`;

        // Dialogue
        sit.dialogue.forEach((d) => {
          const charName = d.character.toUpperCase();
          // Indentation logic for text file (approximate)
          output += `\t\t\t\t${charName}\n`;

          // Safe handling of characterThoughts - handles legacy data formats (string/array/object)
          let thoughts = '';
          if (sit.characterThoughts) {
            if (typeof sit.characterThoughts === 'string') {
              thoughts = sit.characterThoughts;
            } else if (Array.isArray(sit.characterThoughts)) {
              thoughts = (sit.characterThoughts as unknown[]).join(' ');
            } else if (typeof sit.characterThoughts === 'object') {
              thoughts = JSON.stringify(sit.characterThoughts);
            }
          }
          if (thoughts && thoughts.length > 0) {
            output += `\t\t\t(thinking: ${thoughts.substring(0, 20)}...)\n`;
          }
          output += `\t\t${d.dialogue}\n\n`;
        });
      });
    });
  });
  return output;
};

/**
 * Generate shot list CSV for production planning
 */
export const generateShotListCSV = (data: ScriptData): string => {
  const headers = [
    'Scene #',
    'Shot #',
    'Cast',
    'Costume',
    'Set',
    'Description',
    'Size',
    'Angle',
    'Movement',
    'Equipment',
    'Lens',
    'Aspect Ratio',
    'Lighting',
    'Color Temp',
    'Duration',
  ];
  let csvContent = headers.join(',') + '\n';

  data.structure.forEach((point) => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach((scene) => {
      scene.shotList.forEach((shot) => {
        const row = [
          scene.sceneNumber,
          shot.shot,
          `"${(shot.cast || '').replace(/"/g, '""')}"`,
          `"${(shot.costume || '').replace(/"/g, '""')}"`,
          `"${(shot.set || '').replace(/"/g, '""')}"`,
          `"${shot.description.replace(/"/g, '""')}"`,
          shot.shotSize,
          shot.perspective,
          shot.movement,
          shot.equipment,
          shot.focalLength,
          shot.aspectRatio,
          shot.lightingDesign,
          shot.colorTemperature,
          shot.durationSec,
        ];
        csvContent += row.join(',') + '\n';
      });
    });
  });
  return csvContent;
};

/**
 * Generate storyboard HTML for visualization
 */
export const generateStoryboardHTML = (data: ScriptData): string => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Storyboard - ${data.title}</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
            h1 { text-align: center; color: #333; }
            .scene-header { background: #333; color: white; padding: 10px; margin-top: 20px; border-radius: 5px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 15px; }
            .card { background: white; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
            .image-container { width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .image-container img { width: 100%; height: 100%; object-fit: cover; }
            .info { padding: 15px; }
            .shot-num { font-weight: bold; color: #0088cc; font-size: 1.1em; }
            .desc { font-size: 0.9em; color: #555; margin-top: 5px; }
            .tech { font-size: 0.8em; color: #888; margin-top: 10px; font-style: italic; }
            @media print {
                body { background: white; }
                .card { border: 1px solid #ddd; }
            }
        </style>
    </head>
    <body>
        <h1>Storyboard: ${data.title}</h1>
    `;

  data.structure.forEach((point) => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach((scene) => {
      if (!scene.storyboard || scene.storyboard.length === 0) return;

      html += `<div class="scene-header">Scene ${scene.sceneNumber}: ${scene.sceneDesign.sceneName}</div>`;
      html += `<div class="grid">`;

      scene.storyboard.forEach((sb) => {
        const shotInfo = scene.shotList.find((s) => s.shot === sb.shot);
        html += `
                    <div class="card">
                        <div class="image-container">
                            ${sb.image ? `<img src="${sb.image}" />` : '<span style="color:white">No Image</span>'}
                        </div>
                        <div class="info">
                            <div class="shot-num">Shot ${sb.shot}</div>
                            <div class="desc">${shotInfo?.description || ''}</div>
                            <div class="tech">
                                ${shotInfo?.shotSize || ''} | ${shotInfo?.perspective || ''} | ${shotInfo?.movement || ''}
                            </div>
                        </div>
                    </div>
                `;
      });

      html += `</div>`;
    });
  });

  html += `</body></html>`;
  return html;
};
