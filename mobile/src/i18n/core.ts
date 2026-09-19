/**
 * EcoSetu Centralized Mobile i18n Core Engine
 * Pure TypeScript internationalization engine without JSX dependencies.
 * Fully offline, persistent via storage, with English fallback.
 */

import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import {
  SupportedLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LanguageOption,
  TranslationSchema,
} from './config';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { mr } from './locales/mr';
import { or } from './locales/or';

export * from './config';

// Registry of bundled locales (100% offline)
export const LOCALES: Record<SupportedLanguage, TranslationSchema> = {
  en,
  hi,
  mr,
  or,
};

// Internal module state
let activeLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
const languageChangeListeners = new Set<(lang: SupportedLanguage) => void>();

/**
 * Get current active language code
 */
export const getLanguage = (): SupportedLanguage => activeLanguage;

/**
 * Set and persist active language
 */
export const setLanguage = async (lang: SupportedLanguage): Promise<void> => {
  if (!LOCALES[lang]) {
    console.warn(`[i18n] Unsupported language "${lang}", falling back to ${DEFAULT_LANGUAGE}`);
    lang = DEFAULT_LANGUAGE;
  }
  activeLanguage = lang;
  try {
    const key = (STORAGE_KEYS && STORAGE_KEYS.LANGUAGE) || '@ecosetu_language';
    await storage.setItem(key, lang);
  } catch (err) {
    console.error('[i18n] Failed to persist language preference', err);
  }
  languageChangeListeners.forEach((listener) => {
    try {
      listener(lang);
    } catch (e) {
      console.error('[i18n] Error in language change listener', e);
    }
  });
};

/**
 * Subscribe to language changes (useful for non-React code or custom handlers)
 */
export const subscribeLanguageChange = (listener: (lang: SupportedLanguage) => void): (() => void) => {
  languageChangeListeners.add(listener);
  return () => {
    languageChangeListeners.delete(listener);
  };
};

/**
 * Initialize language from storage (call on app start)
 */
export const initI18n = async (): Promise<SupportedLanguage> => {
  try {
    const key = (STORAGE_KEYS && STORAGE_KEYS.LANGUAGE) || '@ecosetu_language';
    const saved = await storage.getItem(key);
    if (saved && typeof saved === 'string' && LOCALES[saved as SupportedLanguage]) {
      activeLanguage = saved as SupportedLanguage;
    } else {
      activeLanguage = DEFAULT_LANGUAGE;
    }
  } catch {
    activeLanguage = DEFAULT_LANGUAGE;
  }
  return activeLanguage;
};

/**
 * Lookup helper to traverse nested schema by dot-path
 */
export function resolvePath(obj: any, path: string): string | null {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
}

/**
 * Universal translation function
 * Resolves translation with active language -> fallback to English -> fallback to key.
 * Interpolates parameters in the form `{paramName}`.
 */
export const t = (
  key: string,
  params?: Record<string, string | number>,
  defaultValue?: string
): string => {
  // 1. Try active language
  let text = resolvePath(LOCALES[activeLanguage], key);

  // 2. Fall back to English if missing
  if (text === null && activeLanguage !== DEFAULT_LANGUAGE) {
    text = resolvePath(LOCALES[DEFAULT_LANGUAGE], key);
  }

  // 3. Fall back to defaultValue, or empty string if key is a dotted path, or key
  if (text === null) {
    if (defaultValue !== undefined) {
      text = defaultValue;
    } else if (key && key.includes('.')) {
      // Namespaced key like 'citizen.submit.registerItem'
      // Return empty string so `t('...') || 'Fallback'` evaluates right-hand fallback
      text = '';
    } else {
      text = key;
    }
  }

  // 4. Interpolate params if provided
  if (text && params && typeof params === 'object') {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return text;
};
