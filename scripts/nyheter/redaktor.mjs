// Yapay zekâ kontrol masası: taslağı kaynakla karşılaştırır, VVP'ye uymayanları editöre bırakır.
// Sorumlu editörün yerini tutmaz; sadece açıkça sorunsuz haberlerin otomatik yayınına karar verir.
import { gemini } from './lib.mjs';

const SKJEMA = {
  type: 'object',
  properties: {
    godkjent: { type: 'boolean' },
    problemer: { type: 'array', items: { type: 'string' }, description: 'Konkrete problemer, tomt hvis godkjent' },
  },
  required: ['godkjent', 'problemer'],
};

const norm = (s) => s.replace(/[«»"“”„]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// Alıntılar kaynakta kelimesi kelimesine var mı? Yapay zekâya bırakmadan kesin kontrol (VVP 3.7).
export function sjekkSitater(tekst, kilde) {
  const k = norm(kilde);
  const sitater = [
    ...[...tekst.matchAll(/«([^»]{15,})»/g)].map((m) => m[1]),
    ...[...tekst.matchAll(/[“"]([^”"]{15,})[”"]/g)].map((m) => m[1]),
    // Norveççe tire ile alıntı: "– Tekst, sier X."
    ...[...tekst.matchAll(/^[–-]\s*(.+?),\s*(?:sier|skriver|uttaler|understreker|påpeker)\b/gm)].map((m) => m[1]),
  ];
  return sitater
    .flatMap((s) => s.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && !k.includes(norm(s).replace(/[.!?]$/, '')))
    .map((s) => `Sitatet finnes ikke ordrett i kilden: «${s.slice(0, 80)}»`);
}

export async function vurder(sak, kilde) {
  const problemer = sjekkSitater(`${sak.description}\n${sak.body}`, kilde);

  const svar = await gemini({
    schema: SKJEMA,
    prompt: `Du er vaktsjef i en norsk nettavis og kontrollerer et KI-skrevet utkast mot kilden før publisering, etter Vær Varsom-plakaten. Vær streng: ved tvil, ikke godkjenn.

Avvis (godkjent=false) og forklar kort på norsk hvis noe av dette gjelder:
1. En faktaopplysning (tall, navn, dato, sted, hendelse) i utkastet står ikke i kilden (VVP 3.2).
2. Avsenderens påstander, vurderinger eller mål presenteres som fakta i stedet for å tilskrives avsenderen (VVP 4.2).
3. Det kommer ikke tydelig frem at saken bygger på en pressemelding og fra hvem (VVP 2.7, 3.1).
4. Tittel eller ingress går lenger enn det er dekning for i teksten, eller er misvisende (VVP 4.4).
5. Utkastet inneholder egne vurderinger, ladede eller forsterkende ord, eller spekulasjon.
6. Saken omtaler navngitte privatpersoner, kriminalsaker, barn, selvmord eller annet som krever særlig varsomhet (VVP 4.3–4.9).
7. Språket er uklart, feil eller ikke på norsk bokmål (sitater på nynorsk er greit).

Godkjenn bare hvis ingen av punktene gjelder. Små språklige forbedringer er ikke grunn til avvisning.

KILDE:
${kilde.slice(0, 14000)}

UTKAST:
Tittel: ${sak.title}
Ingress: ${sak.description}

${sak.body}`,
  });

  if (!svar) return { godkjent: false, problemer: ['KI-kontroll kunne ikke kjøres'] };
  problemer.push(...svar.problemer);
  return { godkjent: svar.godkjent && problemer.length === 0, problemer };
}

const RETT_SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['title', 'description', 'body'],
};

// Kontrolün bulduğu sorunları yazara düzelttirir.
export async function rett(sak, kilde, problemer) {
  const svar = await gemini({
    schema: RETT_SKJEMA,
    prompt: `Du er journalist i en norsk nettavis. Vaktsjefen har funnet problemer i utkastet ditt. Rett alle problemene ved å holde deg strengt til kilden. Fjern opplysninger som ikke har dekning i kilden, tilskriv avsenderens påstander, og gjengi sitater ordrett. Behold ellers form og lengde. Norsk bokmål.

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
