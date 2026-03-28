/**
 * Section keys must match subsection ids in GM DNA reader (GMDnaClient TOC).
 * User must mark each section complete before final GM DNA approval.
 *
 * Single source of truth for onboarding + API + DB checks: this array’s length is the
 * required completion count (currently 14 subsections across three TOC groups).
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

/** Required GM DNA subsection count for onboarding (same as `GM_DNA_ONBOARDING_SECTION_KEYS.length`). */
export const GM_DNA_SECTION_COUNT = GM_DNA_ONBOARDING_SECTION_KEYS.length;

/** Flat labels for onboarding checklist (aligned with `GMDnaClient` TOC). */
export const GM_DNA_SECTION_LABELS: Record<GmDnaSectionKey, string> = {
  "biz-kimiz": "Biz Kimiz",
  "uzun-vadeli-niyet": "Uzun Vadeli Niyet",
  "manifesto-ozet": "Manifesto (Özet)",
  "degerler-ilkeler": "Değerler & İlkeler",
  "gm-kulturu": "GM Kültürü",
  "organizasyon-yapisi": "Organizasyon Yapısı",
  "karar-mekanizmasi": "Karar Mekanizması",
  "raci-mantigi": "RACI Mantığı",
  "yonetim-ritmi": "Yönetim Ritmi",
  "finansal-disiplin": "Finansal Disiplin",
  "resmi-sirket-bilgileri": "Resmi Şirket Bilgileri",
  "dokuman-yonetimi": "Doküman Yönetimi",
  "gizlilik-yaklasimi": "Gizlilik Yaklaşımı",
  "hesap-verebilirlik": "Hesap Verebilirlik",
};
