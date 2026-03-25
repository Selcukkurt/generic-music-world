/**
 * Gizlilik ve Sır Saklama Taahhüdü — sürüm 1.0
 * Yasal metin kurum içi hukuk onayından geçirilmelidir; bu sürüm ürün uyumu ve sürümleme için yapılandırılmıştır.
 */
export const CONFIDENTIALITY_DOCUMENT_VERSION = "1.0";

export const CONFIDENTIALITY_TITLE = "Gizlilik ve Sır Saklama Taahhüdü";

export const CONFIDENTIALITY_ARTICLES: { id: string; title: string; body: string }[] = [
  {
    id: "1",
    title: "Amaç ve Kapsam",
    body: `Bu taahhütname, Generic Music World (bundan böyle "Şirket") ile aranızdaki çalışma / iş birliği ilişkisi kapsamında tarafınıza sağlanan veya tarafınızca erişilen tüm ticari, teknik, finansal, operasyonel ve kişisel veri niteliğindeki bilgilerin gizliliğinin korunmasını amaçlar.

"Gizli Bilgi", Şirket'e veya Şirket'in müşterilerine, iş ortaklarına veya etkinliklere ilişkin fiilen veya hukuken gizlilik veya sır niteliği taşıyan her türlü bilgiyi ifade eder; yazılı veya sözlü, elektronik ortamda veya fiziksel ortamda olabilir.`,
  },
  {
    id: "2",
    title: "Gizlilik Yükümlülüğü",
    body: `Gizli Bilgi'yi üçüncü kişilere ifşa etmemeyi, yetkisiz kişilerin erişimine açmamayı, kopyalamamayı veya şirket dışına çıkarmamayı; yalnızca işinizi usulüne uygun şekilde yerine getirmek için ve Şirket'in yazılı izni olmaksızın başka amaçlarla kullanmamayı kabul edersiniz.

Şifreler, erişim anahtarları, API anahtarları ve benzeri kimlik bilgilerini paylaşmamayı, güvenli saklama ve parola hijyeni kurallarına uymayı taahhüt edersiniz.`,
  },
  {
    id: "3",
    title: "İstisna ve Kamuya Açık Bilgi",
    body: `Aşağıdaki bilgiler Gizli Bilgi sayılmaz: (i) taahhüt öncesinde kamuya açık hale gelmiş bilgiler; (ii) gizlilik yükümlülüğü olmaksızın yasal olarak edinilmiş bilgiler; (iii) bağımsız olarak geliştirilen bilgiler; (iv) yasal mercilerce zorunlu kılınan beyanlar (önceden Şirket bilgilendirilmeye çalışılır).`,
  },
  {
    id: "4",
    title: "İhlal ve Sonuçlar",
    body: `Gizlilik ihlali halinde Şirket'in sözleşmesel ve kanuni tüm hakları saklıdır. İhlal veya ihlal teşkil edebilecek durumları derhal üst yönetiminize ve veri sorumlusuna bildirmeniz beklenir.`,
  },
  {
    id: "5",
    title: "Geçerlilik Süresi",
    body: `Bu yükümlülük, ilişkinin sona ermesinden sonra da Gizli Bilgi'nin mahiyeti gereği makul süre boyunca veya kanunda öngörülen süre boyunca devam eder.`,
  },
];
