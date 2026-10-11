// Haber/bülten akışı olan kamu kurumları. Ortak süreç: pressemelding.mjs.
// Yeni kurum eklemek için buraya bir lagKilde({...}) ekleyip hent-nyheter.mjs'teki KILDER listesine yaz.
import { hentTekst, lesRss, decodeEntities, htmlTilTekst } from '../lib.mjs';
import { lagKilde, mellom } from './pressemelding.mjs';

// Atom akışı → lesRss ile aynı alanlar. Bazı akışlarda varlıklar iki kez kaçışlı (&amp;oslash;).
function lesAtom(xml) {
  return [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map(([e]) => {
    const felt = (t) => decodeEntities(decodeEntities(e.match(new RegExp('<' + t + '[^>]*>([^]*?)</' + t + '>'))?.[1] ?? '')).trim();
    const link = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? felt('id');
    return { guid: felt('id') || link, title: felt('title'), link, description: htmlTilTekst(felt('summary') || felt('content')), pubDate: felt('published') || felt('updated') };
  });
}

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
  liste: async () => lesAtom(await hentTekst('https://www.finanstilsynet.no/rss/nyheter/')),
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

// ── Innenriks, sport, utenriks ─────────────────────────────────────────

// Statens vegvesen: Atom; sadece ulusal basın bültenleri (/om-oss/presse/), yerel yol projeleri atlanır.
export const vegvesen = lagKilde({
  navn: 'vegvesen',
  avsender: 'Statens vegvesen',
  kortnavn: 'Vegvesenet',
  sjanger: 'pressemeldingen',
  kategorihint: 'innenriks.',
  underlinje: 'Nyhet fra vegvesen.no',
  liste: async () => lesAtom(await hentTekst('https://www.vegvesen.no/rss/')).filter((i) => i.link.includes('/om-oss/presse/')),
  les: (html) => ({ ingress: '', body: mellom(html, 'class="article', '<footer') }),
});

// Folkehelseinstituttet. İntihar gibi hassas konular istemde egnet=false ile elenir.
export const fhi = lagKilde({
  navn: 'fhi',
  avsender: 'Folkehelseinstituttet (FHI)',
  kortnavn: 'FHI',
  feed: 'https://www.fhi.no/rss/nyheter/',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks.',
  underlinje: 'Nyhet fra fhi.no',
  les: (html) => ({ ingress: mellom(html, 'md:text-ingress', '</div>'), body: mellom(html, 'article--body textual-block', '<footer') }),
});

// DSB: sivil savunma, yangın ve elektrik güvenliği.
export const dsb = lagKilde({
  navn: 'dsb',
  avsender: 'Direktoratet for samfunnssikkerhet og beredskap (DSB)',
  kortnavn: 'DSB',
  feed: 'https://www.dsb.no/rss/rss-dsb---aktuelt/',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks.',
  underlinje: 'Nyhet fra dsb.no',
  les: (html) => ({ ingress: mellom(html, 'article-header__main-intro', '</div>'), body: mellom(html, 'article__main-body', '<footer') }),
});

// Havforskningsinstituttet: balık stokları, kota tavsiyeleri.
export const havforskning = lagKilde({
  navn: 'havforskning',
  avsender: 'Havforskningsinstituttet',
  kortnavn: 'Havforskningsinstituttet',
  feed: 'https://www.hi.no/hi/rss/nyheter.rss',
  sjanger: 'nyhetssaken',
  kategorihint: 'okonomi for fiskekvoter og havbruk som næring; ellers innenriks.',
  underlinje: 'Nyhet fra hi.no',
  les: (html) => ({ ingress: '', body: mellom(html, 'class="bodytext padd2"', '<footer') }),
});

// Sivilombudet: kamu yönetimi denetim raporları.
export const sivilombudet = lagKilde({
  navn: 'sivilombudet',
  avsender: 'Sivilombudet',
  kortnavn: 'Sivilombudet',
  feed: 'https://www.sivilombudet.no/feed/',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks.',
  underlinje: 'Nyhet fra sivilombudet.no',
  les: (html) => ({ ingress: mellom(html, 'post-excerpt preamble', '</div>'), body: mellom(html, 'article-body', '<footer') }),
});

// Forbrukerrådet: tüketici hakları.
export const forbrukerradet = lagKilde({
  navn: 'forbrukerradet',
  avsender: 'Forbrukerrådet',
  kortnavn: 'Forbrukerrådet',
  feed: 'https://www.forbrukerradet.no/feed/',
  sjanger: 'pressemeldingen',
  kategorihint: 'okonomi for priser, bank, forsikring og handel; ellers innenriks.',
  underlinje: 'Nyhet fra forbrukerradet.no',
  les: (html) => ({ ingress: '', body: mellom(html, 'article-main', '<footer') }),
});

// Norges idrettsforbund. Fotoğraflarını kullanmıyoruz (kendileri yasaklıyor); kapak her zaman kaynak kartı.
export const idrettsforbundet = lagKilde({
  navn: 'idrettsforbundet',
  avsender: 'Norges idrettsforbund',
  kortnavn: 'Idrettsforbundet',
  feed: 'https://www.idrettsforbundet.no/rss/nyheter',
  sjanger: 'nyhetssaken',
  kategorihint: 'sport.',
  underlinje: 'Nyhet fra idrettsforbundet.no',
  les: (html) => ({ ingress: mellom(html, 'class="ingress', '</div>'), body: mellom(html, 'class="body-text', '<footer') }),
});

// Norfund: kalkınma yatırımları; akış çoğunlukla İngilizce. İlk girdi sitenin kendisi.
export const norfund = lagKilde({
  navn: 'norfund',
  avsender: 'Norfund',
  kortnavn: 'Norfund',
  feed: 'https://www.norfund.no/feed/',
  sjanger: 'pressemeldingen (kan være på engelsk; skriv saken på norsk bokmål)',
  kategorihint: 'utenriks for investeringer i utlandet; okonomi for selskapsnytt.',
  underlinje: 'Nyhet fra norfund.no',
  filter: (i) => i.title !== 'Norfund',
  les: (html) => ({ ingress: '', body: mellom(html, 'class="entry-content', '<footer') }),
});

// ── 2026-10-11 eklenenler (canlı sitelerde doğrulandı) ─────────────────

// RSS 2.0 der datoen står i <a10:updated> i stedet for <pubDate> (Statnett, Council of the EU).
function lesRssA10(xml) {
  const datoer = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([i]) => i.match(/<a10:updated>([^<]+)<\/a10:updated>/)?.[1] ?? '');
  return lesRss(xml).map((item, n) => ({ ...item, pubDate: item.pubDate || datoer[n] }));
}

// UN News: RSS-en (news.un.org/feed/...) henger; nyhetslisten er serverrendret. Publiserer også i helgene.
export const unnews = lagKilde({
  navn: 'unnews',
  avsender: 'FNs nyhetstjeneste (UN News)',
  kortnavn: 'UN News',
  sjanger: 'nyhetssaken (på engelsk; skriv saken på norsk bokmål)',
  kategorihint: 'utenriks.',
  underlinje: 'Nyhet fra news.un.org',
  async liste() {
    const html = await hentTekst('https://news.un.org/en/news');
    return [...html.matchAll(/<article class="node node--type-news-story[\s\S]*?<\/article>/g)].flatMap(([kort]) => {
      const a = kort.match(/<h2 class="node__title">\s*<a href="(\/en\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const d = kort.match(/<time datetime="([^"]+)"/);
      if (!a || !d) return [];
      const link = 'https://news.un.org' + a[1];
      // Datoen er alltid kl. 12:00Z; ligger den i fremtiden, ville hent() forkastet saken.
      const tid = Math.min(new Date(d[1]).getTime(), Date.now());
      return [{ guid: link, title: htmlTilTekst(a[2]), link, description: htmlTilTekst(kort.match(/field--name-field-news-story-lead[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''), pubDate: new Date(tid).toISOString() }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'views-field-field-news-story-lead', '</div>'),
    body: mellom(html, 'block-views-block-content-fields-block-body', '<div id="block-views-block-content-footer-block'),
  }),
});

// EU-kommisjonen (Press corner). Artikkelsidene er JS-rendret; fullteksten hentes fra presscorner-API-et
// i liste() og slås opp i les() via og:url. Bare pressemeldinger, uttalelser og referater (ikke taler/agenda).
const EC_TEKST = new Map();
export const eukommisjonen = lagKilde({
  navn: 'eukommisjonen',
  avsender: 'Europakommisjonen',
  kortnavn: 'EU-kommisjonen',
  sjanger: 'pressemeldingen (på engelsk; skriv saken på norsk bokmål)',
  kategorihint: 'utenriks; okonomi for handel, konkurranse, finans og energi.',
  underlinje: 'Pressemelding fra ec.europa.eu',
  async liste() {
    const items = lesRss(await hentTekst('https://ec.europa.eu/commission/presscorner/api/rss?language=en'))
      .filter((i) => /\/detail\/en\/(ip|statement|read)_\d+_\d+$/.test(i.link))
      .filter((i) => Date.now() - new Date(i.pubDate) < 3 * 864e5);
    for (const i of items) {
      const ref = i.link.split('/').pop().toUpperCase().replaceAll('_', '/');
      try {
        const doc = JSON.parse(await hentTekst(`https://ec.europa.eu/commission/presscorner/api/documents?reference=${ref}&language=en`));
        EC_TEKST.set(i.link, htmlTilTekst(doc.docuLanguageResource?.htmlContent ?? ''));
      } catch {}
    }
    return items;
  },
  les: (html) => {
    const url = (html.match(/property="og:url" content="([^"]+)"/)?.[1] ?? '').replaceAll('\\/', '/');
    return { ingress: '', body: EC_TEKST.get(url) ?? '' };
  },
});

// Statnett: kraftnett og forsyningssikkerhet. Datoen står i <a10:updated>.
export const statnett = lagKilde({
  navn: 'statnett',
  avsender: 'Statnett',
  kortnavn: 'Statnett',
  sjanger: 'nyhetssaken',
  kategorihint: 'okonomi for kraftpriser, nettleie og investeringer; ellers innenriks.',
  underlinje: 'Nyhet fra statnett.no',
  liste: async () => lesRssA10(await hentTekst('https://www.statnett.no/rss/')),
  les: (html) => ({
    ingress: mellom(html, 'class="article-intro"', '</div>'),
    body: mellom(html, 'class="article-text', '<div class="article-footer'),
  }),
});

// Arbeidstilsynet: ingen RSS; /nyheter/-listen (dato DD.MM.ÅÅÅÅ). Listen har også innlegg/kronikker.
export const arbeidstilsynet = lagKilde({
  navn: 'arbeidstilsynet',
  avsender: 'Arbeidstilsynet',
  kortnavn: 'Arbeidstilsynet',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks; okonomi for lønn og arbeidsmarked.',
  underlinje: 'Nyhet fra arbeidstilsynet.no',
  filter: (i) => !/^(Innlegg|Kronikk)\s*:/i.test(i.title),
  async liste() {
    const html = await hentTekst('https://www.arbeidstilsynet.no/nyheter/');
    return [...html.matchAll(/<a class="card card-link" href="([^"]+)">([\s\S]*?)<\/a>/g)].flatMap(([, href, kort]) => {
      const t = kort.match(/<h3>([\s\S]*?)<\/h3>/);
      const d = kort.match(/Publisert (\d{2})\.(\d{2})\.(\d{4})/);
      if (!t || !d) return [];
      const link = new URL(href, 'https://www.arbeidstilsynet.no').href;
      return [{ guid: link, title: htmlTilTekst(t[1]), link, description: htmlTilTekst(kort.match(/<p class="ingress">([\s\S]*?)<\/p>/)?.[1] ?? ''), pubDate: `${d[3]}-${d[2]}-${d[1]}T00:00:00+02:00` }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'class="news__ingress', '</div>'),
    body: mellom(html, 'class="body-text', '<section class="footer-links'),
  }),
});

// Kystverket: ingen RSS; /nyheter/-listen har <time datetime>.
export const kystverket = lagKilde({
  navn: 'kystverket',
  avsender: 'Kystverket',
  kortnavn: 'Kystverket',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks; okonomi for havner og sjøtransport som næring.',
  underlinje: 'Nyhet fra kystverket.no',
  async liste() {
    const html = await hentTekst('https://www.kystverket.no/nyheter/');
    return [...html.matchAll(/<a class="card__headline-link" href="([^"]+)">([\s\S]*?)<\/a>([\s\S]*?)<\/article>/g)].flatMap(([, href, tittel, rest]) => {
      const d = rest.match(/<time datetime="([^"]+)"/);
      if (!d) return [];
      const link = new URL(href, 'https://www.kystverket.no').href;
      return [{ guid: link, title: htmlTilTekst(tittel), link, description: htmlTilTekst(rest.match(/<div class="card__content">([\s\S]*?)<\/div>/)?.[1] ?? ''), pubDate: d[1].replace(' ', 'T') }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'class="article__lead', '</div>'),
    body: mellom(html, 'class="article__body', '<footer'),
  }),
});

// Helsedirektoratet: ingen RSS; /nyheter-listen (dato «08. oktober 2026», uten klokkeslett).
const MAANED = { januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12 };
export const helsedirektoratet = lagKilde({
  navn: 'helsedirektoratet',
  avsender: 'Helsedirektoratet',
  kortnavn: 'Helsedirektoratet',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks.',
  underlinje: 'Nyhet fra helsedirektoratet.no',
  async liste() {
    const html = await hentTekst('https://www.helsedirektoratet.no/nyheter');
    return [...html.matchAll(/<a href="(https:\/\/www\.helsedirektoratet\.no\/nyheter\/[^"]+)"\s+class=" b-nav-list__link">([\s\S]*?)<\/a>/g)].flatMap(([, link, kort]) => {
      const t = kort.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const d = kort.match(/b-list-item-type__date">\s*(\d{1,2})\. (\p{L}+) (\d{4})/u);
      if (!t || !d || !MAANED[d[2]]) return [];
      const dato = `${d[3]}-${String(MAANED[d[2]]).padStart(2, '0')}-${d[1].padStart(2, '0')}T00:00:00+02:00`;
      return [{ guid: link, title: htmlTilTekst(t[1]), link, description: htmlTilTekst(kort.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? ''), pubDate: dato }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'class="b-article-intro__intro', '</p>'),
    body: mellom(html, 't-body-text', '<button id="exportPdf"'),
  }),
});

// Miljødirektoratet: ingen RSS; listen ligger som JSON i en React-komponent på /aktuelt/nyheter/.
export const miljodirektoratet = lagKilde({
  navn: 'miljodirektoratet',
  avsender: 'Miljødirektoratet',
  kortnavn: 'Miljødirektoratet',
  sjanger: 'nyhetssaken',
  kategorihint: 'innenriks (miljø, klima, natur, forurensning).',
  underlinje: 'Nyhet fra miljodirektoratet.no',
  async liste() {
    const html = await hentTekst('https://www.miljodirektoratet.no/aktuelt/nyheter/');
    const sett = new Set();
    return [...html.matchAll(/\{"title":"((?:[^"\\]|\\.)*)","text":"((?:[^"\\]|\\.)*)"[^{}]*?"href":"(\/aktuelt\/nyheter\/[^"]+)","publishedDate":"([^"]+)"/g)].flatMap(([, tittel, tekst, href, dato]) => {
      if (sett.has(href)) return [];
      sett.add(href);
      const link = 'https://www.miljodirektoratet.no' + href;
      return [{ guid: link, title: JSON.parse(`"${tittel}"`), link, description: JSON.parse(`"${tekst}"`), pubDate: dato }];
    });
  },
  les: (html) => ({
    ingress: mellom(html, 'c_news-page-header__preamble', '</p>'),
    body: mellom(html, 'c_news-page-main-container', '<footer'),
  }),
});
