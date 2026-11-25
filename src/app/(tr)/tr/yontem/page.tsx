import type { Metadata } from "next"
import Link from "next/link"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { trPageMetadata } from "@/lib/tr-metadata"
import { CHART_PERIODS } from "@/lib/history"
import type { ChartSampling } from "@/lib/history"
import { GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE } from "@/lib/metal-units"
import { trNumber, trDateLong } from "@/lib/format-tr"
import { TR_PERIOD_SHORT } from "@/lib/pilot-format-tr"
import { PV, MONO, SANS } from "@/components/pilot/palette"

// Turkish counterpart of /method/ (task C3): the same facts in Turkish, plus a
// section on why a bank's rate and a jeweller's gold price differ (mechanism,
// no figures). Every number is a definition or comes from the code it
// describes (CHART_PERIODS, the unit constants).
const PATH = "/tr/yontem/"
const TITLE = "Yöntem: kurlar ve fiyatlar nereden geliyor | CurrencyVersus"
const DESCRIPTION =
  "CurrencyVersus'taki döviz kurlarının (ECB referans kurları, çapraz kurlar) ve altın fiyatlarının (spot fiyat, troy ons) kaynağı ve hesaplanışı; banka kuru ve kuyumcu fiyatı neden farklı; hata bildirimi."
const ISSUES_URL = "https://github.com/mangdasire1/currencyversus/issues"
const FIRST_ECB_RATE = "1999-01-04"

// title, description, canonical + hreflang, and the page's Turkish share image
export async function generateMetadata(): Promise<Metadata> {
  return trPageMetadata(PATH, TITLE, DESCRIPTION)
}

const SAMPLING_TR: Record<ChartSampling, string> = {
  daily: "her iş günü",
  "every-2nd-business-day": "iki iş gününde bir",
  "every-3rd-business-day": "üç iş gününde bir",
  weekly: "haftada bir kur",
  monthly: "ayda bir kur",
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold" style={{ ...SANS, color: PV.text }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed" style={{ color: PV.dim }}>
        {children}
      </div>
    </section>
  )
}

const strong = { color: PV.text }
const link = { color: PV.accentText }

export default function Page() {
  return (
    <TrPageShell path={PATH} title="Kurlar ve fiyatlar nereden geliyor?">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        CurrencyVersus&apos;taki her rakamın ne olduğu, nereden geldiği ve nasıl hesaplandığı.
      </p>

      <Section id="kur" title="Döviz kurları">
        <p>
          Kurlar, Avrupa Merkez Bankası&apos;nın (ECB) euro referans kurlarıdır ve Frankfurter API üzerinden alınır. ECB bunları
          iş günlerinde bir kez, yaklaşık 16:00 CET&apos;te yayımlar. Hafta sonları ve ECB tatillerinde değişmezler; sayfa o
          zaman son yayımlanan kuru tarihiyle gösterir.
        </p>
        <p>
          Bunlar referans kurlarıdır, canlı piyasa fiyatı değildir: gün içinde hareket etmezler ve aynı anda işlem yapan bir
          banka ya da kart kuruluşu farklı bir rakam verebilir.
        </p>
        <p>
          <strong style={strong}>Çapraz kur.</strong> ECB her para birimini yalnızca euroya karşı yayımlar. Dolar/TL gibi başka
          bir çift için site, aynı günün iki euro kurunu birbirine böler (euro başına TL ÷ euro başına dolar). Bir çiftin iki
          yönü de aynı iki yayımlanmış sayıdan gelir; bu yüzden dolar/TL ve TL/dolar birbirinin tam tersidir. Sonuçlar
          yalnızca gösterilirken yuvarlanır ve geldikleri ECB kurlarından daha fazla anlamlı basamakla gösterilmez.
        </p>
        <p>
          <strong style={strong}>Orta değer.</strong> Rakamlar alış ve satış fiyatlarının arasındadır. Banka marjı, havale ve
          kart masrafları dahil değildir; size önerilen kur farklı olur.
        </p>
        <p>
          <strong style={strong}>TL ve TRY.</strong> Türk lirasının uluslararası kodu TRY&apos;dir (ISO 4217); sitenin İngilizce
          sayfalarında bu kod kullanılır. Türkçe sayfalarda TL yazılır.
        </p>
      </Section>

      <Section id="altin" title="Altın ve diğer değerli metaller">
        <p>
          Değerli metal fiyatları gold-api.com&apos;un spot fiyatlarıdır; troy ons başına dolar cinsindendir. Sağlayıcı XAU
          (altın), XAG (gümüş), XPT (platin) ve XPD (paladyum) kodlarını kullanır; ISO 4217 bu kodları metalin bir troy onsu
          olarak tanımlar. Her sayfa sağlayıcının kendi güncelleme zamanını gösterir; bu, son işlemin değil, sağlayıcının fiyatı
          son kontrol ettiği an olabilir.
        </p>
        <p>
          TL gibi başka bir para biriminde, dolar fiyatı ECB&apos;nin dolardan o para birimine referans kuruyla çarpılır. İki
          kaynak farklı zamanlarda güncellenir; bu yüzden iki tarih de gösterilir.
        </p>
        <p>
          <strong style={strong}>Birimler.</strong> Değerli metaller troy ons başına fiyatlanır (
          <span style={MONO}>{trNumber(String(GRAMS_PER_TROY_OUNCE))} g</span>). Gıdada kullanılan ons, avoirdupois onstur (
          <span style={MONO}>{trNumber(String(GRAMS_PER_AVOIRDUPOIS_OUNCE))} g</span>) ve daha hafiftir. Metal sayfalarındaki
          çeviriciler gram ve kilogramla da çalışır; iki ons da kesin tanımlardır.
        </p>
        <p>
          <strong style={strong}>Spot değer, dükkân fiyatı değildir.</strong> Rakamlar saf metalin spot fiyattan teorik
          değeridir. Site ayara (saflık derecesine) göre değer hesaplamaz.
        </p>
        <p>Sitede hiçbir metal için tarihsel fiyat yoktur; metal sayfaları yalnızca güncel fiyatı gösterir.</p>
      </Section>

      <Section id="gecmis" title="Tarihsel veriler">
        <p>
          Tarihsel kurlar aynı günlük ECB referans kurlarıdır. Grafikli sayfalardaki iki tarih aracı, ilk ECB referans kuru olan{" "}
          {trDateLong(FIRST_ECB_RATE)} tarihinden itibaren herhangi bir tarihi kabul eder.
        </p>
        <p>
          İstenen tarih bir hafta sonuna ya da tatile denk gelirse, ondan önceki son iş gününün kuru kullanılır ve o gün,
          istenen günün yanında gösterilir.
        </p>
        <p>Grafikli sayfalarda çizgi, günlük kurlardan alınan bir örnekle çizilir:</p>
        <ul className="flex flex-col gap-1 pl-5 list-disc">
          {CHART_PERIODS.map((p) => (
            <li key={p.key}>
              <span style={{ ...MONO, color: PV.text }}>{TR_PERIOD_SHORT[p.key]}</span>: {SAMPLING_TR[p.sampling]}
            </li>
          ))}
        </ul>
        <p>
          En düşük ve en yüksek, dönemdeki en düşük ve en yüksek günlük referans kurlarıdır. Örneklenen çizginin çizmediği bir
          güne denk gelebilirler; bu yüzden çizginin biraz dışında kalabilirler. Gün içi seviyeler değildir.
        </p>
        <p>
          Yüzde değişim iki referans kurunu karşılaştırır. Bir yatırım getirisi değildir: enflasyonu, kazanılan faizi ve hiçbir
          masrafı hesaba katmaz.
        </p>
        <p id="yillara-gore">
          Yıllara göre sayfalar, bir çiftin ilk ECB kurundan bu yana her yıl için yıl sonu kurunu (yılın son yayın günündeki
          kur), yıl ortalamasını (o yılın günlük kurlarının aritmetik ortalaması; her günün kuru, iki para biriminin euro
          kurlarının oranıdır) ve yıl içindeki en düşük ve en yüksek günlük kuru tarihleriyle verir. Yıllık değişim, yıl sonu
          kurunu bir önceki yıl sonu kuruyla karşılaştırır. İçinde bulunulan yıl 1 Ocak&apos;tan son yayın gününe kadardır ve
          böyle etiketlenir. TL serisi, ECB&apos;nin yeni Türk lirası kuruyla 3 Ocak 2005&apos;te başlar. Rakamlar yalnız
          gösterimde yuvarlanır ve ECB&apos;nin o yıl yayımladığından fazla anlamlı basamakla gösterilmez; aynı rakamlar CSV
          dosyası olarak da indirilebilir.
        </p>
      </Section>

      <Section id="fark" title="Bankadaki kur ve kuyumcudaki altın fiyatı neden farklı?">
        <p>
          <strong style={strong}>Banka ve döviz bürosu.</strong> Banka ya da büro dövizi bir fiyattan alır, daha yüksek bir
          fiyattan satar; aradaki fark (marj) onun gelirini oluşturur. Kurlarını gün içinde piyasaya göre günceller; ECB&apos;nin
          referans kuru ise günde bir kez belirlenir. Havale ve kart işlemlerine ayrıca masraf eklenebilir. Bu yüzden bankada
          gördüğünüz alış ve satış kurları, bu sitedeki referans değerden farklıdır.
        </p>
        <p>
          <strong style={strong}>Kuyumcu, banka altın hesabı ve Kapalıçarşı.</strong> Spot fiyat, saf altının büyük hacimli
          piyasadaki değeridir. Kuyumcu ve banka bunun üzerine kendi alış/satış farkını ekler. Takı, çeyrek ve benzeri
          ürünlerde işçilik ücreti eklenir; bu ürünlerin çoğu saf değil, ayarlı (alaşım) altındır, bu yüzden içlerindeki saf
          altın miktarı ağırlıklarından azdır. Uygulandığı yerde vergi de fiyata girer. Kapalıçarşı fiyatları da piyasadaki alış
          ve satış farkını içerir.
        </p>
        <p>Bu farklar doğaldır. Bu site referans değerleri gösterir; bir bankanın ya da kuyumcunun fiyatını göstermez.</p>
      </Section>

      <Section id="hata" title="Hata bildirimi">
        <p>
          Bir rakam yanlış görünüyorsa lütfen{" "}
          <a href={ISSUES_URL} className="underline underline-offset-4 [overflow-wrap:anywhere]" style={link}>
            github.com/mangdasire1/currencyversus/issues
          </a>{" "}
          adresinde bir kayıt açın. Sayfanın adresini, gördüğünüz rakamı, beklediğiniz rakamı ve nereden geldiğini, baktığınız
          tarih ve saati (saat diliminizle) yazmanız işe yarar.
        </p>
        <p>
          Tüm döviz çiftleri{" "}
          <Link href="/currencies/" className="underline underline-offset-4" style={link}>
            İngilizce döviz sayfasında
          </Link>
          , tüm metal sayfaları{" "}
          <Link href="/metals/" className="underline underline-offset-4" style={link}>
            İngilizce metaller sayfasında
          </Link>{" "}
          listelenir.
        </p>
      </Section>
    </TrPageShell>
  )
}
