import type { TTSSettings } from '../components/TTSSettingsModal';

/**
 * Unified TTS Service
 * Supports multiple TTS engines: Browser, Google Cloud, Azure, AWS Polly, PyThaiNLP
 */

export class TTSService {
  private static instance: TTSService;
  // private currentUtterance: SpeechSynthesisUtterance | null = null;

  private constructor() {}

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Speak text using selected TTS engine
   */
  async speak(text: string, settings: TTSSettings): Promise<void> {
    console.log(`🔊 TTS Engine: ${settings.engine}, Text length: ${text.length}`);

    switch (settings.engine) {
      case 'browser':
        return this.speakBrowser(text, settings);
      case 'google':
        return this.speakGoogle(text, settings);
      case 'azure':
        return this.speakAzure(text, settings);
      case 'aws':
        return this.speakAWS(text, settings);
      case 'pythainlp':
        return this.speakPyThaiNLP(text, settings);
      default:
        throw new Error(`Unknown TTS engine: ${settings.engine}`);
    }
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    window.speechSynthesis.cancel();
    // this.currentUtterance = null;
  }

  /**
   * Pause speech (only works with browser TTS)
   */
  pause(): void {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume speech (only works with browser TTS)
   */
  resume(): void {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Browser Web Speech API
   */
  private async speakBrowser(text: string, settings: TTSSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // this.currentUtterance = utterance;

      // Get voices
      const voices = window.speechSynthesis.getVoices();

      // Find Thai voice
      const thaiVoice = voices.find(
        v => v.name.toLowerCase().includes('kanya') || v.lang === 'th-TH' || v.lang.startsWith('th')
      );

      if (thaiVoice) {
        utterance.voice = thaiVoice;
        console.log('✅ Selected voice:', thaiVoice.name);
      }

      utterance.lang = 'th-TH';
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onend = () => {
        console.log('✅ Speech ended');
        resolve();
      };

      utterance.onerror = event => {
        console.error('❌ Speech error:', event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Google Cloud Text-to-Speech API
   */
  private async speakGoogle(text: string, settings: TTSSettings): Promise<void> {
    if (!settings.googleApiKey) {
      throw new Error('Google API Key is required');
    }

    console.log('🌐 Calling Google Cloud TTS API...');
    console.log('📝 Text length:', text.length, 'characters');

    try {
      // Split long text into chunks (Google TTS has a 5000 character limit)
      const maxChars = 4500;
      const chunks: string[] = [];

      if (text.length > maxChars) {
        console.log('📦 Splitting text into chunks...');
        let remaining = text;
        while (remaining.length > 0) {
          let chunk = remaining.substring(0, maxChars);
          // Try to break at sentence end
          const lastPeriod = chunk.lastIndexOf('. ');
          const lastQuestion = chunk.lastIndexOf('? ');
          const lastExclaim = chunk.lastIndexOf('! ');
          const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);

          if (breakPoint > maxChars * 0.7 && remaining.length > maxChars) {
            chunk = remaining.substring(0, breakPoint + 2);
          }

          chunks.push(chunk);
          remaining = remaining.substring(chunk.length);
        }
        console.log(`📦 Split into ${chunks.length} chunks`);
      } else {
        chunks.push(text);
      }

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing chunk ${i + 1}/${chunks.length}...`);

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${settings.googleApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: { text: chunk },
              voice: {
                languageCode: 'th-TH',
                name: 'th-TH-Standard-A', // Female voice
                ssmlGender: 'FEMALE',
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: settings.rate,
                pitch: (settings.pitch - 1) * 20, // Google uses -20 to 20
                volumeGainDb: (settings.volume - 0.5) * 16, // Convert 0-1 to dB
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Google API Response:', errorText);
          try {
            const error = JSON.parse(errorText);
            throw new Error(`Google TTS API error: ${error.error?.message || response.statusText}`);
          } catch {
            throw new Error(`Google TTS API error: ${response.status} ${response.statusText}`);
          }
        }

        const data = await response.json();
        const audioContent = data.audioContent;

        // Play audio
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            console.log(`✅ Chunk ${i + 1}/${chunks.length} completed`);
            resolve();
          };
          audio.onerror = e => {
            console.error('❌ Audio playback failed:', e);
            reject(new Error('Audio playback failed'));
          };
          audio.play().catch(reject);
        });

        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ All chunks completed successfully');
    } catch (error) {
      console.error('❌ Google TTS error:', error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error(
            'Invalid Google Cloud API Key. Please check your key at https://console.cloud.google.com/apis/credentials'
          );
        }
        if (error.message.includes('quota')) {
          throw new Error(
            'Google Cloud TTS quota exceeded. Check your quota at https://console.cloud.google.com/iam-admin/quotas'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Azure Cognitive Services Text-to-Speech
   */
  private async speakAzure(text: string, settings: TTSSettings): Promise<void> {
    if (!settings.azureApiKey || !settings.azureRegion) {
      throw new Error('Azure API Key and Region are required');
    }

    console.log('🌐 Calling Azure TTS API...');

    try {
      const response = await fetch(
        `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': settings.azureApiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          },
          body: `
            <speak version='1.0' xml:lang='th-TH'>
              <voice xml:lang='th-TH' xml:gender='Female' name='th-TH-PremwadeeNeural'>
                <prosody rate='${settings.rate}' pitch='${(settings.pitch - 1) * 50}%' volume='${settings.volume * 100}'>
                  ${text}
                </prosody>
              </voice>
            </speak>
          `,
        }
      );

      if (!response.ok) {
        throw new Error(`Azure TTS API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      await audio.play();

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => reject(new Error('Audio playback failed'));
      });
    } catch (error) {
      console.error('❌ Azure TTS error:', error);
      throw error;
    }
  }

  /**
   * AWS Polly Text-to-Speech
   */
  private async speakAWS(_text: string, settings: TTSSettings): Promise<void> {
    if (!settings.awsAccessKey || !settings.awsSecretKey || !settings.awsRegion) {
      throw new Error('AWS credentials and region are required');
    }

    console.log('🌐 Calling AWS Polly API...');

    // Note: For security, this should be done via a backend proxy
    // Direct browser calls to AWS Polly require exposing credentials
    console.warn('⚠️  AWS Polly should be called from backend for security');

    // For now, throw error until backend proxy is implemented
    throw new Error(
      'AWS Polly integration requires backend implementation for security. Please use Google Cloud or Azure instead.'
    );

    // Proper implementation would use AWS SDK via backend:
    // import { Polly } from '@aws-sdk/client-polly';
    // const polly = new Polly({
    //   region: settings.awsRegion,
    //   credentials: {
    //     accessKeyId: settings.awsAccessKey,
    //     secretAccessKey: settings.awsSecretKey,
    //   },
    // });
    //
    // const result = await polly.synthesizeSpeech({
    //   Text: text,
    //   OutputFormat: 'mp3',
    //   VoiceId: 'Takumi', // Thai voice
    //   Engine: 'neural',
    // });
  }

  /**
   * PyThaiNLP TTS (requires local server)
   */
  private async speakPyThaiNLP(text: string, settings: TTSSettings): Promise<void> {
    if (!settings.pythainlpEndpoint) {
      throw new Error('PyThaiNLP endpoint is required');
    }

    console.log('🌐 Calling PyThaiNLP TTS...');
    console.log('🔗 Endpoint:', settings.pythainlpEndpoint);
    console.log('📝 Text length:', text.length, 'characters');

    try {
      // Test endpoint first
      let endpoint = settings.pythainlpEndpoint.trim();
      if (!endpoint.startsWith('http')) {
        endpoint = 'http://' + endpoint;
      }

      // Split into chunks if needed (PyThaiNLP may have text limits)
      const maxChars = 3000;
      const chunks: string[] = [];

      if (text.length > maxChars) {
        console.log('📦 Splitting text into chunks...');
        let remaining = text;
        while (remaining.length > 0) {
          let chunk = remaining.substring(0, maxChars);
          // Try to break at sentence end
          const lastSpace = chunk.lastIndexOf(' ');
          if (lastSpace > maxChars * 0.7 && remaining.length > maxChars) {
            chunk = remaining.substring(0, lastSpace);
          }
          chunks.push(chunk.trim());
          remaining = remaining.substring(chunk.length).trim();
        }
        console.log(`📦 Split into ${chunks.length} chunks`);
      } else {
        chunks.push(text);
      }

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing chunk ${i + 1}/${chunks.length}...`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'audio/wav, audio/mpeg, audio/*',
          },
          body: JSON.stringify({
            text: chunk,
            speed: settings.rate,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ PyThaiNLP Response:', errorText);
          throw new Error(`PyThaiNLP TTS error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        console.log('📦 Response type:', contentType);

        const audioBlob = await response.blob();
        console.log('📦 Audio blob size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          throw new Error('PyThaiNLP returned empty audio');
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = settings.volume;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            console.log(`✅ Chunk ${i + 1}/${chunks.length} completed`);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = e => {
            console.error('❌ Audio playback failed:', e);
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio playback failed'));
          };
          audio.play().catch(reject);
        });

        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ All chunks completed successfully');
    } catch (error) {
      console.error('❌ PyThaiNLP TTS error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(
            `Cannot connect to PyThaiNLP server at ${settings.pythainlpEndpoint}. Make sure the server is running.`
          );
        }
      }
      throw error;
    }
  }
}

export const ttsService = TTSService.getInstance();

