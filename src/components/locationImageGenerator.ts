// 🖼️ Location Image Generator
// Generates cinematic location images from Location Details

export async function generateLocationImage(
  locationDetails: Record<string, any>,
  locationString: string
): Promise<string> {
  if (!locationDetails) {
    throw new Error('Location Details are required');
  }

  // Build comprehensive prompt from Location Details
  const environment = locationDetails.environment || {};
  const atmosphere = locationDetails.atmosphere || {};
  const sensory = locationDetails.sensory || {};
  const production = locationDetails.production || {};
  
  const imagePrompt = `
Professional cinematic location photograph for film production:

LOCATION: ${locationString}
TYPE: ${locationDetails.locationType || 'INT.'} - ${locationDetails.timeOfDay || 'DAY'}

ENVIRONMENT:
${environment.description || ''}
Architecture: ${environment.architecture || ''}
Landscaping: ${environment.landscaping || ''}
Dimensions: ${environment.dimensions || ''}

ATMOSPHERE:
Weather: ${atmosphere.weather || 'Clear'}
Temperature: ${atmosphere.temperature || 'Comfortable'}
Lighting: ${sensory.lighting || 'Natural daylight'}
Colors: ${sensory.colors || 'Natural tones'}

MOOD & FEELING:
${environment.atmosphere || ''}
Sounds: ${sensory.sounds || 'Ambient'}
Smell: ${sensory.smell || ''}

SET DRESSING & PROPS:
${production.setDressing || ''}
Key Props: ${production.props || ''}
Lighting: ${production.practicalLights || ''}

STYLE & FORMAT:
- Cinematic composition, film production quality
- Professional location scouting photography
- 16:9 widescreen aspect ratio (1920x1080)
- Horizontal landscape orientation
- ${sensory.lighting || 'Natural lighting with cinematic color grading'}
- Ultra detailed, 8K quality
- Realistic, photographic style
- Show the full environment and atmosphere
- Wide angle shot showing complete location
  `.trim();

  // Use generateImageWithCascade from geminiService
  const { generateImageWithCascade } = await import('../services/geminiService');
  
  // Force using Gemini model for location image generation
  const imageUrl = await generateImageWithCascade(imagePrompt, {
    negativePrompt: 'blurry, low quality, distorted, cartoon, anime, drawing, illustration, people, person, human, face',
    preferredModel: 'gemini-pro', // Force Gemini 2.5 Pro for high quality
    onProgress: (_progress: number) => {
      // Progress callback - intentionally silent in production
    },
  });

  if (!imageUrl) {
    throw new Error('Failed to generate image');
  }

  return imageUrl;
}
