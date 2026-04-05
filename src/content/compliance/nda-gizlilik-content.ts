/**
 * Gizlilik (NDA) metni — onboarding modal. Yasal metin Şirket bilgileri ile eşlenmiştir.
 * Sürüm: compliance `AGREEMENT_VERSIONS.confidentiality` ile uyumlu olmalıdır.
 */

export const NDA_COMPANY = {
  legalName: "Generic Music Labs Organizasyon Anonim Şirketi",
  address: "Vişnezade Mah. Süleyman Seba Cad. No:79, Valideçeşme, 34357 Beşiktaş/İstanbul",
  taxNumber: "3941133736",
  taxOffice: "Beşiktaş",
} as const;

export const NDA_SUMMARY_BULLETS = [
  "Şirket bilgilerini koruma yükümlülüğü getirir",
  "İşten sonra 5 yıl geçerlidir",
  "İhlaller hukuki ve cezai sonuç doğurur",
] as const;

export type NdaSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const NDA_SECTIONS: NdaSection[] = [
  {
    id: "m1",
    title: "MADDE 1 — Taraflar, Tanımlar ve Amaç",
    paragraphs: [
      `İşbu Gizlilik Sözleşmesi ("Sözleşme"), bir tarafta ${NDA_COMPANY.legalName} ("Şirket") ile diğer tarafta platform üzerinden kurumsal onboarding kapsamında tanımlanan kişi ("Çalışan") arasında akdedilmiştir.`,
      "Şirket ile Çalışan birlikte \"Taraflar\" olarak anılacaktır.",
      "Gizli Bilgi: Şirket'e, Şirket'in iştiraklerine, müşterilerine, iş ortaklarına veya üçüncü kişilere ait olan; ticari, teknik, mali, operasyonel, hukuki, kişisel veri içeren veya rekabet değeri taşıyan; açıkça veya örtülü olarak gizli olduğu belirtilen veya makul bir iş adamı sıfatıyla gizliliği gerektiren her türlü bilgi, belge, yazılım, kayıt, veri seti, know-how, süreç, plan, strateji ve benzeri unsurları ifade eder.",
    ],
  },
  {
    id: "m2",
    title: "MADDE 2 — Gizli Bilginin Kapsamı",
    paragraphs: [
      "Çalışan, erişim sağladığı veya işbu Sözleşme kapsamında öğrendiği tüm Gizli Bilgiyi koruyacağını kabul eder. Gizli Bilgi, yazılı, sözlü, dijital veya diğer tüm formatlarda olabilir.",
      "Özellikle ve sınırlama olmaksızın; yayın ve prodüksiyon takvimleri, sanatçı/yönetmen/sözleşme verileri, finansal tablolar, fiyatlandırma, pazarlama planları, kaynak kodu, altyapı mimarisi, güvenlik politikaları, çalışan ve iş ortaklarına ilişkin kişisel veriler ve benzeri hususlar Gizli Bilgi sayılır.",
      "Herkese açık hale gelmiş bilgiler, Taraflarca yazılı olarak gizli olmaktan çıkarılmış bilgiler veya yürürlükteki mevzuat gereği ifşa edilmesi zorunlu olan bilgiler, yazılı gerekçe ve tutanakla sınırlı olmak kaydıyla bu kapsamın dışında kalır.",
    ],
  },
  {
    id: "m3",
    title: "MADDE 3 — Yükümlülükler ve Kullanım Sınırları",
    paragraphs: [
      "Çalışan, Gizli Bilgiyi yalnızca Şirket'in yazılı olarak yetkilendirdiği iş amaçları doğrultusunda kullanır; yetkisiz üçüncü kişilerle paylaşmaz, çoğaltmaz, yaymaz, devretmez ve güvenliği tehdit edecek şekilde işlemez.",
      "Çalışan, gerekli özeni göstererek Gizli Bilgiyi saklar; kaybolması, çalınması veya yetkisiz erişime açılması hâlinde derhal Şirket'i haberdar eder.",
      "Alt işveren, danışman veya üçüncü kişilere aktarım ancak Şirket'in önceden yazılı muvafakati ile ve en az aynı düzeyde gizlilik yükümlülüğü altında mümkündür.",
    ],
  },
  {
    id: "m4",
    title: "MADDE 4 — Fikri Mülkiyet ve Bölünebilirlik",
    paragraphs: [
      "Gizli Bilgi üzerindeki fikri mülkiyet hakları Şirket'e ve ilgili hak sahiplerine aittir; işbu Sözleşme Çalışan'a herhangi bir devredilecek hak veya lisans vermez.",
      "Sözleşme hükümlerinin herhangi birinin geçersiz sayılması, diğer hükümlerin bütünlük ve uygulanabilirliğini etkilemez (Bölünebilirlik). Şirket'in bu Sözleşme kapsamındaki hakları ve menfaatleri bir bütün olarak korunur (Bütünlük).",
    ],
  },
  {
    id: "m5",
    title: "MADDE 5 — Süre",
    paragraphs: [
      "Çalışanın gizlilik yükümlülükleri, iş ilişkisi devam ederken ve sona erdikten sonra beş (5) yıl süreyle devam eder.",
      "Kişisel verilere veya bazı ticari sırlara ilişkin yükümlülükler, mevzuatta öngörülen azami süreler çerçevesinde daha uzun süreyle saklıdır.",
    ],
  },
  {
    id: "m6",
    title: "MADDE 6 — İhlal, Cezai ve Hukuki Sonuçlar",
    paragraphs: [
      "Gizli Bilginin korunmaması veya kötüye kullanılması hâlinde, Şirket uğradığı doğrudan ve dolaylı tüm zararların tazminini, ihlalin tespiti ve önlenmesi amacıyla gereken hukuki başvuruları ve ilgili mercilere şikâyet süreçlerini yürütme hakkını saklı tutar.",
      "İhlaller, kabahat veya suç teşkil edebilecek hâllerde ilgili kamu otoriteleri nezdinde cezai sonuçlar doğurabilir.",
      "Çalışan, bu yükümlülüklerin yerine getirildiğini yazılı olarak beyan etmekle yükümlüdür.",
    ],
  },
];
