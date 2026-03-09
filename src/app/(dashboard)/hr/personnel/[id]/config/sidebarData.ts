import type { SidebarData } from "./sidebar";

/**
 * Mock sidebar data. Replace with API/fetch when integrating real data.
 */
export function getMockSidebarData(personnelId: string): SidebarData {
  return {
    currentStatus: {
      durum: "Aktif",
      sistemHesabi: "Aktif",
      onayBekleyen: 0,
      acikGorev: 0,
    },
    criticalAlerts: [
      {
        id: "1",
        level: "warning",
        message: "Arşiv belgeleri eksik",
        meta: "Son yükleme: 3 ay önce",
      },
      {
        id: "2",
        level: "danger",
        message: "Sözleşme süresi 35 gün içinde doluyor",
        meta: "15.03.2026",
      },
    ],
    upcomingDates: [
      {
        id: "1",
        label: "Sözleşme yenileme",
        type: "Sözleşme",
        date: "15.03.2026",
        daysRemaining: 35,
      },
      {
        id: "2",
        label: "Performans değerlendirmesi",
        type: "360 Değerlendirme",
        date: "01.04.2026",
        daysRemaining: 52,
      },
      {
        id: "3",
        label: "NDA güncelleme",
        type: "Uyum",
        date: "20.02.2026",
        daysRemaining: 12,
      },
    ],
    recentActions: [
      {
        id: "1",
        title: "Event ataması güncellendi",
        meta: "Istanbul Music Summit 2026",
        time: "2 saat önce",
      },
      {
        id: "2",
        title: "RBAC rolü değiştirildi",
        meta: "Event Admin eklendi",
        time: "3 gün önce",
      },
      {
        id: "3",
        title: "Profil görüntülendi",
        meta: "Genel Bakış",
        time: "1 hafta önce",
      },
    ],
    quickAccess: [
      {
        id: "sicil",
        label: "Sicil Görüntüle",
        href: `/m04/personel/sicil?personnelId=${personnelId}`,
      },
      {
        id: "sozlesme",
        label: "Sözleşme",
        href: `/hr/personnel/${personnelId}?tab=finance`,
      },
      {
        id: "rbac",
        label: "RBAC Yönet",
        href: `/system/rbac?userId=${personnelId}`,
      },
      {
        id: "askiya",
        label: "Hesabı Askıya Al",
        onClick: () => {},
      },
    ],
  };
}
