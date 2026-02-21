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
  NotificationSettings,
  IntegrationSettings,
  AppearanceSettings,
} from "./types";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./store";

type SettingsContextValue = {
  settings: SystemSettings;
  isDirty: boolean;
  setGeneral: (g: Partial<GeneralSettings>) => void;
  setNotifications: (n: Partial<NotificationSettings>) => void;
  setIntegrations: (i: Partial<IntegrationSettings>) => void;
  setAppearance: (a: Partial<AppearanceSettings>) => void;
  save: () => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setInitialSettings(loaded);
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

  const setNotifications = useCallback((n: Partial<NotificationSettings>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...n },
    }));
  }, []);

  const setIntegrations = useCallback((i: Partial<IntegrationSettings>) => {
    setSettings((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, ...i },
    }));
  }, []);

  const setAppearance = useCallback((a: Partial<AppearanceSettings>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...a },
    }));
  }, []);

  const save = useCallback(() => {
    saveSettings(settings);
    setInitialSettings(settings);
  }, [settings]);

  const reset = useCallback(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isDirty,
      setGeneral,
      setNotifications,
      setIntegrations,
      setAppearance,
      save,
      reset,
    }),
    [
      settings,
      isDirty,
      setGeneral,
      setNotifications,
      setIntegrations,
      setAppearance,
      save,
      reset,
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
