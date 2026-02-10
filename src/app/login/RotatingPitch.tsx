"use client";

import { useEffect, useMemo, useState } from "react";

const scenarios = [
  {
    title: "Generic Music World'e Hoş Geldin.",
    body:
      "Müziğin arka planındaki o devasa emeği biliyoruz. Dosyalar ve karmaşık tablolar arasında kaybolma; tüm operasyonunu senin için tek bir dijital evrende topladık.",
  },
  {
    title: "Senin Dünyan, Senin Operasyonun.",
    body:
      "11 modülün ve tüm ekibin aynı ritimle çalıştığı dijital omurgan burası. 'Single source of truth' prensibiyle, hız kesmeden en doğru kararları al.",
  },
  {
    title: "Her Şey Tek Bir Çatı Altında.",
    body:
      "Operasyonun tüm sesleri burada kusursuz bir orkestraya dönüşüyor. Manuel işleri azalt, şeffaflığı artır ve sadece geleceği yönetmeye odaklan.",
  },
  {
    title: "Veriyi Vizyona Dönüştür.",
    body:
      "Finansal şeffaflıktan sosyal medya analizine kadar her veri bir sonraki büyük adımın için bir ipucu. Geleceğin stratejik hedeflerini bugünden inşa et.",
  },
  {
    title: "Sınırları Olmayan Bir Ekosistem.",
    body:
      "8'den fazla departman, tek bir ortak hedef. Generic Music World, iş hacmin büyüdükçe seninle birlikte esneyen ve gelişen dijital yol arkadaşın.",
  },
];

export default function RotatingPitch() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const scenario = useMemo(() => scenarios[index], [index]);

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
