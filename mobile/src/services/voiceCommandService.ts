/**
 * voiceCommandService.ts
 * Centralized Voice Command Service for ECOSETU Informal Collector powered by BHASHINI.
 *
 * Operational Model:
 * - Exclusively for INFORMAL_COLLECTOR accessibility.
 * - Server-side BHASHINI Indic ASR (Odia, Hindi, Marathi, Bengali, Tamil, Telugu, English, etc.).
 * - Zero Google Speech Recognition dependencies.
 * - Zero raw audio stored permanently (strictly transient base64 processing).
 * - Multi-language support with automatic Audio Language Detection & Regional ASR.
 * - Deterministic intent parsing with explicit confirmation for state-changing commands.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { parseIntent, IntentResult } from './intentParser';
import { bhashiniClientService } from './bhashiniClientService';
import { voiceRecordingService } from './voiceRecordingService';
import { networkService } from './networkService';

export type VoiceSessionState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'NO_SPEECH'
  | 'UNRECOGNIZED_COMMAND'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'OFFLINE'
  | 'ERROR';

class VoiceCommandService {
  private isSessionActive: boolean = false;
  private currentState: VoiceSessionState = 'IDLE';
  private listeners: Set<(state: VoiceSessionState) => void> = new Set();
  private autoStopTimer: any = null;

  /**
   * Subscribe to voice session state updates
   */
  subscribeState(listener: (state: VoiceSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(state: VoiceSessionState) {
    this.currentState = state;
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch {
        // Safe listener dispatch
      }
    });
  }

  getCurrentState(): VoiceSessionState {
    return this.currentState;
  }

  /**
   * Check whether voice recording and BHASHINI service are available
   */
  async isAvailable(): Promise<boolean> {
    return await voiceRecordingService.isAvailable();
  }

  /**
   * Request microphone permission explicitly when user taps voice command button.
   */
  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (hasPermission) return true;

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'EcoSetu uses the microphone only when you tap the voice button to recognize your commands via BHASHINI.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );

        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return await voiceRecordingService.requestMicrophonePermission();
  }

  /**
   * Starts a voice command recognition session via BHASHINI ASR.
   *
   * @param language 'auto' | 'en' | 'hi' | 'mr' | 'or' | 'bn' | 'te' | 'ta' etc.
   * @returns Parsed IntentResult or null
   */
  async startVoiceCommandSession(language: string = 'auto'): Promise<IntentResult | null> {
    if (this.isSessionActive) {
      console.warn('[VoiceCommand] Session already active, ignoring duplicate start');
      return null;
    }

    if (!networkService.isConnected()) {
      this.setState('OFFLINE');
      return null;
    }

    const available = await this.isAvailable();
    if (!available) {
      this.setState('UNAVAILABLE');
      return null;
    }

    const permissionGranted = await this.requestMicrophonePermission();
    if (!permissionGranted) {
      this.setState('PERMISSION_DENIED');
      return null;
    }

    this.isSessionActive = true;
    this.setState('LISTENING');
    console.log(`[VoiceCommand] BHASHINI voice listening started in language: ${language}`);

    const started = await voiceRecordingService.startRecording();
    if (!started) {
      this.isSessionActive = false;
      this.setState('ERROR');
      return null;
    }

    // Return promise that resolves when user stops or automatic timeout fires
    return new Promise((resolve) => {
      // Automatic recording duration limit: 5 seconds max per command
      this.autoStopTimer = setTimeout(async () => {
        if (this.isSessionActive) {
          const res = await this.finishListeningAndTranscribe(language);
          resolve(res);
        }
      }, 4500);

      (this as any)._resolveSession = resolve;
    });
  }

  /**
   * Finishes recording, sends audio to BHASHINI ASR, and extracts intent.
   */
  async finishListeningAndTranscribe(language: string = 'auto'): Promise<IntentResult | null> {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    this.setState('PROCESSING');

    try {
      const recording = await voiceRecordingService.stopRecording();
      if (!recording || !recording.audioBase64 || !recording.audioBase64.trim()) {
        this.setState('NO_SPEECH');
        this.isSessionActive = false;
        return null;
      }

      // Transcribe via ECOSETU Backend BHASHINI ASR
      const asrResult = await bhashiniClientService.transcribe(
        recording.audioBase64,
        language,
        {
          audioFormat: recording.audioFormat,
          samplingRate: recording.samplingRate,
        }
      );

      if (!asrResult || !asrResult.transcript || !asrResult.transcript.trim()) {
        this.setState('NO_SPEECH');
        this.isSessionActive = false;
        return null;
      }

      const bestTranscript = asrResult.transcript.trim();
      const detectedLang = asrResult.language?.code || language || 'en';
      const parsed = parseIntent(bestTranscript, detectedLang);

      if (parsed.intent === 'UNKNOWN') {
        this.setState('UNRECOGNIZED_COMMAND');
      } else {
        this.setState('SUCCESS');
      }

      console.log(`[VoiceCommand] BHASHINI Transcript: "${bestTranscript}", Parsed intent: ${parsed.intent}`);
      this.isSessionActive = false;
      return parsed;
    } catch (err: any) {
      this.isSessionActive = false;
      const code = err?.code || '';

      if (code === 'NO_SPEECH' || err?.message?.includes('cancelled')) {
        this.setState('NO_SPEECH');
      } else if (code === 'UNAVAILABLE') {
        this.setState('UNAVAILABLE');
      } else {
        this.setState('ERROR');
      }
      return null;
    }
  }

  /**
   * Stop listening immediately
   */
  async stopListening(): Promise<IntentResult | null> {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    if (this.isSessionActive) {
      const result = await this.finishListeningAndTranscribe();
      if ((this as any)._resolveSession) {
        (this as any)._resolveSession(result);
        (this as any)._resolveSession = null;
      }
      return result;
    }

    await voiceRecordingService.cancelRecording();
    this.isSessionActive = false;
    this.setState('IDLE');
    return null;
  }

  /**
   * Reset session state to IDLE
   */
  resetState(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    voiceRecordingService.cancelRecording();
    this.isSessionActive = false;
    this.setState('IDLE');
  }
}

export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;
