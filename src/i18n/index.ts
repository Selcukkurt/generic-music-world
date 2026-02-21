import { en } from "./en";
import { tr } from "./tr";

export type Locale = "tr" | "en";
export type Dictionary = typeof tr;

const dictionaries: Record<Locale, Dictionary> = { tr, en };

export const defaultLocale: Locale = "tr";
const localeStorageKey = "gmw-locale";

let currentLocale: Locale = defaultLocale;

export const getCurrentLocale = () => currentLocale;

export const setCurrentLocale = (locale: Locale) => {
  currentLocale = locale;
};

export const getDictionary = (locale: Locale) =>
  dictionaries[locale] ?? dictionaries[defaultLocale];

export const getLocale = (): Locale => {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const stored = window.localStorage.getItem(localeStorageKey);
    return stored === "tr" ? stored : defaultLocale;
  } catch {
    return defaultLocale;
  }
};

export const setLocale = (locale: Locale) => {
  if (locale !== "tr") {
    return;
  }
  setCurrentLocale(locale);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(localeStorageKey, locale);
  }
};

const getPathValue = (dict: Dictionary, key: string) => {
  const segments = key.split(".");
  let current: unknown = dict;
  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

export const t = (key: string, locale = currentLocale): string => {
  const dict = getDictionary(locale);
  const value = getPathValue(dict, key);
  return typeof value === "string" ? value : key;
};
