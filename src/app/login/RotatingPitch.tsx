"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n/LocaleProvider";

export default function RotatingPitch() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { dict } = useI18n();

  const scenario = useMemo(
    () => dict.login_pitch[index],
    [dict.login_pitch, index]
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.visibilityState !== "visible");
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (reduceMotion || isPaused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setIsVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % scenarios.length);
        setIsVisible(true);
      }, 250);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [reduceMotion, isPaused]);

  return (
    <div className="min-h-[180px] max-w-xl">
      <div
        className={`transition-all duration-700 ease-out ${
          reduceMotion
            ? "opacity-100 translate-y-0"
            : isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
        }`}
      >
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          {scenario.title}
        </h1>
        <p className="ui-text-secondary mt-3 text-sm sm:text-base">
          {scenario.body}
        </p>
      </div>
    </div>
  );
}
