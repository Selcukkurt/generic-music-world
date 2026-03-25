/**
 * Section keys must match subsection ids in GM DNA reader (GMDnaClient TOC).
 * User must mark each section complete before final GM DNA approval.
 */
export const GM_DNA_ONBOARDING_SECTION_KEYS = [
  "biz-kimiz",
  "uzun-vadeli-niyet",
  "manifesto-ozet",
  "degerler-ilkeler",
  "gm-kulturu",
  "organizasyon-yapisi",
  "karar-mekanizmasi",
  "raci-mantigi",
  "yonetim-ritmi",
  "finansal-disiplin",
  "resmi-sirket-bilgileri",
  "dokuman-yonetimi",
  "gizlilik-yaklasimi",
  "hesap-verebilirlik",
] as const;

export type GmDnaSectionKey = (typeof GM_DNA_ONBOARDING_SECTION_KEYS)[number];

export const GM_DNA_SECTION_COUNT = GM_DNA_ONBOARDING_SECTION_KEYS.length;
