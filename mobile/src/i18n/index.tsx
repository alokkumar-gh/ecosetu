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
  tForLocale,
  tEnglish,
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

export const I18nProvider: React.FC<{ children: React.ReactNode; language?: SupportedLanguage }> = ({
  children,
  language: overrideLanguage,
}) => {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(overrideLanguage || getLanguage());
  const [isReady, setIsReady] = useState(Boolean(overrideLanguage));

  useEffect(() => {
    if (overrideLanguage) {
      setCurrentLang(overrideLanguage);
      setIsReady(true);
      return;
    }

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
  }, [overrideLanguage]);

  const handleSetLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (overrideLanguage) return; // Locked scope
    await setLanguage(lang);
    setCurrentLang(lang);
  }, [overrideLanguage]);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number> | string, defaultValue?: string) => {
      return tForLocale(overrideLanguage || currentLang, key, params, defaultValue);
    },
    [overrideLanguage, currentLang]
  );

  const contextValue = {
    language: overrideLanguage || currentLang,
    setLanguage: handleSetLanguage,
    t: translate,
    supportedLanguages: LANGUAGE_OPTIONS,
    isReady,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

/**
 * Isolated scope component that locks all child components and quotation screens to English,
 * strictly complying with SIH quotation English-only requirements without affecting global language.
 */
export const QuotationLanguageScope: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <I18nProvider language="en">{children}</I18nProvider>;
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

/**
 * Scoped hook for quotation screens to always resolve in English regardless of global language
 */
export const useEnglishI18n = (): I18nContextType => {
  return {
    language: 'en',
    setLanguage: async () => {},
    t: tEnglish,
    supportedLanguages: LANGUAGE_OPTIONS,
    isReady: true,
  };
};

export const useQuotationI18n = useEnglishI18n;

export const useTranslation = useI18n;


