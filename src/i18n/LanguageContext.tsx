"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LANGUAGE_OPTIONS, Language, isLanguage, translate } from './translations';

type TranslateValues = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslateValues) => string;
};

const LANGUAGE_STORAGE_KEY = 'modern_agrarian_language';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type LanguageProviderProps = {
  children: React.ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && isLanguage(storedLanguage)) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  }, []);

  const t = useCallback(
    (key: string, values?: TranslateValues) => translate(language, key, values),
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }

  return {
    ...context,
    languageOptions: LANGUAGE_OPTIONS,
  };
}
