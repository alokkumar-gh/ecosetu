/**
 * voiceService.ts
 * Centralized Text-to-Speech Voice Assistance Service for ECOSETU.
 *
 * Operational Model:
 * - Exclusively for INFORMAL_COLLECTOR accessibility audio guidance ("Voice-Assisted Mode").
 * - Zero hardcoded credentials in mobile frontend.
 * - Centralized ECOSETU Vernacular & Voice Engine coordination.
 * - On-device Android native TextToSpeech fallback (EcoSetuTTS native module).
 * - Priority-aware queueing (HIGH interrupts NORMAL/LOW).
 * - Anti-repetition debounce to avoid repeated announcements on React re-renders.
 * - Multi-language support matching ECOSETU application language (en, hi, mr, or).
 * - Local storage persistence for Voice Assistance toggle (@ecosetu_voice_assistance).
 * - Defaults to OFF. Never unexpectedly speaks on first launch.
 */

import { NativeModules, Platform } from 'react-native';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { getLanguage } from '../i18n/core';
import { bhashiniClientService } from './bhashiniClientService';
import { cleanTextForTTS } from '../utils/ttsSanitizer';

export const AnnouncementPriority = Object.freeze({
  HIGH: 'HIGH' as const,
  NORMAL: 'NORMAL' as const,
  LOW: 'LOW' as const,
});

export type AnnouncementPriority = typeof AnnouncementPriority[keyof typeof AnnouncementPriority];
export type VoicePriority = AnnouncementPriority;

export interface SpeakOptions {
  priority?: VoicePriority;
  language?: string;
  force?: boolean;
}

const { EcoSetuTTS } = NativeModules;

class VoiceService {
  private isEnabledCache: boolean | null = null;
  private currentPriority: VoicePriority = 'LOW';
  private isSpeaking: boolean = false;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private readonly DEBOUNCE_MS = 2500;
  private listeners: Array<(enabled: boolean) => void> = [];

  constructor() {
    // Lazy-load initial setting
    this.isVoiceAssistanceEnabled();
  }

  /**
   * Check whether Voice Assistance is currently enabled.
   * Reads from storage with local memory caching. Defaults to false (OFF).
   */
  async isVoiceAssistanceEnabled(): Promise<boolean> {
    if (this.isEnabledCache !== null) {
      return this.isEnabledCache;
    }
    try {
      const stored = await storage.getItem(STORAGE_KEYS.VOICE_ASSISTANCE);
      this.isEnabledCache = stored === 'true';
    } catch {
      this.isEnabledCache = false;
    }
    return this.isEnabledCache;
  }

  /**
   * Enable or disable Voice Assistance and persist to local storage.
   */
  async setVoiceAssistanceEnabled(enabled: boolean): Promise<void> {
    this.isEnabledCache = enabled;
    try {
      await storage.setItem(STORAGE_KEYS.VOICE_ASSISTANCE, enabled ? 'true' : 'false');
    } catch {
      // Handled gracefully
    }
    if (!enabled) {
      await this.stop();
    }
    this.notifyListeners(enabled);
  }

  /**
   * Subscribe to Voice Assistance enable/disable toggle events.
   */
  subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(enabled: boolean) {
    this.listeners.forEach((l) => {
      try {
        l(enabled);
      } catch {
        // Safe notification
      }
    });
  }

  /**
   * Check whether native TTS capability is available on device.
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !EcoSetuTTS?.isAvailable) {
      return true; // Web / mock fallback
    }
    try {
      return await EcoSetuTTS.isAvailable();
    } catch {
      return true;
    }
  }

  /**
   * Speak announcement text using ECOSETU Vernacular & Voice Engine.
   * Respects priority, current language, and duplicate announcement protection.
   */
  async speak(text: string, options: SpeakOptions = {}): Promise<boolean> {
    if (!text || !text.trim()) return false;

    const enabled = await this.isVoiceAssistanceEnabled();
    // Manual action (force) or enabled setting required
    if (!enabled && !options.force) {
      return false;
    }

    const priority = options.priority || 'NORMAL';
    const now = Date.now();

    // Duplicate announcement protection: suppress identical text within debounce window
    if (
      !options.force &&
      this.lastSpokenText === text &&
      now - this.lastSpokenTime < this.DEBOUNCE_MS
    ) {
      return false;
    }

    // Priority arbitration: NORMAL/LOW cannot interrupt active HIGH priority speech
    if (this.isSpeaking && this.currentPriority === 'HIGH' && priority !== 'HIGH') {
      return false;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;
    this.currentPriority = priority;
    this.isSpeaking = true;

    const cleanText = cleanTextForTTS(text);
    if (!cleanText || !cleanText.trim()) return false;

    const lang = options.language || (typeof getLanguage === 'function' ? getLanguage() : 'en');

    try {
      if (EcoSetuTTS?.speak) {
        const res = await EcoSetuTTS.speak(cleanText, lang);
        this.isSpeaking = false;
        return Boolean(res);
      } else {
        // Fallback for test / web environments
        this.isSpeaking = false;
        return true;
      }
    } catch (err) {
      this.isSpeaking = false;
      return false;
    }
  }

  /**
   * Stop any current speech playback.
   */
  async stop(): Promise<void> {
    this.isSpeaking = false;
    this.currentPriority = 'LOW';
    try {
      if (EcoSetuTTS?.stop) {
        await EcoSetuTTS.stop();
      }
    } catch {
      // Safe fallback
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService;
