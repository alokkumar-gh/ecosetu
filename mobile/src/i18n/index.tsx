/**
 * EcoSetu Mobile i18n React Integration
 * Exports core functions + React context provider and hook.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SupportedLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LanguageOption,
  getLanguage,
  setLanguage,
  initI18n,
  subscribeLanguageChange,
  t,
} from './core';

export * from './core';

export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number> | string, defaultValue?: string) => string;
  supportedLanguages: LanguageOption[];
  isReady: boolean;
}

export const I18nContext = createContext<I18nContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
  t,
  supportedLanguages: LANGUAGE_OPTIONS,
  isReady: true,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getLanguage());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initI18n().then((loadedLang) => {
      if (isMounted) {
        setCurrentLang(loadedLang);
        setIsReady(true);
      }
    });

    const unsubscribe = subscribeLanguageChange((lang: SupportedLanguage) => {
      if (isMounted) {
        setCurrentLang(lang);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSetLanguage = useCallback(async (lang: SupportedLanguage) => {
    await setLanguage(lang);
    setCurrentLang(lang);
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number> | string, defaultValue?: string) => {
      return t(key, params, defaultValue);
    },
    // re-create translate reference whenever currentLang updates so components re-render with new language
    [currentLang]
  );

  const contextValue = {
    language: currentLang,
    setLanguage: handleSetLanguage,
    t: translate,
    supportedLanguages: LANGUAGE_OPTIONS,
    isReady,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

/**
 * Hook to consume i18n context in functional components
 */
export const useI18n = (): I18nContextType => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: getLanguage(),
      setLanguage,
      t,
      supportedLanguages: LANGUAGE_OPTIONS,
      isReady: true,
    };
  }
  return ctx;
};

export const useTranslation = useI18n;

