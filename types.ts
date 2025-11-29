
export interface Character {
  id: string; // Mandatory for robust deletion and list management
  name: string;
  role: string; // New: Protagonist, Supporting, Extra, etc.
  description: string;
  image?: string; // Base64 string for profile picture
  faceReferenceImage?: string; // New: Master face reference for identity consistency
  fashionReferenceImage?: string; // New: Reference image for costume/outfit style
  imageStyle?: string; // Selected art style
  outfitCollection?: { id?: string; description: string; image: string }[]; // New: Collection of generated outfits with IDs
  external: Record<string, string>;
  physical: Record<string, string>;
  fashion: Record<string, string>; // New field for Costume/Clothing details
  internal: {
    consciousness: Record<string, number>;
    subconscious: Record<string, string>;
    defilement: Record<string, number>;
  };
  goals: {
    objective: string;
    need: string;
    action: string;
    conflict: string;
    backstory: string;
  };
}

export interface PlotPoint {
  title: string;
  description: string;
}

export interface DialogueLine {
  id: string;
  character: string;
  dialogue: string;
}

export interface GeneratedScene {
  sceneNumber: number;
  sceneDesign: {
    sceneName: string;
    characters: string[];
    location: string;
    situations: {
      description: string;
      characterThoughts: string;
      dialogue: DialogueLine[]; // CHANGED: Array for order & duplicates
    }[];
    moodTone: string;
  };
  // New: Map of Character Name -> Outfit ID for this specific scene
  characterOutfits?: Record<string, string>; 
  shotList: {
    scene: string;
    shot: number;
    description: string;
    durationSec: number;
    shotSize: string;
    perspective: string;
    movement: string;
    equipment: string;
    focalLength: string;
    aspectRatio: string;
    lightingDesign: string;
    colorTemperature: string;
    // New fields for production tracking
    cast?: string;
    costume?: string;
    set?: string;
  }[];
  // New field for Storyboard
  storyboard: {
    shot: number;
    image: string; // Base64 string
    video?: string; // URI for generated video
  }[];
  propList: {
    scene: string;
    propArt: string;
    sceneSetDetails: string;
  }[];
  breakdown: {
    part1: Record<string, string>[];
    part2: Record<string, string>[];
    part3: Record<string, string>[];
  };
}

export type ProjectType = 'Movie' | 'Series' | 'Moral Drama' | 'Short Film' | 'Commercial' | 'MV' | 'Reels';

export interface ProjectMetadata {
  id: string;
  title: string;
  type: ProjectType;
  lastModified: number;
  posterImage?: string; // New field for project thumbnail/poster
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export interface ScriptData {
  id?: string; // Unique Project ID
  projectType: ProjectType; // Type of the project
  title: string;
  mainGenre: string;
  secondaryGenres: string[];
  language: 'Thai' | 'English';
  posterImage?: string; // New field for storing the poster
  bigIdea: string;
  premise: string;
  theme: string;
  logLine: string;
  timeline: {
    movieTiming: string;
    seasons: string;
    date: string;
    social: string;
    economist: string;
    environment: string;
  };
  characters: Character[];
  structure: PlotPoint[];
  scenesPerPoint: Record<string, number>;
  generatedScenes: Record<string, GeneratedScene[]>;
  team: TeamMember[];
}
