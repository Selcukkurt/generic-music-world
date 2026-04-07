/**
 * Fikri mülkiyet devri sözleşmesi — onboarding modal ve PDF (`contracts/templates/ip_v1.html`).
 * Sürüm `AGREEMENT_VERSIONS.intellectual_property` ile uyumludur.
 */

/** PDF resmî başlık / meta alanı; kapakta `IP_COVER_TITLE` kullanılır. */
export const IP_DOCUMENT_TITLE = "FİKRİ MÜLKİYET VE BULUŞLARIN DEVRİ SÖZLEŞMESİ";

export const IP_DOCUMENT_SUBTITLE = "(Intellectual Property Assignment Agreement)";

/** Kapak kısa başlık (nda_v1 ile aynı hiyerarşi). */
export const IP_COVER_TITLE = "Fikri Mülkiyet ve Buluşların Devri";

export const IP_COVER_SUBTITLE = "Generic Music World";

/** PDF alt bilgi; onboarding gövdesinde madde metinlerinden sonra gösterilir. */
export const IP_PDF_SIGNFOOT =
  "Not: Bu sözleşme 2 (iki) nüsha olarak hazırlanmıştır. Bu belge, yukarıda bilgileri yer alan kullanıcının elektronik ortamda verdiği onayın PDF çıktısıdır.";

export const IP_SUMMARY_BULLETS = [
  "İş ilişkisi kapsamındaki fikri ürünlerde mali hakların şirkete devri ve hizmet eseri statüsü",
  "Süre sonrası teslim, kullanmama ve yardımcı yükümlülükler (imza, başvuru, vekalet)",
  "İstanbul (Beşiktaş) yetkisi ve 5846 / 6769 / TCK çerçevesinde hukuki başvuru hakkı",
] as const;

export type IpContentSection = { id: string; title: string; paragraphs: string[] };

export const IP_SECTIONS: IpContentSection[] = [
  {
    id: "ip-info",
    title: "Sözleşme bilgileri",
    paragraphs: [
      "Sözleşme tarihi: {{date}}",
      "İşveren (şirket): Generic Music Labs Organizasyon Anonim Şirketi",
      "Şirket adresi: Vişnezade Mah. Süleyman Seba Cad. No:79, Valideçeşme, 34357 Beşiktaş / İstanbul",
      "Vergi dairesi / numara: Beşiktaş V.D. / 3941133736",
      "Çalışan: {{full_name}}",
      "Pozisyon / unvan: ......................................................................................",
    ],
  },
  {
    id: "ip-1",
    title: "MADDE 1 – Taraflar ve kapsam",
    paragraphs: [
      "Bu Sözleşme, yukarıda bilgileri yer alan Generic Music Labs Organizasyon Anonim Şirketi (“Şirket”) ile Çalışan arasında, iş akdinin ayrılmaz bir eki olarak akdedilmiştir.",
      "Çalışan, iş ilişkisi kapsamında, Şirket projeleri, Şirket kaynakları, Şirket verileri veya Şirket organizasyonu dahilinde ortaya koyduğu her türlü fikri ürünün bu Sözleşme hükümlerine tabi olduğunu kabul eder.",
    ],
  },
  {
    id: "ip-2",
    title: "MADDE 2 – Tanımlar",
    paragraphs: [
      "Fikri mülkiyet: Çalışanın iş süresi boyunca veya Şirket ile bağlantılı olarak ortaya çıkardığı; yazılım, algoritma, müzik eserleri, ses kayıtları, prodüksiyonlar, tasarımlar, içerikler, veri setleri, teknik dokümanlar, fikirler, geliştirmeler, buluşlar, know-how ve benzeri tüm fikri ürünleri ifade eder.",
      "Hizmet eseri: 5846 sayılı Fikir ve Sanat Eserleri Kanunu kapsamında, iş ilişkisi nedeniyle oluşturulan eserleri ifade eder.",
    ],
  },
  {
    id: "ip-3",
    title: "MADDE 3 – Fikri mülkiyet haklarının devri",
    paragraphs: [
      "3.1 Çalışan, iş ilişkisi süresince tek başına veya ekip ile birlikte geliştirdiği tüm fikri ürünler üzerindeki mali haklarını, yer ve süre sınırı olmaksızın, münhasıran ve geri dönülemez şekilde Şirket’e devrettiğini kabul eder.",
      "3.2 Devredilen haklar; işleme, çoğaltma, yayma, temsil, kamuya iletim, dijital platformlarda kullanım ve üçüncü kişilere lisanslama dahil tüm mali hakları kapsar.",
      "3.3 Bu kapsamda oluşturulan tüm çıktılar, aksi yazılı olarak kararlaştırılmadıkça “hizmet eseri” niteliğindedir.",
      "3.4 Çalışan, bu haklar üzerinde ayrıca herhangi bir bedel, telif veya ek hak talebinde bulunmayacağını kabul eder.",
    ],
  },
  {
    id: "ip-4",
    title: "MADDE 4 – Önceden oluşturulmuş eserler",
    paragraphs: [
      "Çalışan’ın iş ilişkisi başlamadan önce oluşturduğu ve kendisine ait olan eserler bu Sözleşme kapsamı dışındadır. Ancak bu eserlerin Şirket projelerinde kullanılabilmesi için yazılı bildirim ve Şirket onayı gereklidir.",
    ],
  },
  {
    id: "ip-5",
    title: "MADDE 5 – Yardımcı yükümlülükler",
    paragraphs: [
      "Çalışan, fikri mülkiyet haklarının korunması amacıyla gerekli tüm belge, beyan ve başvuruları imzalamayı, Şirket ile iş birliği yapmayı ve gerekli durumlarda vekalet vermeyi kabul eder.",
      "Bu yükümlülük, iş ilişkisi sona erdikten sonra da geçerliliğini korur.",
    ],
  },
  {
    id: "ip-6",
    title: "MADDE 6 – İş akdinin sona ermesi",
    paragraphs: [
      "İş ilişkisi sona erdiğinde Çalışan:",
      "Tüm kaynak kodları, tasarım dosyaları, müzik kayıtları ve ilgili materyalleri eksiksiz teslim eder.",
      "Şirket’e ait hiçbir fikri ürünü kopyalamaz, saklamaz veya kullanmaz.",
      "Devam eden projelere ilişkin tüm bilgi ve çıktıları eksiksiz devreder.",
    ],
  },
  {
    id: "ip-7",
    title: "MADDE 7 – Yaptırımlar ve cezai şart",
    paragraphs: [
      "7.1 Çalışan’ın bu Sözleşme kapsamındaki yükümlülüklerini ihlal etmesi halinde, Şirket; uğradığı her türlü maddi ve manevi zararın tazminini talep etme hakkına sahiptir.",
      "7.2 Çalışan, ihlalin niteliği, kapsamı ve Şirket’e vereceği zararın büyüklüğü dikkate alınarak belirlenecek makul bir cezai şartı ödemeyi kabul eder.",
      "7.3 Şirket’in uğradığı zararın cezai şart tutarını aşması halinde, aşan kısmın ayrıca talep edilebileceğini Çalışan kabul eder.",
      "7.4 Şirket ayrıca 5846 sayılı FSEK, 6769 sayılı Sınai Mülkiyet Kanunu ve Türk Ceza Kanunu kapsamında tüm yasal yollara başvurma hakkını saklı tutar.",
    ],
  },
  {
    id: "ip-8",
    title: "MADDE 8 – Uygulanacak hukuk ve yetki",
    paragraphs: [
      "Bu Sözleşme Türkiye Cumhuriyeti hukukuna tabidir.",
      "Uyuşmazlıklarda İstanbul (Beşiktaş) mahkemeleri ve icra daireleri yetkilidir.",
    ],
  },
  {
    id: "ip-sign",
    title: "Onay ve imza",
    paragraphs: [
      "Taraflar, işbu Sözleşme’yi okuyup anladıklarını ve özgür iradeleriyle kabul ettiklerini beyan ederler.",
      "İşveren (şirket): Generic Music Labs Organizasyon A.Ş.",
      "Yetkili: ................................",
      "İmza:",
      "Çalışan — Ad soyad: {{full_name}}.",
      "T.C. kimlik numarası: ............................................",
      "İmza:",
    ],
  },
];
