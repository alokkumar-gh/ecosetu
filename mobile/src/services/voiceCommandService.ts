/**
 * voiceCommandService.ts
 * Centralized Voice Command Service for ECOSETU Informal Collector.
 *
 * Operational Model:
 * - Exclusively for INFORMAL_COLLECTOR role.
 * - On-device native speech recognition via Android RecognizerIntent (EcoSetuSpeech native module).
 * - Zero cloud speech APIs, zero paid external services.
 * - Zero raw audio storage or upload (strictly transient in-memory text processing).
 * - Multi-language support matching ECOSETU application language (en, hi, mr, or).
 * - Deterministic intent parsing with explicit confirmation for state-changing commands.
 * - Server-authoritative mutations are blocked when offline.
 */

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { parseIntent, IntentResult } from './intentParser';
import { voiceService } from './voiceService';
import { AppError } from '../utils/AppError';

const { EcoSetuSpeech } = NativeModules;

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
   * Check whether Speech Recognition is available on the device
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !EcoSetuSpeech) {
      return false;
    }
    try {
      return await EcoSetuSpeech.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Safe microphone permission request flow.
   * Only requested when user explicitly taps the voice command button.
   * Never requests on app startup.
   */
  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

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
            'EcoSetu uses the microphone only when you tap the voice button to recognize your commands.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Starts a voice command recognition session.
   * Discards duplicate simultaneous calls.
   * @param language 'en' | 'hi' | 'mr' | 'or'
   * @returns Parsed IntentResult
   */
  async startVoiceCommandSession(language: string = 'en'): Promise<IntentResult | null> {
    if (this.isSessionActive) {
      console.warn('[VoiceCommand] Session already active, ignoring duplicate start');
      return null;
    }

    const available = await this.isAvailable();
    if (!available) {
      this.setState('UNAVAILABLE');
      return null;
    }

    // Explicit runtime permission request
    const permissionGranted = await this.requestMicrophonePermission();
    if (!permissionGranted) {
      this.setState('PERMISSION_DENIED');
      return null;
    }

    this.isSessionActive = true;
    this.setState('LISTENING');
    console.log(`[VoiceCommand] Voice command listening started in language: ${language}`);

    try {
      const matches: string[] = await EcoSetuSpeech.startListening(language);
      this.setState('PROCESSING');

      if (!matches || matches.length === 0 || !matches[0].trim()) {
        this.setState('NO_SPEECH');
        this.isSessionActive = false;
        return null;
      }

      const bestTranscript = matches[0];
      const parsed = parseIntent(bestTranscript, language);

      if (parsed.intent === 'UNKNOWN') {
        this.setState('UNRECOGNIZED_COMMAND');
      } else {
        this.setState('SUCCESS');
      }

      console.log(`[VoiceCommand] Parsed intent: ${parsed.intent}, category: ${parsed.category}`);
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
   * Stop or cancel current active listening session
   */
  async stopListening(): Promise<void> {
    if (EcoSetuSpeech) {
      try {
        await EcoSetuSpeech.stopListening();
      } catch {
        // Safe stop
      }
    }
    this.isSessionActive = false;
    this.setState('IDLE');
  }

  /**
   * Reset session state to IDLE
   */
  resetState(): void {
    this.isSessionActive = false;
    this.setState('IDLE');
  }
}

export const voiceCommandService = new VoiceCommandService();
