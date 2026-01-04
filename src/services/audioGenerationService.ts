/**
 * Audio Generation Service
 *
 * Integrates voice cloning with video generation pipeline
 * Supports:
 * - Character voice cloning TTS
 * - Dialogue audio generation
 * - Audio timeline management
 * - Video+Audio merging
 *
 * @author Peace Script AI Team
 * @version 1.0.0
 */

import { voiceCloningService } from './voiceCloningService';
import type { Character, DialogueLine } from '../types';

let cachedFfmpeg: any | null = null;
let cachedFfmpegLoad: Promise<any> | null = null;

async function getFFmpeg(): Promise<any> {
  if (cachedFfmpeg) return cachedFfmpeg;
  if (cachedFfmpegLoad) return cachedFfmpegLoad;

  cachedFfmpegLoad = (async () => {
    // If some deployment already injected FFmpeg on window, prefer it.
    const win = window as any;
    if (win?.FFmpeg?.FFmpeg) {
      const { FFmpeg } = win.FFmpeg;
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      cachedFfmpeg = ffmpeg;
      return ffmpeg;
    }

    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ]);

    const ffmpeg = new FFmpeg();

    // Load core from CDN to avoid bundling the large core files.
    // Note: requires network access at runtime.
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    cachedFfmpeg = ffmpeg;
    return ffmpeg;
  })().finally(() => {
    cachedFfmpegLoad = null;
  });

  return cachedFfmpegLoad;
}

export interface AudioSegment {
  dialogueIndex: number;
  character: string;
  text: string;
  startTime: number; // seconds
  duration: number; // seconds
  audioBlob?: Blob;
  audioUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

export interface AudioTimeline {
  segments: AudioSegment[];
  totalDuration: number;
  videoUrl?: string;
  finalAudioUrl?: string;
}

export interface AudioGenerationOptions {
  character: Character;
  voiceSettings?: {
    speed?: number; // 0.5-2.0
    pitch?: number; // -20 to +20
    volume?: number; // 0-1
  };
  outputFormat?: 'wav' | 'mp3';
}

/**
 * Generate audio for a single dialogue line using character's cloned voice
 */
export async function generateDialogueAudio(
  dialogue: DialogueLine,
  character: Character,
  options?: AudioGenerationOptions
): Promise<Blob> {
  console.log(`🎙️ Generating audio for character: ${character.name}`);
  console.log(`   Text: "${dialogue.dialogue}"`);

  // Check if character has voice cloning configured
  if (!character.voiceCloning?.hasVoiceSample || !character.voiceCloning.voiceSampleId) {
    throw new Error(`Character "${character.name}" does not have voice cloning configured`);
  }

  try {
    // Synthesize speech using voice cloning service
    const audioBlob = await voiceCloningService.synthesizeSpeech({
      text: dialogue.dialogue,
      voice_id: character.voiceCloning.voiceSampleId,
      language: character.voiceCloning.language || 'th',
      speed: options?.voiceSettings?.speed || 1.0,
    });

    console.log(`✅ Audio generated: ${audioBlob.size} bytes`);
    return audioBlob;
  } catch (error) {
    console.error(`❌ Failed to generate audio for ${character.name}:`, error);
    throw new Error(
      `Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate audio timeline from dialogue array
 * Creates audio segments with timing information
 */
export async function generateAudioTimeline(
  dialogues: DialogueLine[],
  characters: Character[],
  options?: {
    gapBetweenLines?: number; // seconds between dialogue lines (default: 0.5)
    startDelay?: number; // initial silence (default: 0)
  }
): Promise<AudioTimeline> {
  console.log(`🎬 Generating audio timeline for ${dialogues.length} dialogue lines`);

  const segments: AudioSegment[] = [];
  let currentTime = options?.startDelay || 0;
  const gap = options?.gapBetweenLines ?? 0.5;

  for (let i = 0; i < dialogues.length; i++) {
    const dialogue = dialogues[i];
    const character = characters.find(c => c.name === dialogue.character);

    if (!character) {
      console.warn(`⚠️ Character "${dialogue.character}" not found, skipping`);
      continue;
    }

    if (!character.voiceCloning?.hasVoiceSample) {
      console.warn(`⚠️ Character "${character.name}" has no voice sample, skipping`);
      continue;
    }

    const segment: AudioSegment = {
      dialogueIndex: i,
      character: character.name,
      text: dialogue.dialogue,
      startTime: currentTime,
      duration: 0, // Will be updated after audio generation
      status: 'pending',
    };

    try {
      segment.status = 'generating';
      console.log(
        `   [${i + 1}/${dialogues.length}] Generating "${character.name}": "${dialogue.dialogue.substring(0, 50)}..."`
      );

      const audioBlob = await generateDialogueAudio(dialogue, character);

      // Calculate duration from audio blob
      const duration = await getAudioDuration(audioBlob);

      segment.audioBlob = audioBlob;
      segment.audioUrl = URL.createObjectURL(audioBlob);
      segment.duration = duration;
      segment.status = 'completed';

      console.log(`   ✅ Duration: ${duration.toFixed(2)}s`);

      currentTime += duration + gap;
    } catch (error) {
      segment.status = 'error';
      segment.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Failed:`, error);
    }

    segments.push(segment);
  }

  const timeline: AudioTimeline = {
    segments,
    totalDuration: currentTime,
  };

  console.log(
    `✅ Audio timeline complete: ${segments.length} segments, ${currentTime.toFixed(2)}s total`
  );
  return timeline;
}

/**
 * Get audio duration from blob
 */
async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio'));
    };

    audio.src = url;
  });
}

/**
 * Merge multiple audio segments into a single audio file
 * Uses Web Audio API for client-side mixing
 */
export async function mergeAudioSegments(timeline: AudioTimeline): Promise<Blob> {
  console.log(`🎵 Merging ${timeline.segments.length} audio segments...`);

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = 22050; // Match XTTS-v2 sample rate

  // Calculate total samples needed
  const totalSamples = Math.ceil(timeline.totalDuration * sampleRate);
  const outputBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
  const outputData = outputBuffer.getChannelData(0);

  // Process each segment
  for (const segment of timeline.segments) {
    if (segment.status !== 'completed' || !segment.audioBlob) {
      continue;
    }

    try {
      const arrayBuffer = await segment.audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const segmentData = audioBuffer.getChannelData(0);

      const startSample = Math.floor(segment.startTime * sampleRate);

      // Copy segment data to output buffer
      for (let i = 0; i < segmentData.length && startSample + i < totalSamples; i++) {
        outputData[startSample + i] = segmentData[i];
      }

      console.log(`   ✅ Merged: ${segment.character} at ${segment.startTime.toFixed(2)}s`);
    } catch (error) {
      console.error(`   ❌ Failed to merge segment:`, error);
    }
  }

  // Convert buffer to WAV blob
  const wavBlob = await audioBufferToWav(outputBuffer);

  console.log(`✅ Audio merge complete: ${wavBlob.size} bytes`);
  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = new Float32Array(buffer.length * numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      data[i * numberOfChannels + channel] = channelData[i];
    }
  }

  const dataLength = data.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Merge video and audio using FFmpeg.wasm (client-side)
 * Note: Requires FFmpeg.wasm to be loaded
 */
export async function mergeVideoWithAudio(
  videoBlob: Blob,
  audioBlob: Blob,
  options?: {
    fadeIn?: number; // seconds
    fadeOut?: number; // seconds
  }
): Promise<Blob> {
  console.log(`🎬 Merging video (${videoBlob.size} bytes) with audio (${audioBlob.size} bytes)...`);

  try {
    const ffmpeg = await getFFmpeg();
    console.log('✅ FFmpeg loaded');

    // Write input files
    const videoData = new Uint8Array(await videoBlob.arrayBuffer());
    const audioData = new Uint8Array(await audioBlob.arrayBuffer());

    await ffmpeg.writeFile('input.mp4', videoData);
    await ffmpeg.writeFile('audio.wav', audioData);
    console.log('✅ Files written to FFmpeg');

    // Build FFmpeg command
    const args = [
      '-i',
      'input.mp4',
      '-i',
      'audio.wav',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-strict',
      'experimental',
    ];

    const audioFilters: string[] = [];
    if (options?.fadeIn && options.fadeIn > 0) {
      audioFilters.push(`afade=t=in:st=0:d=${options.fadeIn}`);
    }

    if (options?.fadeOut && options.fadeOut > 0) {
      const duration = await getAudioDuration(audioBlob);
      const start = Math.max(0, duration - options.fadeOut);
      audioFilters.push(`afade=t=out:st=${start}:d=${options.fadeOut}`);
    }

    if (audioFilters.length > 0) {
      args.push('-af', audioFilters.join(','));
    }

    // Ensure output ends when the shorter stream ends.
    args.push('-shortest');

    args.push('output.mp4');

    // Execute FFmpeg
    await ffmpeg.exec(args);
    console.log('✅ FFmpeg processing complete');

    // Read output file
    const outputData = await ffmpeg.readFile('output.mp4');
    const outputBlob = new Blob([outputData], { type: 'video/mp4' });

    console.log(`✅ Video+Audio merge complete: ${outputBlob.size} bytes`);
    return outputBlob;
  } catch (error) {
    console.error('❌ FFmpeg merge failed:', error);
    throw new Error(
      `Failed to merge video with audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate complete audio track for a video scene
 * High-level function that handles the entire pipeline
 */
export async function generateSceneAudio(
  dialogues: DialogueLine[],
  characters: Character[],
  options?: {
    gapBetweenLines?: number;
    startDelay?: number;
    fadeIn?: number;
    fadeOut?: number;
  }
): Promise<{ audioBlob: Blob; timeline: AudioTimeline }> {
  console.log(`🎬 Generating complete scene audio...`);

  // Generate timeline
  const timeline = await generateAudioTimeline(dialogues, characters, options);

  // Merge segments
  const audioBlob = await mergeAudioSegments(timeline);

  timeline.finalAudioUrl = URL.createObjectURL(audioBlob);

  console.log(`✅ Scene audio generation complete`);
  return { audioBlob, timeline };
}

/**
 * Clean up audio URLs to prevent memory leaks
 */
export function cleanupAudioTimeline(timeline: AudioTimeline): void {
  timeline.segments.forEach(segment => {
    if (segment.audioUrl) {
      URL.revokeObjectURL(segment.audioUrl);
    }
  });

  if (timeline.finalAudioUrl) {
    URL.revokeObjectURL(timeline.finalAudioUrl);
  }
}
