/**
 * Centralized Personnel 360 mock data.
 * Single source for all tab and sidebar data.
 * Replace with API fetch when integrating real data.
 */

import type { Personnel360Data } from "./personnel360.types";

/**
 * Returns mock Personnel 360 data for the given personnel ID.
 * Light variation based on personnelId for testing different scenarios.
 */
export function getPersonnel360MockData(personnelId: string): Personnel360Data {
  const variant = personnelId.length % 3; // 0, 1, or 2 for light variation
  const isVariant1 = variant === 1;
  const isVariant2 = variant === 2;

  const baseName = isVariant1 ? "Ayşe Demir" : isVariant2 ? "Marcus Chen" : "Selçuk Kurt";
  const baseInitials = isVariant1 ? "AD" : isVariant2 ? "MC" : "SK";
  const baseEmail = isVariant1
    ? "ayse.demir@genericmusicworld.com"
    : isVariant2
      ? "marcus.chen@genericmusicworld.com"
      : "selcuk@example.com";

  const openTaskCount = isVariant2 ? 2 : 0;
  const feedbackCount = isVariant1 ? 5 : isVariant2 ? 12 : 8;

  return {
    header: {
      initials: baseInitials,
      fullName: baseName,
      title: isVariant1 ? "Producer" : isVariant2 ? "Lead Engineer" : "Senior Producer",
      email: baseEmail,
      manager: "Ahmet Yılmaz",
      status: "Aktif",
      statusVariant: "active",
    },
    kpi: [
      { label: "Açık Görev", value: String(openTaskCount) },
      { label: "Aktif Event Ataması", value: isVariant2 ? "1" : "2" },
      { label: "Yetki Seviyesi", value: isVariant2 ? "Viewer" : "Admin" },
      { label: "Bekleyen Onay", value: "0" },
      { label: "Son Değerlendirme", value: "—" },
      { label: "Son Aktivite", value: "—" },
    ],
    overview: {
      identity: {
        adSoyad: baseName,
        kurumsalEposta: baseEmail.replace("@", ".corp@"),
        kisiselEposta: `${baseEmail.split("@")[0]}.personal@gmail.com`,
        telefon: "+90 532 123 45 67",
        unvan: isVariant1 ? "Producer" : isVariant2 ? "Lead Engineer" : "Senior Producer",
        departman: "Prodüksiyon & Operasyonlar",
        yonetici: "Ahmet Yılmaz",
        lokasyon: "İstanbul, Türkiye",
        iseGirisTarihi: "15.03.2019",
        toplamKidem: "5 yıl 11 ay",
        calismaModeli: "Hibrit",
        sistemDurumu: "Aktif",
      },
      orgPosition: {
        costCenter: "CC-PROD-001",
        rbacRolu: isVariant2 ? "Viewer" : "Admin",
        sistemHesabiDurumu: "Aktif",
        maasBandi: "P3 - Senior",
        modulSorumlulugu: "M02 Events, M04 Personel",
        hiyerarsikSeviye: "L3 - Kıdemli",
        kisaProfesyonelOzet:
          "Müzik endüstrisinde 10+ yıllık deneyim. Etkinlik prodüksiyonu, sahne yönetimi ve sanatçı koordinasyonu alanlarında uzman.",
      },
      compliance: {
        gmwDnaOnayi: "ok",
        ndaDurumu: "ok",
        isSozlesmesiDurumu: "ok",
        arsivDurumu: "pending",
      },
      responsibilities: {
        etkinlikler: [
          { event: "Istanbul Music Summit 2026", role: "Sahne Yöneticisi" },
          { event: "Berlin Showcase", role: "Prodüksiyon Sorumlusu" },
        ],
        roller: isVariant2 ? ["Personel Görüntüleyici"] : ["Event Admin", "Personel Görüntüleyici"],
        anaSorumluluklar: [
          "Q2 Artist Operations Review — Koordinasyon",
          "Yıllık Bütçe Planlaması — Katkı",
        ],
      },
      activity: [
        {
          iconKey: "assignment",
          title: "Event ataması güncellendi",
          description: "Istanbul Music Summit 2026 — Sahne Yöneticisi",
          time: "2 saat önce",
        },
        {
          iconKey: "task",
          title: "Görev tamamlandı",
          description: "Prodüksiyon checklist onaylandı",
          time: "1 gün önce",
        },
        {
          iconKey: "role",
          title: "RBAC rolü değiştirildi",
          description: "Event Admin rolü eklendi",
          time: "3 gün önce",
        },
        {
          iconKey: "performance",
          title: "Performans notu eklendi",
          description: "Q1 2025 değerlendirmesi",
          time: "1 hafta önce",
        },
        {
          iconKey: "contract",
          title: "Sözleşme görüntülendi",
          description: "İş sözleşmesi v2.1",
          time: "2 hafta önce",
        },
      ],
    },
    finance: {
      agreementFramework: {
        calismaModeli: "Hibrit",
        sozlesmeTipi: "Belirsiz Süreli",
        baslangicTarihi: "15.03.2019",
        bitisTarihi: "15.03.2026",
        kalanGun: 35,
        gmwDnaOnayi: "ok",
        ndaDurumu: "ok",
        isSozlesmesiDurumu: "ok",
      },
      paymentMethod: {
        odemeTuru: "Aylık Bordro",
        faturaGerekliligi: "Gerekli değil",
        vergiBelgeDurumu: "Beyanname tamam",
        odemeKanali: "Banka Havalesi",
        hesapYontemOzeti: "TR XX XXXX ... 1234",
      },
      dynamicHakedis: {
        temelUcret: "₺85.000 / ay",
        bonusModeli: "Performans + Proje",
        projeBazliEkOdeme: "Etkinlik bazlı",
        toplamTahakkuk: "₺92.400",
        sonOdemeTarihi: "31.01.2026",
        guncelOdemeStatusu: "Ödendi",
        recentEarnings: [
          { id: "1", label: "Istanbul Music Summit hakedişi", amount: "₺4.200", date: "15.01.2026" },
          { id: "2", label: "Berlin Showcase ek ödemesi", amount: "₺2.800", date: "10.01.2026" },
          { id: "3", label: "Q1 operasyon bonusu", amount: "₺3.600", date: "05.01.2026" },
        ],
      },
      documentArchive: [
        { id: "1", belgeAdi: "İş Sözleşmesi", belgeTipi: "Sözleşme", tarih: "15.03.2024", versiyonDurum: "v2.1" },
        { id: "2", belgeAdi: "NDA Belgesi", belgeTipi: "Gizlilik", tarih: "10.02.2019", versiyonDurum: "Onaylı" },
        { id: "3", belgeAdi: "Ocak 2026 Faturası", belgeTipi: "Fatura / Voucher", tarih: "31.01.2026", versiyonDurum: "Ödendi" },
        { id: "4", belgeAdi: "Aralık 2025 Bordro", belgeTipi: "Bordro / Ödeme Belgesi", tarih: "15.12.2025", versiyonDurum: "v1" },
      ],
    },
    tasks: {
      openTasks: [
        {
          id: "1",
          gorevAdi: "Istanbul Music Summit sahne planı onayı",
          kisaAciklama: "Ana sahne ve yan sahnelerin teknik rider ile uyumlu planlaması",
          oncelik: "high",
          durum: "in_progress",
          teslimTarihi: "20.02.2026",
          ilgiliAlan: "Prodüksiyon",
        },
        {
          id: "2",
          gorevAdi: "Berlin Showcase sanatçı koordinasyonu",
          kisaAciklama: "Performans sırası ve green room düzenlemeleri",
          oncelik: "medium",
          durum: "open",
          teslimTarihi: "28.02.2026",
          ilgiliAlan: "Operasyon",
        },
        {
          id: "3",
          gorevAdi: "Q2 bütçe revizyonu katkısı",
          kisaAciklama: "Prodüksiyon maliyetleri özeti ve öneriler",
          oncelik: "low",
          durum: "open",
          teslimTarihi: "15.03.2026",
          ilgiliAlan: "Finans",
        },
      ],
      completedTasks: [
        { id: "1", gorevAdi: "IMS 2026 teknik rider hazırlığı", tamamlanmaTarihi: "05.02.2026", meta: "Prodüksiyon" },
        { id: "2", gorevAdi: "Berlin Showcase lojistik onayı", tamamlanmaTarihi: "01.02.2026", meta: "Operasyon" },
        { id: "3", gorevAdi: "Ocak ayı performans raporu", tamamlanmaTarihi: "28.01.2026", meta: "Raporlama" },
      ],
      eventAssignments: [
        { id: "1", etkinlikAdi: "Istanbul Music Summit 2026", lokasyon: "Harbiye", tarih: "15–17.05.2026", atananRol: "Sahne Yöneticisi", durum: "upcoming", operasyonOzeti: "Ana sahne ve 2 yan sahne koordinasyonu" },
        { id: "2", etkinlikAdi: "GMW Showcase Berlin", lokasyon: "Berlin Arena", tarih: "22.03.2026", atananRol: "Prodüksiyon Sorumlusu", durum: "upcoming", operasyonOzeti: "Teknik prodüksiyon ve sahne yönetimi" },
        { id: "3", etkinlikAdi: "A&R Talent Hunt Ankara", lokasyon: "Congresium", tarih: "10.01.2026", atananRol: "Jüri Üyesi", durum: "completed", operasyonOzeti: "Seçim paneli ve değerlendirme" },
      ],
      relatedDocuments: [
        { id: "1", belgeAdi: "Teknik Rider", belgeTipi: "Teknik Doküman", tarih: "01.02.2026", boyutVersiyon: "v3.2" },
        { id: "2", belgeAdi: "Etkinlik Planı", belgeTipi: "Planlama", tarih: "15.01.2026", boyutVersiyon: "2.4 MB" },
        { id: "3", belgeAdi: "Sunum Dosyası", belgeTipi: "Sunum", tarih: "20.01.2026", boyutVersiyon: "v1" },
        { id: "4", belgeAdi: "Operasyon Raporu", belgeTipi: "Rapor", tarih: "31.01.2026", boyutVersiyon: "Q1 2026" },
      ],
    },
    organization: {
      hierarchySchema: {
        ustYonetici: { id: "1", adSoyad: "Ahmet Yılmaz", unvan: "CEO / Genel Müdür" },
        mevcutPersonel: { id: "2", adSoyad: baseName, unvan: isVariant1 ? "Producer" : isVariant2 ? "Lead Engineer" : "Senior Producer", isCurrentPerson: true },
        direktRaporlayanlar: [{ id: "3", adSoyad: isVariant2 ? "Selçuk Kurt" : "Marcus Chen", unvan: "Lead Engineer" }],
      },
      reportingAuthority: {
        dogrudanYonetici: "Ahmet Yılmaz",
        fonksiyonelYonetici: "Ahmet Yılmaz",
        hiyerarsikSeviye: "L3 - Kıdemli",
        onayZinciri: "Yönetici → CEO",
        modulSorumlulugu: "M02 Events, M04 Personel",
        departmanSahibi: "Ahmet Yılmaz",
      },
      departmentInfo: {
        departman: "Prodüksiyon & Operasyonlar",
        butce: "₺2.4M / yıl",
        costCenter: "CC-PROD-001",
        departmanBaskani: "Ahmet Yılmaz",
        ekipUyeSayisi: "12",
        anaSorumlulukAlani: "Etkinlik prodüksiyonu, sahne yönetimi, operasyon koordinasyonu",
      },
      delegation: {
        aktifVekalet: false,
        vekaletVerilenKisi: "—",
        baslangicTarihi: "—",
        bitisTarihi: "—",
        notAciklama: "Aktif vekalet bulunmuyor.",
      },
      fallbackRules: [
        { id: "1", kosul: "Eğer direkt yönetici yoksa", sonuc: "Fonksiyonel yönetici devreye girer." },
        { id: "2", kosul: "Eğer departman sahibi yoksa", sonuc: "Üst seviye departman başkanı devralır." },
        { id: "3", kosul: "Eğer modül owner boşsa", sonuc: "Görev sistem admin'e atanır." },
      ],
    },
    performance: {
      performanceSummary: {
        genelPuan: "4.2 / 5",
        feedbackSayisi: feedbackCount,
        etkinlikKatkisi: "12 etkinlik",
        sonDegerlendirmeTarihi: "15.01.2026",
      },
      competencies: [
        { id: "1", label: "Teknik Yetkinlik", score: 85 },
        { id: "2", label: "Operasyonel Disiplin", score: 90 },
        { id: "3", label: "Liderlik", score: 75 },
        { id: "4", label: "Ekip Uyumu", score: 88 },
        { id: "5", label: "Zaman Yönetimi", score: 72 },
        { id: "6", label: "GMW DNA Uyum Skoru", score: 92 },
      ],
      feedback: [
        { id: "1", degerlendirenKisi: "Ahmet Yılmaz", degerlendirmeTipi: "yonetici", puan: 4.5, kisaYorum: "Etkinlik prodüksiyonunda güçlü performans.", tarih: "15.01.2026" },
        { id: "2", degerlendirenKisi: "Marcus Chen", degerlendirmeTipi: "peer", puan: 4.0, kisaYorum: "Koordinasyon ve iletişim çok iyi.", tarih: "12.01.2026" },
        { id: "3", degerlendirenKisi: baseName, degerlendirmeTipi: "self", puan: 4.0, kisaYorum: "Teknik alanda güçlü, liderlik gelişimine odaklanıyorum.", tarih: "10.01.2026" },
      ],
      developmentAreas: {
        gucluYonler: ["Etkinlik prodüksiyonu ve sahne yönetimi", "Stakeholder koordinasyonu", "Teknik problem çözme"],
        gelisimAlanlari: ["Liderlik ve ekip yönetimi", "Sunum ve topluluk önünde konuşma"],
        onerilenSonrakiAdim: "Q2'de liderlik eğitimi ve mentorluk programına katılım önerilir.",
      },
      trainingCertifications: [
        { id: "1", ad: "Proje Yönetimi Temelleri", kurumKaynak: "GMW Academy", tamamlanmaTarihi: "15.06.2024", gecerlilikDurumu: "Süresiz", belgeDurumu: "Onaylı" },
        { id: "2", ad: "Etkinlik Prodüksiyonu Sertifikası", kurumKaynak: "EventPro", tamamlanmaTarihi: "20.03.2025", gecerlilikDurumu: "2 yıl", belgeDurumu: "Onaylı" },
        { id: "3", ad: "GMW DNA Onboarding", kurumKaynak: "İK", tamamlanmaTarihi: "01.04.2019", gecerlilikDurumu: "Süresiz", belgeDurumu: "Onaylı" },
      ],
      trendData: [
        { period: "Ocak", value: 4.2 },
        { period: "Şubat", value: 4.0 },
        { period: "Mart", value: 4.3 },
        { period: "Nisan", value: 4.1 },
      ],
    },
    history: {
      activitySummary: {
        son30GunIslemSayisi: 24,
        sonRolDegisikligi: "15.01.2026 — Event Admin eklendi",
        sonSozlesmeGuncellemesi: "15.03.2024 — v2.1",
        sonPerformansDegerlendirmesi: "15.01.2026 — Q1 2025",
      },
      careerJourney: [
        { id: "1", tip: "unvan_degisikligi", baslik: "Senior Producer", kisaAciklama: "Prodüksiyon ve operasyon alanında kıdemli rol", tarih: "01.04.2023", onceMeta: "Producer", sonraMeta: "Senior Producer" },
        { id: "2", tip: "departman_transferi", baslik: "Prodüksiyon & Operasyonlar", kisaAciklama: "Etkinlik ekibinden ana prodüksiyon departmanına transfer", tarih: "15.06.2022", onceMeta: "Etkinlik Ekibi", sonraMeta: "Prodüksiyon & Operasyonlar" },
        { id: "3", tip: "modul_sorumlulugu", baslik: "M02 Events, M04 Personel", kisaAciklama: "Modül sorumluluğu genişletildi", tarih: "01.01.2024", onceMeta: "M02 Events", sonraMeta: "M02 Events, M04 Personel" },
        { id: "4", tip: "maas_bandi", baslik: "P3 - Senior", kisaAciklama: "Maaş bandı güncellemesi", tarih: "01.04.2023", onceMeta: "P2", sonraMeta: "P3 - Senior" },
      ],
      auditLog: [
        { id: "1", islemTipi: "Profil Görüntüleme", kisaAciklama: "360° Personel Kartı açıldı", tarihSaat: "08.02.2026 14:32", yapanKisi: "Ahmet Yılmaz", ipBilgisi: "192.168.1.105", cihazOturumOzeti: "Chrome / Masaüstü" },
        { id: "2", islemTipi: "RBAC Rol Güncelleme", kisaAciklama: "Event Admin rolü eklendi", tarihSaat: "15.01.2026 10:15", yapanKisi: "Sistem Admin", ipBilgisi: "10.0.0.12", cihazOturumOzeti: "Sistem" },
        { id: "3", islemTipi: "Performans Notu", kisaAciklama: "Q1 2025 değerlendirmesi kaydedildi", tarihSaat: "15.01.2026 09:45", yapanKisi: "Ahmet Yılmaz", ipBilgisi: "192.168.1.105", cihazOturumOzeti: "Chrome / Masaüstü" },
        { id: "4", islemTipi: "Sözleşme Görüntüleme", kisaAciklama: "İş sözleşmesi v2.1 indirildi", tarihSaat: "10.01.2026 16:20", yapanKisi: baseName, ipBilgisi: "192.168.1.88", cihazOturumOzeti: "Safari / Mobil" },
      ],
      milestones: [
        { id: "1", tip: "onboarding", baslik: "İşe Başlama", tarih: "15.03.2019", meta: "GMW Academy tamamlandı" },
        { id: "2", tip: "odul_takdir", baslik: "Yılın Prodüksiyon Ödülü", tarih: "20.12.2024", meta: "Istanbul Music Summit 2024" },
        { id: "3", tip: "performans_donum", baslik: "Q1 2025 Değerlendirmesi", tarih: "15.01.2026", meta: "4.2 / 5" },
      ],
      revisionHistory: [
        { id: "1", belgeAdi: "İş Sözleşmesi", versiyon: "v2.1", tarih: "15.03.2024", durum: "Onaylı" },
        { id: "2", belgeAdi: "NDA Belgesi", versiyon: "v1.0", tarih: "10.02.2019", durum: "Onaylı" },
        { id: "3", belgeAdi: "Gizlilik Politikası Onayı", versiyon: "2024.1", tarih: "01.01.2024", durum: "Onaylı" },
        { id: "4", belgeAdi: "Maaş Bandı Belgesi", versiyon: "P3-2023", tarih: "01.04.2023", durum: "Aktif" },
      ],
    },
    sidebar: {
      currentStatus: {
        durum: "Aktif",
        sistemHesabi: "Aktif",
        onayBekleyen: 0,
        acikGorev: openTaskCount,
      },
      criticalAlerts: [
        { id: "1", level: "warning", message: "Arşiv belgeleri eksik", meta: "Son yükleme: 3 ay önce" },
        { id: "2", level: "danger", message: "Sözleşme süresi 35 gün içinde doluyor", meta: "15.03.2026" },
      ],
      upcomingDates: [
        { id: "1", label: "Sözleşme yenileme", type: "Sözleşme", date: "15.03.2026", daysRemaining: 35 },
        { id: "2", label: "Performans değerlendirmesi", type: "360 Değerlendirme", date: "01.04.2026", daysRemaining: 52 },
        { id: "3", label: "NDA güncelleme", type: "Uyum", date: "20.02.2026", daysRemaining: 12 },
      ],
      recentActions: [
        { id: "1", title: "Event ataması güncellendi", meta: "Istanbul Music Summit 2026", time: "2 saat önce" },
        { id: "2", title: "RBAC rolü değiştirildi", meta: "Event Admin eklendi", time: "3 gün önce" },
        { id: "3", title: "Profil görüntülendi", meta: "Genel Bakış", time: "1 hafta önce" },
      ],
      quickAccess: [
        { id: "sicil", label: "Sicil Görüntüle", href: `/m04/personel/sicil?personnelId=${personnelId}` },
        { id: "sozlesme", label: "Sözleşme", href: `/hr/personnel/${personnelId}?tab=finance` },
        { id: "rbac", label: "RBAC Yönet", href: `/system/rbac?userId=${personnelId}` },
        { id: "askiya", label: "Hesabı Askıya Al", onClick: () => {} },
      ],
    },
  };
}
