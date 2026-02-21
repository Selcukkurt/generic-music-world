"use client";

import { useCallback, useState } from "react";
import GMDnaAcceptanceCard from "./GMDnaAcceptanceCard";

const EXPAND_DURATION_MS = 220;

const COMPANY_INFO_ROWS = [
  { label: "Ticari Ünvan", value: "—" },
  { label: "Vergi Dairesi", value: "—" },
  { label: "Vergi No", value: "—" },
  { label: "MERSİS No", value: "—" },
  { label: "Merkez Adres", value: "—" },
  { label: "Kuruluş Yılı", value: "—" },
] as const;

const TOC_ITEMS = [
  {
    id: "who-we-are",
    title: "BİZ KİMİZ",
    items: [
      { id: "biz-kimiz", title: "Biz Kimiz" },
      { id: "uzun-vadeli-niyet", title: "Uzun Vadeli Niyet" },
      { id: "manifesto-ozet", title: "Manifesto (Özet)" },
      { id: "degerler-ilkeler", title: "Değerler & İlkeler" },
      { id: "gm-kulturu", title: "GM Kültürü" },
    ],
  },
  {
    id: "how-we-work",
    title: "NASIL ÇALIŞIRIZ",
    items: [
      { id: "organizasyon-yapisi", title: "Organizasyon Yapısı" },
      { id: "karar-mekanizmasi", title: "Karar Mekanizması" },
      { id: "raci-mantigi", title: "RACI Mantığı" },
      { id: "yonetim-ritmi", title: "Yönetim Ritmi" },
      { id: "finansal-disiplin", title: "Finansal Disiplin" },
    ],
  },
  {
    id: "trust-governance",
    title: "GÜVEN & YÖNETİŞİM",
    items: [
      { id: "resmi-sirket-bilgileri", title: "Resmi Şirket Bilgileri" },
      { id: "dokuman-yonetimi", title: "Doküman Yönetimi" },
      { id: "gizlilik-yaklasimi", title: "Gizlilik Yaklaşımı" },
      { id: "hesap-verebilirlik", title: "Hesap Verebilirlik" },
    ],
  },
] as const;

function Subsection({
  id,
  title,
  isExpanded,
  isActive,
  onHeaderClick,
  children,
}: {
  id: string;
  title: string;
  isExpanded: boolean;
  isActive: boolean;
  onHeaderClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`scroll-mt-24 ${isActive ? "border-l-2 border-l-[var(--brand-yellow)] pl-3" : ""}`}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <h3 className="text-base font-medium">{title}</h3>
        <svg
          className={`h-4 w-4 shrink-0 ui-text-muted transition-transform duration-200 ease-out ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] ease-out"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          transitionDuration: `${EXPAND_DURATION_MS}ms`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

const FIRST_MAIN_SECTION_ID = "who-we-are";
const FIRST_SUBSECTION_ID = "biz-kimiz";

export default function GMDnaClient() {
  const [activeMainSectionId, setActiveMainSectionId] = useState<string>(FIRST_MAIN_SECTION_ID);
  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(FIRST_SUBSECTION_ID);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleTocSelect = useCallback(
    (mainSectionId: string, subsectionId: string) => {
      setActiveMainSectionId(mainSectionId);
      setActiveSubsectionId(subsectionId);
      setTimeout(() => scrollToId(subsectionId), EXPAND_DURATION_MS);
    },
    [scrollToId]
  );

  const handleSubsectionHeaderClick = useCallback(
    (mainSectionId: string, subsectionId: string) => {
      if (activeSubsectionId === subsectionId) {
        setActiveSubsectionId(null);
      } else {
        setActiveMainSectionId(mainSectionId);
        setActiveSubsectionId(subsectionId);
        setTimeout(() => scrollToId(subsectionId), EXPAND_DURATION_MS);
      }
    },
    [activeSubsectionId, scrollToId]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-8 px-4 sm:px-6">
      {/* Page Header - not sticky, scrolls with content */}
      <header className="static ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="ui-heading-page">Generic Music DNA</h1>
            <p className="ui-text-muted mt-1 text-sm">
              Kurumsal Kimlik & Yönetişim
            </p>
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.65] text-[var(--color-text)]/85">
              Bu doküman Generic Music&apos;in nasıl çalıştığını tanımlar. Tüm ekip üyeleri
              ve partnerlerin bu ilkelere hâkim olması beklenir.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1.5 text-xs font-medium ui-text-muted">
            Version 2.0
          </span>
        </div>
      </header>

      {/* Layout: TOC inline on mobile, sticky right on desktop */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Table of Contents */}
        <nav
          aria-label="İçindekiler"
          className="order-1 shrink-0 lg:order-2 lg:sticky lg:top-24 lg:w-56"
        >
          <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm shadow-sm">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider ui-text-muted">
              İçindekiler
            </h2>
            <ul className="space-y-3">
              {TOC_ITEMS.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() =>
                      handleTocSelect(group.id, group.items[0]?.id ?? group.id)
                    }
                    className={`block text-left text-sm font-medium hover:text-[var(--color-text)] ${
                      activeMainSectionId === group.id
                        ? "font-medium text-[var(--color-text)]"
                        : "ui-text-muted"
                    }`}
                  >
                    {group.title}
                  </button>
                  <ul className="mt-1.5 space-y-1 pl-3">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleTocSelect(group.id, item.id)}
                          className={`block w-full text-left text-xs hover:text-[var(--color-text)] ${
                            activeSubsectionId === item.id
                              ? "font-medium text-[var(--color-text)]"
                              : "ui-text-muted"
                          }`}
                        >
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <div className="order-2 min-w-0 flex-1 space-y-8 lg:order-1">
          {/* Section 1: BİZ KİMİZ */}
          {activeMainSectionId === "who-we-are" && (
          <section
            id="who-we-are"
            className="scroll-mt-24 ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6"
          >
            <h2 className="mb-6 text-lg font-medium">BİZ KİMİZ</h2>
            <div className="space-y-6">
              <Subsection
                id="biz-kimiz"
                title="Biz Kimiz"
                isExpanded={activeSubsectionId === "biz-kimiz"}
                isActive={activeSubsectionId === "biz-kimiz"}
                onHeaderClick={() => handleSubsectionHeaderClick("who-we-are", "biz-kimiz")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Generic Music, İstanbul merkezli; dünyayla hizalanmış bağımsız bir müzik ve deneyim platformudur. Elektronik müzik odağında; kürasyon, estetik ve uzun vadeli marka değeri üzerine inşa edilmiş bir yapı olarak çalışır.</p>
                  <p>Biz yalnızca etkinlik üretmeyiz; bağlam üretiriz. Doğru sanatçıyı, doğru mekanı ve doğru topluluğu aynı frekansta buluştururuz. Hedefimiz hacim değil, etki üretmektir. Kalabalık değil, kültür inşa ederiz.</p>
                  <p>Generic Music bir &quot;promoter&quot; olmanın ötesinde; seçici, disiplinli ve uzun vadeli düşünen bir deneyim evidir.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="uzun-vadeli-niyet"
                title="Uzun Vadeli Niyet"
                isExpanded={activeSubsectionId === "uzun-vadeli-niyet"}
                isActive={activeSubsectionId === "uzun-vadeli-niyet"}
                onHeaderClick={() => handleSubsectionHeaderClick("who-we-are", "uzun-vadeli-niyet")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Generic Music&apos;in uzun vadeli niyeti; İstanbul&apos;dan doğmuş, dünya ile bağlantılı ve referans alınan bir kültür markasına dönüşmektir.</p>
                  <p>Amacımız hacim büyütmek değil; standart belirleyen bir yapı olmaktır. Kendi festival markalarını üreten, seçici şehirlerde operasyon yürüten, uluslararası sanatçı ve ajanslarla güven temelli çalışan; kalitesiyle anılan bir deneyim evi inşa ederiz.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="manifesto-ozet"
                title="Manifesto (Özet)"
                isExpanded={activeSubsectionId === "manifesto-ozet"}
                isActive={activeSubsectionId === "manifesto-ozet"}
                onHeaderClick={() => handleSubsectionHeaderClick("who-we-are", "manifesto-ozet")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Biz event üretmeyiz. Kültürel deneyim inşa ederiz. Bunu romantik değil, disiplinli şekilde yaparız.</p>
                  <p>Kaos değil sistem üretiriz. Hız değil kalite önceliğimizdir. Hype için kimlik değiştirmeyiz. Prestij için zarar etmeyiz. Hacim için marka sulandırmayız. Şirket bir kişiye bağımlı kalmaz; sistem kişilerden büyüktür.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="degerler-ilkeler"
                title="Değerler & İlkeler"
                isExpanded={activeSubsectionId === "degerler-ilkeler"}
                isActive={activeSubsectionId === "degerler-ilkeler"}
                onHeaderClick={() => handleSubsectionHeaderClick("who-we-are", "degerler-ilkeler")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Generic Music seçici bir yapıdır. Kalite, hızdan önce gelir. Uzun vadeli marka değeri, kısa vadeli kazançtan önce gelir. Kürasyon, popülerliğin önündedir.</p>
                  <p className="font-medium">Çekirdek İlkeler:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Kürasyon önceliklidir.</li>
                    <li>Kalite tavizsizdir.</li>
                    <li>Seçicilik stratejidir.</li>
                    <li>Uzun vadeli düşünürüz.</li>
                    <li>Marka değeri korunur.</li>
                    <li>Operasyon disiplini esastır.</li>
                    <li>İletişim açık ve net olmalıdır.</li>
                    <li>Her iş ölçülebilir olmalıdır.</li>
                  </ul>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="gm-kulturu"
                title="GM Kültürü"
                isExpanded={activeSubsectionId === "gm-kulturu"}
                isActive={activeSubsectionId === "gm-kulturu"}
                onHeaderClick={() => handleSubsectionHeaderClick("who-we-are", "gm-kulturu")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>GM kültürü &quot;hızlı büyüme&quot; değil, doğru büyüme üzerine kuruludur.</p>
                  <p>Belirsizlik azaltılır; süreçler yazılı çalışır. Yetki, sorumlulukla birlikte gelir. Karar ve eylemler kayıtlı ilerler. Toplantılar uzun değil; net, ölçülebilir ve sonuç odaklıdır. Her proje marka değerini korumalı ve artırmalıdır.</p>
                </div>
              </Subsection>
            </div>
          </section>
          )}

          {/* Section 2: NASIL ÇALIŞIRIZ */}
          {activeMainSectionId === "how-we-work" && (
          <section
            id="how-we-work"
            className="scroll-mt-24 ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6"
          >
            <h2 className="mb-6 text-lg font-medium">NASIL ÇALIŞIRIZ</h2>
            <div className="space-y-6">
              <Subsection
                id="organizasyon-yapisi"
                title="Organizasyon Yapısı"
                isExpanded={activeSubsectionId === "organizasyon-yapisi"}
                isActive={activeSubsectionId === "organizasyon-yapisi"}
                onHeaderClick={() => handleSubsectionHeaderClick("how-we-work", "organizasyon-yapisi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Generic Music; fonksiyonel bir çalışma modeliyle ilerler. Roller net, sorumluluklar yazılıdır.</p>
                  <p className="font-medium">Temel yaklaşım:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Küçük ekip, yüksek standart</li>
                    <li>Net rol dağılımı</li>
                    <li>Proje (event) bazlı çalışma</li>
                    <li>Finans ve risk kontrolü, sürecin merkezindedir</li>
                  </ul>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="karar-mekanizmasi"
                title="Karar Mekanizması"
                isExpanded={activeSubsectionId === "karar-mekanizmasi"}
                isActive={activeSubsectionId === "karar-mekanizmasi"}
                onHeaderClick={() => handleSubsectionHeaderClick("how-we-work", "karar-mekanizmasi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Bu sistem, şirket içinde nasıl karar alındığını tanımlar. Hiçbir iş sadece heyecanla, prestijle veya baskıyla yapılmaz.</p>
                  <p className="font-medium">Karar Seviyeleri:</p>
                  <ol className="list-inside list-decimal space-y-1">
                    <li><strong>Operasyonel:</strong> Günlük kararlar — ilgili lider alır</li>
                    <li><strong>Ticari:</strong> Bütçe / artist / sponsor gibi kararlar — ticari kontrolle ilerler</li>
                    <li><strong>Stratejik:</strong> Yeni şehir, yeni model, yüksek riskli hamleler — yönetim onayı gerekir</li>
                  </ol>
                  <p>Her önemli karar kayıt altına alınır.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="raci-mantigi"
                title="RACI Mantığı"
                isExpanded={activeSubsectionId === "raci-mantigi"}
                isActive={activeSubsectionId === "raci-mantigi"}
                onHeaderClick={() => handleSubsectionHeaderClick("how-we-work", "raci-mantigi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>RACI; sorumlulukların netleşmesi için kullanılır:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li><strong>R (Responsible):</strong> Yapan</li>
                    <li><strong>A (Accountable):</strong> Son sorumlu / onaylayan</li>
                    <li><strong>C (Consulted):</strong> Danışılan</li>
                    <li><strong>I (Informed):</strong> Bilgilendirilen</li>
                  </ul>
                  <p>Kural: Her görevde sadece 1 &quot;A&quot; olabilir. Amaç: &quot;Kim neyi yapıyor?&quot; sorusunu ortadan kaldırmak.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="yonetim-ritmi"
                title="Yönetim Ritmi"
                isExpanded={activeSubsectionId === "yonetim-ritmi"}
                isActive={activeSubsectionId === "yonetim-ritmi"}
                onHeaderClick={() => handleSubsectionHeaderClick("how-we-work", "yonetim-ritmi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Toplantılar uzun değil; net ve ölçülebilir olur.</p>
                  <p className="font-medium">Haftalık Yönetim Toplantısı:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Finans: Cashflow, event P&L, budget sapması, risk</li>
                    <li>Satış & Sponsor: satış oranları, pipeline, tahsilat</li>
                    <li>Operasyon: kritik riskler, timeline, ihtiyaçlar</li>
                    <li>Kararlar: net aksiyon listesi ve sorumlular</li>
                  </ul>
                  <p>Aylık ve çeyreklik ritimde hedef ve performans kontrolü yapılır.</p>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="finansal-disiplin"
                title="Finansal Disiplin"
                isExpanded={activeSubsectionId === "finansal-disiplin"}
                isActive={activeSubsectionId === "finansal-disiplin"}
                onHeaderClick={() => handleSubsectionHeaderClick("how-we-work", "finansal-disiplin")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Finansal disiplin, GM&apos;in sürdürülebilirliğinin temelidir.</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Bütçesiz iş yapılmaz</li>
                    <li>Sözleşmesiz ödeme yapılmaz</li>
                    <li>Onaysız harcama kabul edilmez</li>
                    <li>Her event kategori + hedef ile başlar</li>
                    <li>Kâr hedefi yazılmadan event başlatılmaz</li>
                  </ul>
                </div>
              </Subsection>
            </div>
          </section>
          )}

          {/* Section 3: GÜVEN & YÖNETİŞİM */}
          {activeMainSectionId === "trust-governance" && (
          <section
            id="trust-governance"
            className="scroll-mt-24 ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6"
          >
            <h2 className="mb-6 text-lg font-medium">GÜVEN & YÖNETİŞİM</h2>
            <div className="space-y-6">
              <Subsection
                id="resmi-sirket-bilgileri"
                title="Resmi Şirket Bilgileri"
                isExpanded={activeSubsectionId === "resmi-sirket-bilgileri"}
                isActive={activeSubsectionId === "resmi-sirket-bilgileri"}
                onHeaderClick={() => handleSubsectionHeaderClick("trust-governance", "resmi-sirket-bilgileri")}
              >
                <div className="mt-2 overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <table className="w-full text-sm">
                    <tbody>
                      {COMPANY_INFO_ROWS.map(({ label, value }) => (
                        <tr
                          key={label}
                          className="border-b border-[var(--color-border)] last:border-b-0"
                        >
                          <td className="w-1/3 bg-[var(--color-bg)]/40 px-4 py-3 text-[15px] font-medium text-[var(--color-text)]/80">
                            {label}
                          </td>
                          <td className="px-4 py-3 text-[15px] leading-[1.6] text-[var(--color-text)]/85">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-3">
                    <span className="text-[13px] font-medium text-[var(--color-text)]/80">
                      IBAN:{" "}
                    </span>
                    <span className="font-mono text-[15px] tracking-wider text-[var(--color-text)]/85">
                      TR•• •••• •••• •••• •••• •••• ••
                    </span>
                  </div>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="dokuman-yonetimi"
                title="Doküman Yönetimi"
                isExpanded={activeSubsectionId === "dokuman-yonetimi"}
                isActive={activeSubsectionId === "dokuman-yonetimi"}
                onHeaderClick={() => handleSubsectionHeaderClick("trust-governance", "dokuman-yonetimi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Dokümanlar sistemli yönetilir; sürümler ve değişiklikler kayıt altındadır.</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Stratejik kararlar alınmadan önce ilgili temel dokümanlar gözden geçirilir.</li>
                    <li>Yapısal değişiklikler sürüm güncellemesiyle kayıt altına alınır.</li>
                    <li>Dış paydaşlara iç yol haritaları paylaşılmaz.</li>
                    <li>Dış paydaşlara filtrelenmiş sunum ve bilgi seti paylaşılır.</li>
                  </ul>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="gizlilik-yaklasimi"
                title="Gizlilik Yaklaşımı"
                isExpanded={activeSubsectionId === "gizlilik-yaklasimi"}
                isActive={activeSubsectionId === "gizlilik-yaklasimi"}
                onHeaderClick={() => handleSubsectionHeaderClick("trust-governance", "gizlilik-yaklasimi")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Generic Music; bilgi güvenliğini prensip olarak ele alır.</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>İç operasyon detayları kontrollü paylaşılır.</li>
                    <li>Sözleşmeler ve finans bilgileri yetki çerçevesinde yönetilir.</li>
                    <li>Dış paydaşlarla paylaşılan içerik, ihtiyaç kadar ilkesine göre filtrelenir.</li>
                    <li>Herkes, eriştiği bilginin güvenliğinden sorumludur.</li>
                  </ul>
                </div>
              </Subsection>
              <div className="border-t border-[var(--color-border)]" />
              <Subsection
                id="hesap-verebilirlik"
                title="Hesap Verebilirlik"
                isExpanded={activeSubsectionId === "hesap-verebilirlik"}
                isActive={activeSubsectionId === "hesap-verebilirlik"}
                onHeaderClick={() => handleSubsectionHeaderClick("trust-governance", "hesap-verebilirlik")}
              >
                <div className="space-y-3 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
                  <p>Hesap verebilirlik, GM&apos;in kültürünün temelidir.</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Her rol çıktısından sorumludur.</li>
                    <li>Her karar izlenebilir olmalıdır.</li>
                    <li>Aksiyonlar net sahiplenilir.</li>
                    <li>Sonuçlar ölçülür; geliştirme alanları açıkça konuşulur.</li>
                  </ul>
                </div>
              </Subsection>
            </div>
          </section>
          )}

          <GMDnaAcceptanceCard />
        </div>
      </div>
    </div>
  );
}
