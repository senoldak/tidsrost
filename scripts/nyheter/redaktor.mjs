// Yazı işleri: yapay zekâ taslağını yayından önce kaynakla karşılaştırır, düzelttirir ve dilini temizler.
//
// Sıra (redigerSak):
//   1. Kesin (yapay zekâsız) kontroller: alıntılar, rakamlar, özel isimler kaynakta var mı?
//   2. Kontrol masası (vaktsjef): olgu, atfetme, başlık, hassas konular.
//   3. Sorun varsa yazara düzelttirme (en fazla 2 tur).
//   4. Norveççe redaksiyon (språkvask): dilbilgisi, bokmål, yazım kuralları, çeviri kokan ifadeler.
//   5. Son kesin kontrol: redaksiyon olguları bozmadı mı?
// Son kontrolde uydurma alıntı ya da kaynakta olmayan rakam kalırsa haber yayınlanmaz (stopp).
// Uzunluk da kesin kontroldür: MIN_ORD_UTKAST altındaki taslak düzeltme turlarında uzatılır, olmazsa yayınlanmaz.
import { gemini } from './lib.mjs';
import { RELATIV_TID, MEDIER, lokalRett, ilgiliKisim } from './tekstverktoy.mjs';
import { ordtelling } from '../../src/lib/ordtelling.mjs';

// ── Ortak yazım kuralları (bütün kaynakların istemlerinde) ─────────────

// Hedef 250–400 kelime; MIN_ORD_UTKAST altı reddedilir. Kaynak MIN_KILDE_ORD'dan kısaysa (ör. sayfası okunamayan
// bülten: sadece başlık ve giriş) uydurmadan bu uzunluk tutmaz; Gemini hiç çağrılmadan atlanır.
export const MIN_ORD_UTKAST = 200;
export const MIN_KILDE_ORD = 150;
export const forLiteKilde = (kildeTekst) => ordtelling(kildeTekst) < MIN_KILDE_ORD;

export const LENGDE_REGEL = `- Lengde: 250–400 ord i brødteksten, fordelt på 4–6 korte avsnitt. Bygg saken slik: først hva som har skjedd (hvem, hva, når, hvor), deretter bakgrunn og sammenheng, til slutt hva det betyr og hva som skjer videre.
- Bakgrunn og betydning skal også komme fra materialet: forklar med opplysninger som står der (tidligere vedtak, tall, begrunnelser, frister, hvem som berøres). Aldri legg til fakta, tall, navn eller vurderinger fra egen kunnskap, og aldri spekuler. Har materialet for lite stoff, skriv heller en kortere sak enn å fylle ut.`;

export const TITTEL_REGEL = `- Tittelen skal begynne med det leserne søker etter: selve saken (hvem eller hva det gjelder), f.eks. navnet på institusjonen, personen, stedet eller ordningen. Start aldri tittelen med avsenderen og kolon, som «Departementet: …», «Utenriksdepartementet: …» eller «Statsministerens kontor: …», og bruk heller ikke kolon tidlig i tittelen («Oslo: …», «Støre: …»). Skriv f.eks. «Norge gir 150 millioner til glemte kriser», ikke «Utenriksdepartementet: Norge gir 150 millioner til glemte kriser». Hvem som sier det, kommer fram i ingressen og brødteksten.
- Tittelen skal være konkret og fortelle hva som har skjedd. Ikke vage titler som «Dette må du vite», «Nå skjer det», «Viktig melding», «Nye tall» eller «Departementet foreslår endringer», og ikke spørsmål som tittel.`;

// Başlık denetimi (kesin, yapay zekâsız): aranan kelimeyle başlamayan ya da belirsiz başlıklar düzelttirilir.
// Mevcut haberlerin başlıklarına ve adreslerine dokunulmaz; yalnızca botun yeni yazdığı taslaklar denetlenir.
// Başta en fazla üç kelimelik etiket + iki nokta ("Departementet: …", "Støre: …", "Norges Bank: …").
const KOLON_START = /^\s*([^:]{1,60}?)\s*:\s+\S/u;
// Somut bir konu söylemeyen açılışlar.
const VAG_START = /^(?:dette|her er|her kommer|se|sjekk|les|nå|nyhet|nyheter|oppdatering|informasjon|viktig|pressemelding)(?![\p{L}\p{N}])/iu;
// Adı söylenmeyen kurum: okur "departementet"i aramaz.
const ANONYM_START = /^(?:departementet|direktoratet|etaten|tilsynet|ministeren|statsråden|byrået)(?![\p{L}\p{N}])/iu;
const ordIListe = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));

export function sjekkTittel(tittel = '') {
  const t = String(tittel).trim();
  const problemer = [];
  const kolon = t.match(KOLON_START);
  if (kolon && ordIListe(kolon[1]).length <= 3 && /[\p{L})]$/u.test(kolon[1])) {
    problemer.push(`Tittelen begynner med «${kolon[1]}:». Begynn med selve saken (det leserne søker etter) uten kolon tidlig i tittelen`);
  }
  if (VAG_START.test(t) || ANONYM_START.test(t)) {
    problemer.push('Tittelen er vag: begynn med hvem eller hva saken gjelder (navn på institusjon, person, sted eller ordning) og si hva som har skjedd');
  }
  if (/\?\s*$/.test(t)) problemer.push('Tittelen er et spørsmål; skriv en konkret påstand om hva som har skjedd');
  if (ordIListe(t).length < 4) problemer.push('Tittelen er for kort til å si hva saken gjelder (minst fire ord)');
  return problemer;
}

// Yapay zekâ kurala rağmen "Utenriksdepartementet: …" yazarsa önek yerelde atılır (aranan konu başa gelsin).
const AVSENDER_PREFIKS = /^(?:[\p{L}-]+(?:\s+og\s+[\p{L}-]+)?departementet|Departementet|Regjeringen|Statsministerens kontor|Statsministeren)\s*:\s+/u;
export function utenAvsenderprefiks(tittel = '') {
  const t = String(tittel).replace(AVSENDER_PREFIKS, '');
  return t === tittel || !t ? tittel : t.charAt(0).toUpperCase() + t.slice(1);
}

// Brødteksten skal være lang nok til å forklare saken (VVP-krav om saklighet; Google: ikke tynt innhold).
export function sjekkLengde(sak, min = MIN_ORD_UTKAST) {
  const n = ordtelling(sak.body);
  return n < min
    ? [`Brødteksten er for kort (${n} ord, minst ${min}). Utvid til 250–400 ord med flere opplysninger fra kilden: bakgrunn, detaljer og hva saken betyr ifølge kilden. Ikke legg til noe som ikke står i kilden.`]
    : [];
}

const VURDERING_SKJEMA = {
  type: 'object',
  properties: {
    godkjent: { type: 'boolean' },
    problemer: { type: 'array', items: { type: 'string' }, description: 'Konkrete problemer, tomt hvis godkjent' },
  },
  required: ['godkjent', 'problemer'],
};

export const TEKST_SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
    why_matters: { type: 'string', description: '1-2 setninger på bokmål: Hvorfor saken er viktig' },
    key_points: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
      description: 'Inntil 3 viktigste punkter / tall',
    },
  },
  required: ['title', 'description', 'body'],
};

const norm = (s) =>
  s
    .replace(/[«»"“”„]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Yayınlanan her metin alanı (başlık, giriş, gövde, neden önemli, anahtar noktalar) taranır.
const helTekst = (sak) =>
  [sak.title, sak.description, sak.body, sak.why_matters, ...(Array.isArray(sak.key_points) ? sak.key_points : [])]
    .filter((x) => typeof x === 'string' && x)
    .join('\n');

// ── 1. Kesin kontroller ────────────────────────────────────────────────

// Alıntılar kaynakta kelimesi kelimesine var mı? (VVP 3.7)
export function sjekkSitater(tekst, kilde) {
  const k = norm(kilde);
  const sitater = [
    ...[...tekst.matchAll(/«([^»]{15,})»/g)].map((m) => m[1]),
    ...[...tekst.matchAll(/[“"]([^”"]{15,})[”"]/g)].map((m) => m[1]),
    // Norveççe tire ile alıntı: "– Tekst, sier X."
    ...[...tekst.matchAll(/^[–-]\s*(.+?),\s*(?:sier|seier|skriver|uttaler|understreker|påpeker)\b/gm)].map((m) => m[1]),
  ];
  return sitater
    .flatMap((s) => s.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && !k.includes(norm(s).replace(/[.!?]$/, '')))
    .map((s) => `Sitatet finnes ikke ordrett i kilden: «${s.slice(0, 80)}»`);
}

// Metindeki her rakam kaynakta var mı? Biçim farkları (3 580 / 3580 / 3,5 / 3.5) tolere edilir.
// Ayın günü ve 1–12 arası küçük sayılar (madde numarası, saat vb.) kontrol edilmez.
// Binlik ayraç sadece 3 haneli gruplarda geçerli; böylece tablo satırındaki yan yana sayılar birleşmez.
const TALL = /\d{1,3}(?:[  ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;
const tallNorm = (t) => t.replace(/[  ]/g, '').replace(',', '.');
function tallIKilde(kilde) {
  return new Set([...kilde.matchAll(TALL)].map((m) => tallNorm(m[0])));
}
// Birim dönüşümü ve yuvarlama: "3,58 milliarder" ↔ "3 580 millioner", "2,98 milliarder" ↔ "2 981 037 (1 000 kr)".
const SKALA = [1, 1e3, 1e6, 1e9, 1e-3, 1e-6, 1e-9];
const stemmer = (n, kjente) =>
  [...kjente].some((k) => {
    const kn = Number(k);
    return kn && SKALA.some((s) => Math.abs(kn - n * s) / Math.abs(kn) <= 0.01);
  });

export function sjekkTall(tekst, kilde) {
  const kjente = tallIKilde(kilde);
  const sjekket = new Set();
  const problemer = [];
  for (const m of tekst.matchAll(TALL)) {
    const raw = m[0];
    const t = tallNorm(raw);
    if (!t || sjekket.has(t)) continue;
    sjekket.add(t);
    const n = Number(t);
    if (Number.isInteger(n) && n <= 12) continue;
    if (kjente.has(t)) continue;
    // Yıllar birebir eşleşmeli; yuvarlama toleransı sadece diğer sayılara uygulanır.
    const årstall = Number.isInteger(n) && n >= 1900 && n <= 2100;
    if (!årstall && stemmer(n, kjente)) continue;
    problemer.push(`Tallet «${raw}» finnes ikke i kilden`);
  }
  return problemer;
}

// Özel isimler (cümle ortasında büyük harfle başlayan kelimeler) kaynakta geçiyor mu?
// Norveççede sadece özel isimler büyük harfle yazılır; uydurma kişi/kurum adlarını yakalar.
const ALLTID_OK = new Set(['norge', 'norges', 'stortinget', 'stortingets', 'regjeringen', 'regjeringens', 'kilde']);
export function sjekkNavn(tekst, kilde) {
  const k = kilde.toLowerCase();
  const funn = new Set();
  for (const setning of tekst.split(/(?<=[.!?:])\s+|\n+/)) {
    const ord = setning.match(/[A-ZÆØÅ][\p{L}-]{2,}/gu) ?? [];
    const først = setning.trim().match(/^[«"–-]?\s*([\p{L}-]+)/u)?.[1];
    for (const w of ord) {
      if (w === først) continue;
      const lw = w.toLowerCase();
      if (ALLTID_OK.has(lw)) continue;
      // Çekim ekleri: "Ukrainas" → "ukraina", "Oslos" → "oslo"
      const stamme = lw.replace(/(s|ens|ets|ene|en|et)$/, '');
      if (k.includes(lw) || (stamme.length >= 3 && k.includes(stamme))) continue;
      funn.add(w);
    }
  }
  return [...funn].map((w) => `Navnet/ordet «${w}» finnes ikke i kilden`);
}

// Alıntılar (« » içi ve tireyle başlayan satırlar) dışındaki metin; dil kontrolleri sadece buna bakar.
const utenSitater = (tekst) =>
  tekst
    .replace(/«[^»]*»/g, ' ')
    .split('\n')
    .filter((l) => !/^\s*–/.test(l))
    .join('\n');

// Kaynak Nynorsk olunca yapay zekâ onu taklit edebiliyor; site Bokmål yazıyor.
// Bokmål'da olmayan, Nynorsk'a özgü kelimeler (alıntılar hariç).
// (?<!\p{L}) / (?!\p{L}): \b å, ø, æ harflerini tanımadığı için Unicode'a duyarlı kelime sınırı.
const NYNORSK = /(?<!\p{L})(ikkje|frå|berre|korleis|kva|kven|meir|mykje|noko|nokon|sjølv|desse|dei|eit|òg|vore|vere|heile|fleire|nokre|kvifor|difor|saman|styrkje|førebyggje|handtere|regjeringa|kommunane|fylka|\p{L}+leg|\p{L}+lege)(?!\p{L})/giu;
export function sjekkBokmål(tekst) {
  const funn = [...new Set((utenSitater(tekst).match(NYNORSK) ?? []).map((w) => w.toLowerCase()))];
  return funn.length >= 2 ? [`Teksten er skrevet på nynorsk (f.eks. ${funn.slice(0, 4).map((w) => `«${w}»`).join(', ')}); hele saken skal være på bokmål, bortsett fra direkte sitater`] : [];
}

// "i går / i dag / i morgen" haber geç yayınlanırsa yanlış olur; tarih ya da gün adı kullanılmalı.
export function sjekkRelativTid(tekst) {
  const funn = [...new Set((utenSitater(tekst).match(RELATIV_TID) ?? []).map((w) => w.toLowerCase()))];
  return funn.length ? [`Relative tidsuttrykk (${funn.map((w) => `«${w}»`).join(', ')}) kan bli feil når saken leses senere; bruk ukedag eller dato fra kilden, eller fjern dem`] : [];
}

const sprakSjekk = (tekst) => [...sjekkBokmål(tekst), ...sjekkRelativTid(tekst)];

// Haber sitelerine dayanan haberde hiçbir medya kuruluşu anılmaz (sahibin kuralı); anılırsa haber yayınlanmaz.
export function sjekkMedier(tekst) {
  const funn = [...new Set(tekst.match(MEDIER) ?? [])];
  return funn.length ? [`Medier nevnt ved navn (${funn.join(', ')}); fjern dem og alt som bare tilskrives dem`] : [];
}

// ── 2. Kontrol masası ──────────────────────────────────────────────────

export async function vurder(sak, kilde, { pressemelding = true, medier = false } = {}) {
  const tekst = helTekst(sak);
  const problemer = [...sjekkSitater(tekst, kilde), ...sjekkTall(tekst, kilde), ...sjekkNavn(tekst, kilde), ...sprakSjekk(tekst), ...(medier ? sjekkMedier(tekst) : []), ...sjekkLengde(sak), ...sjekkTittel(utenAvsenderprefiks(sak.title))];

  const svar = await gemini({
    denetim: true,
    schema: VURDERING_SKJEMA,
    prompt: `Du er vaktsjef i en norsk nettavis og kontrollerer et KI-skrevet utkast mot kilden før publisering, etter Vær Varsom-plakaten. Vær streng: ved tvil, ikke godkjenn.

Avvis (godkjent=false) og forklar kort på norsk hvis noe av dette gjelder:
1. En faktaopplysning (tall, navn, tittel på person, dato, sted, hendelse, partinavn) i utkastet står ikke i kilden, eller er gjengitt feil (VVP 3.2).
2. Avsenderens påstander, vurderinger eller mål presenteres som fakta i stedet for å tilskrives avsenderen (VVP 4.2).
3. ${medier ? 'Utkastet nevner et medie, en nettavis, en tv-kanal, et nyhetsbyrå eller en podkast ved navn, skriver «melder flere medier» e.l., eller bygger på opplysninger som ett medie har avdekket selv' : pressemelding ? 'Det kommer ikke tydelig frem at saken bygger på en pressemelding og fra hvem' : 'Det kommer ikke frem hvilket organ som har fattet vedtaket (egne setninger som «Opplysningene kommer fra …» er ikke nødvendig)'} (VVP 2.7, 3.1).
4. Tittel eller ingress går lenger enn det er dekning for i teksten, eller er misvisende (VVP 4.4).
5. Utkastet inneholder egne vurderinger, ladede eller forsterkende ord, eller spekulasjon.
6. Saken omtaler navngitte privatpersoner, kriminalsaker, barn, selvmord eller annet som krever særlig varsomhet (VVP 4.3–4.9).
7. Feil i oversettelse eller gjengivelse: et begrep, en tittel eller et navn er oversatt eller gjengitt slik at meningen endres (f.eks. «forslag» blir til «vedtak», «foreslår» til «har bestemt», «ikke vedtatt» til «vedtatt»).
8. Språket er uklart, feil eller ikke på norsk bokmål (sitater på nynorsk er greit).

Godkjenn bare hvis ingen av punktene gjelder. Små språklige forbedringer er ikke grunn til avvisning.

KILDE:
${ilgiliKisim(kilde, helTekst(sak), 14000)}

UTKAST:
Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}
${sak.why_matters ? `
Hvorfor viktig: ${sak.why_matters}` : ""}${Array.isArray(sak.key_points) && sak.key_points.length ? `
Nøkkelpunkter: ${sak.key_points.join(" | ")}` : ""}`,
  });

  if (!svar) return { godkjent: false, problemer: [...problemer, 'KI-kontroll kunne ikke kjøres'] };
  problemer.push(...svar.problemer);
  return { godkjent: svar.godkjent && problemer.length === 0, problemer };
}

// ── 3. Düzeltme ────────────────────────────────────────────────────────

export async function rett(sak, kilde, problemer) {
  const svar = await gemini({
    schema: TEKST_SKJEMA,
    prompt: `Du er journalist i en norsk nettavis. Vaktsjefen har funnet problemer i utkastet ditt. Rett alle problemene ved å holde deg strengt til kilden. Fjern opplysninger som ikke har dekning i kilden, tilskriv avsenderens påstander, og gjengi sitater ordrett. Er et tall eller navn markert som «finnes ikke i kilden», skal det fjernes eller skrives nøyaktig slik det står i kilden. Behold ellers formen, og ikke gjør saken kortere: brødteksten skal ha 250–400 ord. Er saken markert som for kort, utvid den med flere opplysninger fra kilden (bakgrunn, detaljer, hva saken betyr ifølge kilden), aldri med noe som ikke står der. Tittelen skal begynne med det leserne søker etter (hvem eller hva saken gjelder), være konkret og ikke ha kolon tidlig i tittelen («Departementet: …», «Støre: …»). Norsk bokmål.

PROBLEMER:
${problemer.map((p) => `- ${p}`).join('\n')}

KILDE:
${ilgiliKisim(kilde, helTekst(sak), 14000)}

UTKAST:
Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}
${sak.why_matters ? `
Hvorfor viktig: ${sak.why_matters}` : ""}${Array.isArray(sak.key_points) && sak.key_points.length ? `
Nøkkelpunkter: ${sak.key_points.join(" | ")}` : ""}`,
  });
  return svar ? { ...sak, ...svar } : sak;
}

// ── 4. Norveççe redaksiyon ─────────────────────────────────────────────

export async function språkvask(sak) {
  const svar = await gemini({
    schema: TEKST_SKJEMA,
    prompt: `Du er språkvasker (korrekturleser) i en norsk nettavis. Gjør en språkvask av saken under. Du skal BARE rette språket, aldri innholdet.

Rett:
- Grammatikk, rettskriving, tegnsetting og ordstilling på norsk bokmål (Språkrådets normer).
- Oversettelsespreg og anglisismer: unaturlige konstruksjoner, direkte oversatte uttrykk, feil preposisjoner.
- Nynorsk utenfor sitater: All tekst skal være på bokmål, også når kilden er på nynorsk (f.eks. «ikkje» → «ikke», «frå» → «fra», «ulovleg» → «ulovlig», «regjeringa» → «regjeringen»). Direkte sitater beholdes på originalspråket.
- Relative tidsuttrykk som «i går», «i dag» og «i morgen» skal erstattes med ukedag eller dato hvis den står i saken, ellers fjernes de.
- Norske skrivekonvensjoner: anførselstegn « », sitatstrek (–) for replikker, desimalkomma (3,5), mellomrom som tusenskille (3 580), datoer som «10. oktober», klokkeslett som «kl. 14.15».
- Titler med stor forbokstav bare i første ord og i egennavn (f.eks. «Regjeringen foreslår økt støtte», ikke «Regjeringen Foreslår Økt Støtte»). Titler som «statsminister» og «utenriksminister» og ord som «finanskomiteen» skrives med liten forbokstav; departementsnavn («Finansdepartementet») med stor.
- Klarspråk og avisstil: korte setninger (helst under 25 ord), aktiv form, ett poeng per setning. Unngå kansellistil og substantivsyke: «basert på», «samt», «i forbindelse med», «vedrørende», «herunder», «foreta en vurdering av» (skriv heller «vurdere»), «gjennomføre en økning» (skriv heller «øke»).
- Ikke overta byråkratiske formuleringer fra kilden; skriv dem om til vanlig avisspråk uten å endre meningen (f.eks. «utvide varigheten for ordningen» → «forlenge ordningen», «iverksette tiltak» → «sette i gang tiltak»). Egennavn, navn på ordninger og direkte sitater endres ikke.
- Unngå passiv når det er kjent hvem som handlet: «Regjeringen besluttet tidligere at …», ikke «Det har tidligere blitt besluttet at …».
- Gjentakelser: Samme tilskriving eller formulering («ifølge pressemeldingen», «opplyser departementet») skal ikke gjentas tett; varier eller fjern den andre. Første setning i brødteksten skal ikke gjenta ingressen ordrett.
- Fjern avsluttende henvisninger som «les mer på …», «hele pressemeldingen kan leses …» og setninger som «Opplysningene kommer fra …»; kildelenken legges til automatisk.

Ikke endre:
- Fakta, tall, navn, datoer eller rekkefølgen av opplysninger.
- Ordlyden i direkte sitater (sitater på nynorsk skal stå på nynorsk).
- Tilskrivinger («ifølge departementet», «mener regjeringen»).
- Lengden vesentlig.

Er teksten allerede korrekt, returner den uendret.

Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}
${sak.why_matters ? `
Hvorfor viktig: ${sak.why_matters}` : ""}${Array.isArray(sak.key_points) && sak.key_points.length ? `
Nøkkelpunkter: ${sak.key_points.join(" | ")}` : ""}`,
  });
  return svar ? { ...sak, ...svar } : sak;
}

// ── Tüm süreç ──────────────────────────────────────────────────────────

// Döner: { sak, merknader, stopp } — stopp doluysa haber yayınlanmamalı (taslak da açılmaz; kaynak hopp döner).
const SISTE_RUNDER = 3;
export async function redigerSak(sak, kilde, opts = {}) {
  // Yazar taslağındaki basit sorunlar (cümle ortası göreli zaman, medya atfı) önce yerelde silinir.
  let utkast = lokalRett(sak);
  const merknader = [];
  for (let runde = 0; runde < 2; runde++) {
    const vurdering = await vurder(utkast, kilde, opts);
    if (vurdering.godkjent) break;
    merknader.push(...vurdering.problemer);
    utkast = await rett(utkast, kilde, vurdering.problemer);
  }

  const foer = utkast;
  const vasket = await språkvask(utkast);
  // Redaksiyon olguları değiştirdiyse redaksiyondan önceki hâli kullan.
  const nyeFeil = [...sjekkSitater(helTekst(vasket), kilde), ...sjekkTall(helTekst(vasket), kilde)];
  const foerFeil = [...sjekkSitater(helTekst(foer), kilde), ...sjekkTall(helTekst(foer), kilde)];
  if (nyeFeil.length > foerFeil.length) {
    merknader.push('Språkvasken endret fakta og ble forkastet');
  } else {
    utkast = vasket;
  }

  // Son kesin kontrol: uydurma alıntı, kaynakta olmayan rakam, Nynorsk metin ya da "i går" gibi
  // göreli zaman kalmışsa bir kez daha düzelttir; yine kalırsa yayınlama.
  const sluttsjekk = (s) => [...sjekkSitater(helTekst(s), kilde), ...sjekkTall(helTekst(s), kilde), ...sprakSjekk(helTekst(s)), ...(opts.medier ? sjekkMedier(helTekst(s)) : []), ...sjekkLengde(s)];
  // Sahibin kararı (2026-10-11): taslak bekletilmez. En fazla SISTE_RUNDER düzeltme turu; yine kalırsa
  // çağıran kaynak haberi yayınlamaz (hopp).
  let stopp = sluttsjekk(utkast);
  if (stopp.length) merknader.push(...stopp);
  for (let runde = 0; runde < SISTE_RUNDER && stopp.length; runde++) {
    // Önce yerel düzeltme; sorun kalmazsa Gemini çağrılmaz, kalırsa sadece kalanlar gönderilir.
    const lokal = lokalRett(utkast);
    if (sluttsjekk(lokal).length < stopp.length) {
      utkast = lokal;
      stopp = sluttsjekk(utkast);
      if (!stopp.length) break;
    }
    const sisteForsok = await rett(utkast, kilde, [
      ...stopp,
      'Sitater må kopieres tegn for tegn fra kilden, med samme ordstilling. Klarer du ikke det, skriv om til indirekte tale uten anførselstegn.',
      'All tekst utenom direkte sitater skal være på bokmål, også om kilden er på nynorsk.',
      'Tall som ikke står i kilden skal fjernes.',
    ]);
    if (sluttsjekk(sisteForsok).length < stopp.length) utkast = await språkvask(sisteForsok);
    if (sluttsjekk(utkast).length > sluttsjekk(sisteForsok).length) utkast = sisteForsok;
    stopp = sluttsjekk(utkast);
  }
  utkast = { ...utkast, title: utenAvsenderprefiks(utkast.title) };

  // Başlık hâlâ kurala uymuyorsa (kolonlu başlangıç, belirsiz başlık) yalnızca bir düzeltme turu daha.
  // Yeni hâl kesin kontrollerde daha kötü değilse ve başlık sorunu azaldıysa kullanılır; yoksa eski hâl kalır
  // ve not düşülür (başlık yüzünden haber durdurulmaz, olgu kontrolleri gevşemez).
  const tittelFeil = sjekkTittel(utkast.title);
  if (!stopp.length && tittelFeil.length) {
    const ny = await rett(utkast, kilde, [...tittelFeil, 'Endre bare tittelen; ingress og brødtekst skal stå uendret.']);
    const nyTittel = { ...utkast, title: utenAvsenderprefiks(ny.title ?? utkast.title) };
    if (sluttsjekk(nyTittel).length === 0 && sjekkTittel(nyTittel.title).length < tittelFeil.length) utkast = nyTittel;
    else merknader.push(...tittelFeil);
  }
  return { sak: utkast, merknader, stopp };
}
