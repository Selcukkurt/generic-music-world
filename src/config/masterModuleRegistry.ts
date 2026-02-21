/**
 * Master Module Registry – system-level module definitions.
 * UI content in Turkish; structure in English.
 */

export type ModuleRegistryStatus = "IN_PROGRESS" | "ACTIVE" | "PLANNED";

export type MasterModuleRegistryItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: ModuleRegistryStatus;
  is_reference: boolean;
  created_at: string;
  updated_at: string;
};

const SEED_TIMESTAMP = "2026-02-16T00:00:00.000Z";

const createModule = (
  id: string,
  name: string,
  code: string,
  description: string,
  is_reference: boolean
): MasterModuleRegistryItem => ({
  id,
  name,
  code,
  description,
  status: "IN_PROGRESS",
  is_reference,
  created_at: SEED_TIMESTAMP,
  updated_at: SEED_TIMESTAMP,
});

export const masterModuleRegistry: MasterModuleRegistryItem[] = [
  createModule(
    "M01",
    "Katılımcı ve Bilet Operasyonları",
    "BiletOps",
    "Katılımcı verileri, bilet satış süreçleri, giriş kontrolü ve satış raporlamasını yönetir.",
    true
  ),
  createModule(
    "M02",
    "Etkinlik Operasyonları",
    "EtkinlikOps",
    "Etkinlik yaşam döngüsünü, takvim yönetimini, mekan koordinasyonunu ve operasyonel süreci yönetir.",
    false
  ),
  createModule(
    "M03",
    "Finans ve Muhasebe Operasyonları",
    "FinansOps",
    "Bütçe takibi, gider kontrolü, gelir mutabakatı ve finansal raporlamayı yönetir.",
    false
  ),
  createModule(
    "M04",
    "İK ve Organizasyon Operasyonları",
    "PeopleOps",
    "Organizasyon yapısı, ekip atamaları, rol yönetimi ve insan kaynakları süreçlerini yönetir.",
    false
  ),
  createModule(
    "M05",
    "Pazarlama ve İletişim Operasyonları",
    "MarketingOps",
    "Kampanya yönetimi, iletişim kanalları ve hedef kitle etkileşim süreçlerini yönetir.",
    false
  ),
  createModule(
    "M06",
    "Kurumsal İlişkiler ve Sponsorluk Operasyonları",
    "CorporateOps",
    "Sponsor yönetimi, kurumsal iş birlikleri ve sözleşme süreçlerini yönetir.",
    false
  ),
  createModule(
    "M07",
    "Kreatif Operasyonları",
    "KreatifOps",
    "Görsel üretim, tasarım süreçleri ve kreatif içerik operasyonlarını yönetir.",
    false
  ),
  createModule(
    "M08",
    "Dahili Biletleme Modülü",
    "InternalTicketing",
    "Şirket içi özel bilet tahsisi ve kontrol süreçlerini yönetir.",
    false
  ),
  createModule(
    "M09",
    "Veri ve Analiz",
    "BIOps",
    "Operasyonel verileri analiz eder, KPI takibi ve performans raporlaması sağlar.",
    false
  ),
  createModule(
    "M10",
    "Yönetim ve Strateji Operasyonları",
    "ManagementOps",
    "Üst yönetim karar destek verileri ve stratejik planlama süreçlerini yönetir.",
    false
  ),
  createModule(
    "M11",
    "Web Sitesi ve İçerik Yönetimi",
    "WebOps",
    "Web sitesi içerik yönetimi, yayınlama ve güncelleme süreçlerini yönetir.",
    false
  ),
  createModule(
    "M12",
    "Sanatçı ve Ajans Operasyonları",
    "GMAOps",
    "Sanatçı ilişkileri, ajans koordinasyonu ve kontrat süreçlerini yönetir.",
    false
  ),
];

/** Get the reference module (is_reference = true). */
export const getReferenceModule = (): MasterModuleRegistryItem | undefined =>
  masterModuleRegistry.find((m) => m.is_reference);

/** Get module by id. */
export const getModuleById = (id: string): MasterModuleRegistryItem | undefined =>
  masterModuleRegistry.find((m) => m.id.toUpperCase() === id.toUpperCase());
