"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  SystemSettings,
  GeneralSettings,
  ParametersSettings,
  ModulesSettings,
  MailSettings,
  SecuritySettings,
} from "./types";
import {
  loadSettings,
  saveSettings,
  getChangedFields,
  DEFAULT_SETTINGS,
} from "./store";
import { fetchSettings, updateSettings } from "./api";

type SettingsContextValue = {
  settings: SystemSettings;
  isLoading: boolean;
  isDirty: boolean;
  setGeneral: (g: Partial<GeneralSettings>) => void;
  setParameters: (p: Partial<ParametersSettings>) => void;
  setModules: (m: Partial<ModulesSettings>) => void;
  setMail: (m: Partial<MailSettings>) => void;
  setSecurity: (s: Partial<SecuritySettings>) => void;
  save: () => void;
  reset: () => void;
  resetToDefaults: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromApi = await fetchSettings();
        const loaded =
          fromApi && typeof fromApi === "object"
            ? { ...DEFAULT_SETTINGS, ...fromApi }
            : loadSettings();
        if (!cancelled) {
          setSettings(loaded);
          setInitialSettings(loaded);
        }
      } catch {
        const loaded = loadSettings();
        if (!cancelled) {
          setSettings(loaded);
          setInitialSettings(loaded);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings]
  );

  const setGeneral = useCallback((g: Partial<GeneralSettings>) => {
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, ...g },
    }));
  }, []);

  const setParameters = useCallback((p: Partial<ParametersSettings>) => {
    setSettings((prev) => ({
      ...prev,
      parameters: { ...prev.parameters, ...p },
    }));
  }, []);

  const setModules = useCallback((m: Partial<ModulesSettings>) => {
    setSettings((prev) => ({
      ...prev,
      modules: { ...prev.modules, ...m },
    }));
  }, []);

  const setMail = useCallback((m: Partial<MailSettings>) => {
    setSettings((prev) => ({
      ...prev,
      mail: { ...prev.mail, ...m },
    }));
  }, []);

  const setSecurity = useCallback((s: Partial<SecuritySettings>) => {
    setSettings((prev) => ({
      ...prev,
      security: { ...prev.security, ...s },
    }));
  }, []);

  const save = useCallback(async () => {
      const changed = getChangedFields(initialSettings, settings);
      await updateSettings(settings, changed);
      saveSettings(settings);
      setInitialSettings(settings);
    },
    [settings, initialSettings]
  );

  const reset = useCallback(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setInitialSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isLoading,
      isDirty,
      setGeneral,
      setParameters,
      setModules,
      setMail,
      setSecurity,
      save,
      reset,
      resetToDefaults,
    }),
    [
      settings,
      isLoading,
      isDirty,
      setGeneral,
      setParameters,
      setModules,
      setMail,
      setSecurity,
      save,
      reset,
      resetToDefaults,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
