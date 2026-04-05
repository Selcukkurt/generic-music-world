/**
 * Fikri mülkiyet taahhüdü — onboarding modal. Sürüm `AGREEMENT_VERSIONS.intellectual_property` ile uyumludur.
 */

export const IP_SUMMARY_BULLETS = [
  "Kurumsal kaynaklarla üretilen içerik ve geliştirmeler için çerçeve taahhüdüdür",
  "Ayrıntılı hükümler görev ve personel sürecinde netleştirilir",
  "Onay, bu çerçevenin okunup kaydedilmesiyle oluşur",
] as const;

export type IpContentSection = { id: string; title: string; paragraphs: string[] };

export const IP_SECTIONS: IpContentSection[] = [
  {
    id: "ip-1",
    title: "Taahhüt özeti",
    paragraphs: [
      "Çalışmalarınızdan doğan haklar ve şirket fikri mülkiyeti hakkında kurumsal çerçeve taahhüdüdür; ayrıntılar görev kapsamınıza göre personel sürecinde netleştirilir.",
      "Kurumsal kaynaklarla üretilen veya bunlara dayanan eserlerin ve geliştirmelerin, ilgili mevzuat ve şirket politikaları çerçevesinde Generic Music tarafından kullanımına ilişkin çerçeve bu taahhüt ile onaylanır. Görev tanımınıza özgü ayrıntılı hükümler, personel atama ve sözleşme aşamasında ele alınacaktır.",
    ],
  },
  {
    id: "ip-2",
    title: "Devam eden yükümlülük",
    paragraphs: [
      "Bu adımda verdiğiniz onay, onboarding kapsamındaki bilgilendirme ve çerçeve metnine ilişkindir. İş sözleşmesi, görev tanımı veya ayrı sözleşmelerle düzenlenen detaylar bu metnin yerine geçmez; çelişki halinde ilgili yazılı düzenlemeler önceliklidir.",
    ],
  },
];
