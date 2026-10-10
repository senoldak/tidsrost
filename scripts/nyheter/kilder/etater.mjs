// Haber/bülten akışı olan kamu kurumları. Ortak süreç: pressemelding.mjs.
// Yeni kurum eklemek için buraya bir lagKilde({...}) ekleyip hent-nyheter.mjs'teki KILDER listesine yaz.
import { hentTekst, lesRss, decodeEntities, htmlTilTekst } from '../lib.mjs';
import { lagKilde, mellom } from './pressemelding.mjs';

// Statistisk sentralbyrå: resmi istatistik yayınları. Akışta hem haber başlıklı makaleler
// (…/artikler/…) hem de "Konsumprisindeksen" gibi çıplak istatistik sayfaları var; sadece makaleler alınır.
export const ssb = lagKilde({
  navn: 'ssb',
  avsender: 'Statistisk sentralbyrå (SSB)',
  kortnavn: 'SSB',
  feed: 'https://www.ssb.no/rss',
  sjanger: 'den statistiske publiseringen',
  pressemelding: false,
  kategorihint: 'okonomi for priser, lønn, handel, næringsliv, bolig og offentlige finanser; ellers innenriks (befolkning, arbeid, helse, utdanning, miljø).',
  underlinje: 'Statistikk fra ssb.no',
  filter: (i) => i.link.includes('/artikler/'),
  les: (html) => ({
    ingress: mellom(html, 'class="title-ingress-wrapper', '<div class="snr-dates-wrapper'),
    body: mellom(html, 'class="article-body searchabletext"', 'part-related-articles'),
  }),
});

// Nasjonal kommunikasjonsmyndighet: mobil- og bredbåndsnett, frekvenser, digital sikkerhet.
export const nkom = lagKilde({
  navn: 'nkom',
  avsender: 'Nasjonal kommunikasjonsmyndighet (Nkom)',
  kortnavn: 'Nkom',
  feed: 'https://nkom.no/aktuelt/rss.xml',
  sjanger: 'nyhetssaken',
  kategorihint: 'teknologi for nett, telekom, frekvenser og digital sikkerhet; ellers innenriks.',
  underlinje: 'Nyhet fra nkom.no',
  les: (html) => ({
    ingress: mellom(html, 'class="p-intro', '<figure'),
    body: mellom(html, 'class="article-body', '</section>'),
  }),
});

// Mattilsynet: ürün geri çağırmaları ve haberler. Akışın üçte ikisi mevzuat duyurusu
// (Regelverksutvikling); sadece <nl:extra1> türü Nyhet ve Tilbakekalling olanlar alınır.
// Not: bazı geri çağırmalar RSS'e hiç düşmüyor (sadece /tilbakekallinger listesinde).
const MATTILSYNET_TYPER = new Set(['Nyhet', 'Tilbakekalling']);
export const mattilsynet = lagKilde({
  navn: 'mattilsynet',
  avsender: 'Mattilsynet',
  kortnavn: 'Mattilsynet',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks (mattrygghet, tilbaketrekking av produkter, dyrehelse); okonomi bare for rene nærings- og handelssaker.',
  underlinje: 'Nyhet fra mattilsynet.no',
  async liste() {
    const xml = await hentTekst('https://www.mattilsynet.no/rss/subscription');
    const typer = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([i]) => decodeEntities(i.match(/<nl:extra1>([\s\S]*?)<\/nl:extra1>/)?.[1] ?? '').trim());
    return lesRss(xml).filter((_, n) => MATTILSYNET_TYPER.has(typer[n]));
  },
  les: (html) => ({
    ingress: mellom(html, 'class="_ingress_', '</div>'),
    body: mellom(html, 'data-testid="published-date"', '</article>').replace(/^[\d.]+\s*/, ''),
  }),
});

// Datatilsynet: personvern. RSS yok; /aktuelt/ listesi okunur (tarih sadece GG.AA.YYYY).
export const datatilsynet = lagKilde({
  navn: 'datatilsynet',
  avsender: 'Datatilsynet',
  kortnavn: 'Datatilsynet',
  sjanger: 'nyhetssaken',
  kategorihint: 'teknologi for personvern, data, KI og digitale tjenester; ellers innenriks.',
  underlinje: 'Nyhet fra datatilsynet.no',
  async liste() {
    const html = await hentTekst('https://www.datatilsynet.no/aktuelt/');
    return [...html.matchAll(/<div class="item-list__inner">([\s\S]*?)<\/li>/g)].flatMap(([, kort]) => {
      const a = kort.match(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const d = kort.match(/<time>(\d{2})\.(\d{2})\.(\d{4})<\/time>/);
      if (!a || !d) return [];
      const link = new URL(a[1], 'https://www.datatilsynet.no').href;
      return [{
        guid: link,
        title: htmlTilTekst(a[2]),
        link,
        description: htmlTilTekst(kort.slice(kort.indexOf('</time>'))),
        // Saat yok: günün başı (Oslo) kabul edilir.
        pubDate: `${d[3]}-${d[2]}-${d[1]}T00:00:00+02:00`,
      }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'class="user-content ingress"', '</div>'),
    body: mellom(html, 'class="article__content-text"', '<aside'),
  }),
});

// Kulturdirektoratet (eski Kulturrådet): kültür destekleri, sanatçı bursları.
// RSS yok ve listede tarih yok: yeni çıkan kart "şimdi" yayınlanmış sayılır. İlk çalışmada
// hent-nyheter.mjs eski kartları zaten "görüldü" işaretler. Site çok sık istekte 429 veriyor;
// her çalışmada sadece liste + seçilen makale(ler) indirilir.
export const kulturdirektoratet = lagKilde({
  navn: 'kulturdirektoratet',
  avsender: 'Kulturdirektoratet',
  kortnavn: 'Kulturdirektoratet',
  sjanger: 'nyhetssaken',
  kategorihint: 'kultur.',
  underlinje: 'Nyhet fra kulturdirektoratet.no',
  async liste() {
    const html = await hentTekst('https://www.kulturdirektoratet.no/aktuelt');
    const naa = new Date().toISOString();
    return [...html.matchAll(/<h2[^>]*>\s*<a[^>]*href="(https:\/\/www\.kulturdirektoratet\.no\/aktuelt\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p class="[^"]*line-clamp-3[^"]*">([\s\S]*?)<\/p>/g)].map(
      ([, link, tittel, ingress]) => ({ guid: link, title: htmlTilTekst(tittel), link, description: htmlTilTekst(ingress), pubDate: naa }),
    );
  },
  les: (html) => ({
    ingress: mellom(html, '<div class="text-xl md:text-2xl', '</div>'),
    body: mellom(html, 'data-chunks', 'Andre artikler'),
  }),
});

// ── Ekonomi ────────────────────────────────────────────────────────────

// Norges Bank basın bültenleri (faiz kararları, finansal istikrar, Petrol Fonu sonuçları).
// Akış text/html ve BOM'la geliyor ama RSS 2.0; aylık rutin döviz işlemi duyurusu atlanır.
export const norgesbankPresse = lagKilde({
  navn: 'norgesbank-presse',
  avsender: 'Norges Bank',
  kortnavn: 'Norges Bank',
  feed: 'https://www.norges-bank.no/RSS/Pressemeldinger---Norges-Bank/',
  sjanger: 'pressemeldingen',
  kategorihint: 'okonomi.',
  underlinje: 'Pressemelding fra norges-bank.no',
  filter: (i) => !/valutatransaksjon/i.test(i.title),
  les: (html) => ({
    ingress: mellom(html, 'class="intro"', '</div>'),
    body: mellom(html, 'class="article__main-body"', 'class="meta-container"'),
  }),
});

// Finanstilsynet: Atom akışı (sadece haberler). Özetlerde varlıklar iki kez kaçışlı (&amp;oslash;).
export const finanstilsynet = lagKilde({
  navn: 'finanstilsynet',
  avsender: 'Finanstilsynet',
  kortnavn: 'Finanstilsynet',
  sjanger: 'nyhetssaken',
  kategorihint: 'okonomi.',
  underlinje: 'Nyhet fra finanstilsynet.no',
  async liste() {
    const xml = await hentTekst('https://www.finanstilsynet.no/rss/nyheter/');
    return [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map(([e]) => {
      const felt = (t) => decodeEntities(decodeEntities(e.match(new RegExp('<' + t + '[^>]*>([^]*?)</' + t + '>'))?.[1] ?? '')).trim();
      const link = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? felt('id');
      return { guid: felt('id') || link, title: felt('title'), link, description: htmlTilTekst(felt('summary')), pubDate: felt('published') || felt('updated') };
    });
  },
  les: (html) => ({
    ingress: '',
    body: mellom(html, 'class="article--bodytext', '</section>'),
  }),
});

// Konkurransetilsynet (WordPress): sadece "Nyheter" kategorisi; tam metin akışta (content:encoded).
export const konkurransetilsynet = lagKilde({
  navn: 'konkurransetilsynet',
  avsender: 'Konkurransetilsynet',
  kortnavn: 'Konkurransetilsynet',
  sjanger: 'nyhetssaken',
  kategorihint: 'okonomi.',
  underlinje: 'Nyhet fra konkurransetilsynet.no',
  async liste() {
    const xml = await hentTekst('https://konkurransetilsynet.no/feed/');
    const nyheter = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([i]) => /<category><!\[CDATA\[Nyheter\]\]><\/category>|<category>Nyheter<\/category>/.test(i));
    return lesRss(xml).filter((_, n) => nyheter[n]);
  },
  les: (html) => ({
    ingress: '',
    body: mellom(html, 'class="left-content', '<footer'),
  }),
});

// Skatteetaten: basın bültenleri (ayda birkaç tane).
export const skatteetaten = lagKilde({
  navn: 'skatteetaten',
  avsender: 'Skatteetaten',
  kortnavn: 'Skatteetaten',
  feed: 'https://www.skatteetaten.no/rss/presse/pressemeldinger/',
  sjanger: 'pressemeldingen',
  kategorihint: 'okonomi for skatt og avgifter; innenriks for arbeidslivskriminalitet og folkeregister.',
  underlinje: 'Pressemelding fra skatteetaten.no',
  les: (html) => ({
    ingress: mellom(html, 'class="lead design-system-wrapper"', '</div>'),
    body: mellom(html, 'class="article-wrapper narrow-container"', '<footer'),
  }),
});
