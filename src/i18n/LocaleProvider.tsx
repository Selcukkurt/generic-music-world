"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  defaultLocale,
  getDictionary,
  getLocale,
  setLocale,
  setCurrentLocale,
  t as translate,
  type Dictionary,
  type Locale,
} from "./index";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dict: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = getLocale();
    setLocaleState(stored);
    setCurrentLocale(stored);
    document.documentElement.lang = stored;
  }, []);

  const updateLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocale(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale: updateLocale,
      t: (key: string) => translate(key, locale),
      dict: getDictionary(locale),
    }),
    [locale, updateLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
};

export const useI18n = () => useLocale();
