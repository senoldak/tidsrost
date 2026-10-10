// Yazı işleri: yapay zekâ taslağını yayından önce kaynakla karşılaştırır, düzelttirir ve dilini temizler.
//
// Sıra (redigerSak):
//   1. Kesin (yapay zekâsız) kontroller: alıntılar, rakamlar, özel isimler kaynakta var mı?
//   2. Kontrol masası (vaktsjef): olgu, atfetme, başlık, hassas konular.
//   3. Sorun varsa yazara düzelttirme (en fazla 2 tur).
//   4. Norveççe redaksiyon (språkvask): dilbilgisi, bokmål, yazım kuralları, çeviri kokan ifadeler.
//   5. Son kesin kontrol: redaksiyon olguları bozmadı mı?
// Son kontrolde uydurma alıntı ya da kaynakta olmayan rakam kalırsa haber yayınlanmaz (stopp).
import { gemini } from './lib.mjs';

const VURDERING_SKJEMA = {
  type: 'object',
  properties: {
    godkjent: { type: 'boolean' },
    problemer: { type: 'array', items: { type: 'string' }, description: 'Konkrete problemer, tomt hvis godkjent' },
  },
  required: ['godkjent', 'problemer'],
};

const TEKST_SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['title', 'description', 'body'],
};

const norm = (s) =>
  s
    .replace(/[«»"“”„]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const helTekst = (sak) => `${sak.title}\n${sak.description}\n${sak.body}`;

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

// ── 2. Kontrol masası ──────────────────────────────────────────────────

export async function vurder(sak, kilde, { pressemelding = true } = {}) {
  const tekst = helTekst(sak);
  const problemer = [...sjekkSitater(tekst, kilde), ...sjekkTall(tekst, kilde), ...sjekkNavn(tekst, kilde)];

  const svar = await gemini({
    schema: VURDERING_SKJEMA,
    prompt: `Du er vaktsjef i en norsk nettavis og kontrollerer et KI-skrevet utkast mot kilden før publisering, etter Vær Varsom-plakaten. Vær streng: ved tvil, ikke godkjenn.

Avvis (godkjent=false) og forklar kort på norsk hvis noe av dette gjelder:
1. En faktaopplysning (tall, navn, tittel på person, dato, sted, hendelse, partinavn) i utkastet står ikke i kilden, eller er gjengitt feil (VVP 3.2).
2. Avsenderens påstander, vurderinger eller mål presenteres som fakta i stedet for å tilskrives avsenderen (VVP 4.2).
3. ${pressemelding ? 'Det kommer ikke tydelig frem at saken bygger på en pressemelding og fra hvem' : 'Det kommer ikke tydelig frem hvem som er kilden'} (VVP 2.7, 3.1).
4. Tittel eller ingress går lenger enn det er dekning for i teksten, eller er misvisende (VVP 4.4).
5. Utkastet inneholder egne vurderinger, ladede eller forsterkende ord, eller spekulasjon.
6. Saken omtaler navngitte privatpersoner, kriminalsaker, barn, selvmord eller annet som krever særlig varsomhet (VVP 4.3–4.9).
7. Feil i oversettelse eller gjengivelse: et begrep, en tittel eller et navn er oversatt eller gjengitt slik at meningen endres (f.eks. «forslag» blir til «vedtak», «foreslår» til «har bestemt», «ikke vedtatt» til «vedtatt»).
8. Språket er uklart, feil eller ikke på norsk bokmål (sitater på nynorsk er greit).

Godkjenn bare hvis ingen av punktene gjelder. Små språklige forbedringer er ikke grunn til avvisning.

KILDE:
${kilde.slice(0, 14000)}

UTKAST:
Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}`,
  });

  if (!svar) return { godkjent: false, problemer: [...problemer, 'KI-kontroll kunne ikke kjøres'] };
  problemer.push(...svar.problemer);
  return { godkjent: svar.godkjent && problemer.length === 0, problemer };
}

// ── 3. Düzeltme ────────────────────────────────────────────────────────

export async function rett(sak, kilde, problemer) {
  const svar = await gemini({
    schema: TEKST_SKJEMA,
    prompt: `Du er journalist i en norsk nettavis. Vaktsjefen har funnet problemer i utkastet ditt. Rett alle problemene ved å holde deg strengt til kilden. Fjern opplysninger som ikke har dekning i kilden, tilskriv avsenderens påstander, og gjengi sitater ordrett. Er et tall eller navn markert som «finnes ikke i kilden», skal det fjernes eller skrives nøyaktig slik det står i kilden. Behold ellers form og lengde. Norsk bokmål.

PROBLEMER:
${problemer.map((p) => `- ${p}`).join('\n')}

KILDE:
${kilde.slice(0, 14000)}

UTKAST:
Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}`,
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
- Blanding av bokmål og nynorsk utenfor sitater.
- Norske skrivekonvensjoner: anførselstegn « », sitatstrek (–) for replikker, desimalkomma (3,5), mellomrom som tusenskille (3 580), datoer som «10. oktober», klokkeslett som «kl. 14.15».
- Titler med stor forbokstav bare i første ord og i egennavn (f.eks. «Regjeringen foreslår økt støtte», ikke «Regjeringen Foreslår Økt Støtte»). Titler som «statsminister» og «utenriksminister» og ord som «finanskomiteen» skrives med liten forbokstav; departementsnavn («Finansdepartementet») med stor.
- Klarspråk og avisstil: korte setninger (helst under 25 ord), aktiv form, ett poeng per setning. Unngå kansellistil og substantivsyke: «basert på», «samt», «i forbindelse med», «vedrørende», «herunder», «foreta en vurdering av» (skriv heller «vurdere»), «gjennomføre en økning» (skriv heller «øke»).
- Gjentakelser: Samme tilskriving eller formulering («ifølge pressemeldingen», «opplyser departementet») skal ikke gjentas tett; varier eller fjern den andre. Ikke gjenta tittelen ordrett i første setning.
- Ingen avsluttende henvisninger som «les mer på …» eller «hele pressemeldingen kan leses …»; kildelenken legges til automatisk.

Ikke endre:
- Fakta, tall, navn, datoer eller rekkefølgen av opplysninger.
- Ordlyden i direkte sitater (sitater på nynorsk skal stå på nynorsk).
- Tilskrivinger («ifølge departementet», «mener regjeringen»).
- Lengden vesentlig.

Er teksten allerede korrekt, returner den uendret.

Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}`,
  });
  return svar ? { ...sak, ...svar } : sak;
}

// ── Tüm süreç ──────────────────────────────────────────────────────────

// Döner: { sak, merknader, stopp } — stopp doluysa haber yayınlanmamalı (taslak kalır).
export async function redigerSak(sak, kilde, opts = {}) {
  let utkast = sak;
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

  // Son kesin kontrol: uydurma alıntı ya da kaynakta olmayan rakam kalmışsa bir kez daha düzelttir;
  // yine kalırsa yayınlama.
  const sluttsjekk = (s) => [...sjekkSitater(helTekst(s), kilde), ...sjekkTall(helTekst(s), kilde)];
  let stopp = sluttsjekk(utkast);
  if (stopp.length) {
    merknader.push(...stopp);
    const sisteForsok = await rett(utkast, kilde, [
      ...stopp,
      'Sitater må kopieres tegn for tegn fra kilden, med samme ordstilling. Klarer du ikke det, skriv om til indirekte tale uten anførselstegn.',
    ]);
    if (sluttsjekk(sisteForsok).length < stopp.length) utkast = sisteForsok;
    stopp = sluttsjekk(utkast);
  }
  return { sak: utkast, merknader, stopp };
}
