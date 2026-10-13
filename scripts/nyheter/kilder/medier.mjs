// Haber sitelerinin akışları (NRK, VG, Aftenposten …). Resmi kaynakların aksine burada tek sitenin haberi
// yazılmaz: bir olay ancak en az MIN_MEDIER farklı sitede yer aldıysa haber olur (başka sitenin özel haberini
// sahiplenmemek ve tek kaynağa dayanmamak için, sahibin kararı 2026-10-11).
// Sahibin kesin kuralı (2026-10-11): haber siteleri ve ajanslar ne metinde, ne kaynak satırında, ne görselde
// anılır. Bu yüzden bir sitenin kendi ortaya çıkardığı bilgiye ("erfarer", "kjenner til") dayanan olay yazılmaz;
// medyaya atfedilen bilgi ("ifølge Financial Times") metne alınmaz. Kaynak satırı yok, kapakta kategori yazar.
//
// Akış: akışlar → son 24 saatin başlıkları → tek Gemini çağrısıyla aynı olayı anlatanlar gruplanır ve son 48 saatte
// yazılmış haberlerle eşlenir → MIN_MEDIER siteye ulaşan grup aday olur → lag(): sayfa metinleri, taslak, yazı işleri.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentTekst, lesRss, htmlTilTekst, gemini, osloIso, KATEGORIER } from '../lib.mjs';
import { redigerSak } from '../redaktor.mjs';
import { uavhengigeKilder } from '../uavhengighet.mjs';

const { kontroll } = JSON.parse(await readFile(new URL('../../../src/lib/redaksjon.json', import.meta.url), 'utf8'));
const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const MIN_MEDIER = 2;
const MAKS_ALDER_TIMER = 24;

// Aynı sitenin birden fazla akışı olabilir (NRK); teyit sayımında site adı (medie) esas alınır.
export const AKISLAR = [
  { medie: 'NRK', feed: 'https://www.nrk.no/toppsaker.rss' },
  { medie: 'NRK', feed: 'https://www.nrk.no/nyheter/siste.rss' },
  { medie: 'VG', feed: 'https://www.vg.no/rss/feed' },
  { medie: 'Aftenposten', feed: 'https://www.aftenposten.no/rss' },
  { medie: 'Dagbladet', feed: 'https://www.dagbladet.no/?lab_viewport=rss' },
  { medie: 'E24', feed: 'https://e24.no/rss2/' },
  { medie: 'TV 2', feed: 'https://www.tv2.no/rss/nyheter' },
  { medie: 'Nettavisen', feed: 'https://www.nettavisen.no/service/rich-rss' },
  { medie: 'Bergens Tidende', feed: 'https://www.bt.no/rss' },
  { medie: 'Dagsavisen', feed: 'https://www.dagsavisen.no/rss' },
];

// Makale sayfasından gövde: en uzun <article> içindeki 40 karakterden uzun paragraflar. Ücretli sayfalarda
// sadece giriş gelir; o zaman akıştaki özet kullanılır.
export function brodtekst(html) {
  const artikkel = html.match(/<article[\s\S]*?<\/article>/gi)?.sort((a, b) => b.length - a.length)[0] ?? html;
  return [...artikkel.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlTilTekst(m[1]))
    .filter((p) => p.length > 40 && !/^(Publisert|Oppdatert|Foto|Del saken|Les også|Annonse)\b/i.test(p))
    .join('\n\n');
}

// Son 48 saatte yayımlanmış haberlerin başlıkları (resmi kaynaklardan yazılanlar dahil): aynı olay iki kez yazılmasın.
async function nyligeSaker(timer = 48) {
  const base = path.join(ROT, 'src/content/haberler');
  const grense = Date.now() - timer * 36e5;
  const ut = [];
  for (const d of await readdir(base).catch(() => [])) {
    const md = await readFile(path.join(base, d, 'index.md'), 'utf8').catch(() => '');
    const tittel = md.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1];
    const dato = Date.parse(md.match(/^date:\s*(\S+)/m)?.[1] ?? '');
    if (tittel && dato >= grense) ut.push(tittel);
  }
  return ut;
}

const GRUPPE_SKJEMA = {
  type: 'object',
  properties: {
    grupper: { type: 'array', items: { type: 'array', items: { type: 'integer' } }, description: 'Numre på overskrifter som handler om samme konkrete hendelse' },
    kjente: { type: 'array', items: { type: 'integer' }, description: 'Numre på overskrifter som handler om en hendelse vi allerede har skrevet om' },
  },
  required: ['grupper', 'kjente'],
};

/** Gemini ile grupla; dönen gruplar aday indeksleridir. Gemini yoksa ya da yanıt gelmezse null. */
export async function grupper(saker, publisert, { kall = gemini } = {}) {
  if (!saker.length) return { grupper: [], kjente: new Set() };
  const svar = await kall({
    schema: GRUPPE_SKJEMA,
    // Gruppering er klassifisering: minimal tenkning holder og koster mindre.
    tenkning: 'minimal',
    prompt: `Du er vaktsjef i en norsk nettavis. Under er ferske overskrifter fra flere medier. Grupper overskriftene som handler om SAMME konkrete hendelse (samme kamp, samme vedtak, samme ulykke, samme utspill). Ulike hendelser om samme tema skal IKKE i samme gruppe. Hver overskrift i høyst én gruppe; overskrifter uten match kan utelates.
Marker også i «kjente» overskrifter som handler om en hendelse som allerede står i listen over publiserte saker.

OVERSKRIFTER:
${saker.map((s, i) => `${i}. [${s.medie}] ${s.tittel}${s.ingress ? ` — ${s.ingress.slice(0, 200)}` : ''}`).join('\n')}

PUBLISERTE SAKER (siste 48 timer):
${publisert.length ? publisert.map((t) => `- ${t}`).join('\n') : '(ingen)'}`,
  });
  if (!svar) return null;
  const gyldig = (i) => Number.isInteger(i) && i >= 0 && i < saker.length;
  const brukt = new Set();
  const ut = [];
  for (const g of svar.grupper ?? []) {
    const medlemmer = [...new Set(g.filter(gyldig))].filter((i) => !brukt.has(i));
    medlemmer.forEach((i) => brukt.add(i));
    if (medlemmer.length) ut.push(medlemmer);
  }
  return { grupper: ut, kjente: new Set((svar.kjente ?? []).filter(gyldig)) };
}

// Bir grubun bağımsız kaynak sayısı: farklı siteler, ama aynı ajans metnini (NTB) basanlar tek kaynak.
export const antallMedier = (medlemmer) => uavhengigeKilder(medlemmer);

const SKJEMA = {
  type: 'object',
  properties: {
    egnet: { type: 'boolean', description: 'false hvis saken ikke egner seg (se reglene)' },
    title: { type: 'string', description: 'Nyhetstittel, maks 90 tegn' },
    description: { type: 'string', description: 'Ingress, 1–2 setninger' },
    body: { type: 'string', description: 'Brødtekst i Markdown, 2–5 avsnitt, uten overskrift' },
    category: { type: 'string', enum: KATEGORIER },
  },
  required: ['egnet', 'title', 'description', 'body', 'category'],
};

function prompt(kilder) {
  const navn = [...new Set(kilder.map((k) => k.medie))];
  return `Du er nyhetsjournalist i nettavisen tidsrøst, som arbeider etter Vær Varsom-plakaten. Under er saker fra ${navn.length} norske medier (${navn.join(', ')}) om samme hendelse. Skriv en kort, nøytral nyhetssak på norsk bokmål.

Kilde og tilskriving (VVP 2.7, 3.1):
- Bruk bare opplysninger som står i sakene, helst det flere av dem forteller. Er sakene uenige om et tall eller en opplysning, ta det ikke med.
- Nevn ALDRI et medie, en nettavis, en tv-kanal, et nyhetsbyrå eller en podkast ved navn (NRK, VG, TV 2, Reuters, NTB, AFP, Financial Times …), og skriv ikke «melder flere medier» eller lignende. Skriv saken som en selvstendig nyhetssak.
- Opplysninger som bare tilskrives et medie («ifølge Financial Times», «sier han til TV 2», «NRK erfarer») skal utelates helt. Uttalelser kan gjengis med hvem som sa dem, men uten å nevne hvilket medie de ble sagt til.
- Bygger hele saken på opplysninger som ett medie har avdekket selv («erfarer», «kjenner til», «avslører», «har fått innsyn i», «har fått vite»), sett egnet=false.
- Påstander og vurderinger fra personer, partier, selskaper eller myndigheter tilskrives dem. Ikke legg til egne vurderinger, kommentarer eller bakgrunn fra egen kunnskap.

Nøyaktighet (VVP 3.2, 4.4):
- Tall gjengis nøyaktig som i sakene. Tittel og ingress skal ikke gå lenger enn det er dekning for.
- Direkte sitater bare ordrett fra sakene, i anførselstegn og med navn. Ellers egne ord, ikke kopier setninger.
- Ikke skriv relative tidsuttrykk som «i går» eller «i dag»; bruk ukedag eller dato hvis den står i sakene.

Varsomhet (VVP 4.3, 4.5, 4.7, 4.8):
- Sett egnet=false hvis saken dreier seg om en identifiserbar privatperson (navn, bilde eller detaljer som gjør vedkommende gjenkjennelig), enkeltsaker om kriminalitet der mistenkte eller ofre kan identifiseres, barn, selvmord, eller ulykker der omkomne eller skadde kan identifiseres. Sett også egnet=false for kommentarer, anmeldelser, debatt, quiz, reklame, tv-program, «se høydepunktene»-saker og saker uten nyhetsinnhold. Fyll da ut de andre feltene med tomme strenger.
- Store hendelser som krig, angrep, naturkatastrofer, større ulykker og politiets arbeid i saker av offentlig interesse er vanlige nyheter (egnet=true), så lenge du ikke navngir eller identifiserer ofre, mistenkte eller pårørende som ikke er offentlige personer. Skriv nøkternt, uten detaljer om lidelse.
- Ellers egnet=true.

Form:
- Første avsnitt forteller det viktigste. 2–5 korte avsnitt. Ingen overskrift i body, ingen kildeliste og ingen lenker.
- Kategori: sport for idrett; kultur for kultur og underholdning; okonomi for næringsliv, økonomi og arbeidsliv; teknologi for teknologi; utenriks for saker utenfor Norge; ellers innenriks.

${kilder.map((k, i) => `### Sak ${i + 1}: ${k.medie}\nTittel: ${k.tittel}\nIngress: ${k.ingress}\n${k.tekst ? `Tekst:\n${k.tekst.slice(0, 6000)}` : ''}`).join('\n\n')}`;
}

export default {
  navn: 'medier',
  async hent({ sett = {} } = {}) {
    const naa = Date.now();
    const saker = [];
    const lenker = new Set();
    for (const a of AKISLAR) {
      let liste = [];
      try {
        liste = lesRss(await hentTekst(a.feed));
      } catch (e) {
        console.warn(`  medier: ${a.medie} akış okunamadı (${e.message})`);
        continue;
      }
      for (const i of liste) {
        const tid = new Date(i.pubDate);
        const id = `medier:${i.link}`;
        if (!i.link?.startsWith('https://') || lenker.has(i.link) || sett[id]) continue;
        if (Number.isNaN(tid.getTime()) || naa - tid > MAKS_ALDER_TIMER * 36e5 || tid > naa) continue;
        lenker.add(i.link);
        saker.push({ id, medie: a.medie, tittel: i.title, ingress: htmlTilTekst(i.description ?? ''), url: i.link, tid });
      }
    }
    if (!process.env.GEMINI_API_KEY) {
      console.log(`  medier: ${saker.length} overskrifter; gruppering krever GEMINI_API_KEY`);
      return [];
    }
    const g = await grupper(saker, await nyligeSaker());
    if (!g) {
      console.warn('  medier: gruppering mislyktes; prøver igjen neste kjøring');
      return [];
    }
    const kandidater = [];
    for (const idx of g.grupper) {
      if (idx.some((i) => g.kjente.has(i))) continue;
      const medlemmer = idx.map((i) => saker[i]);
      if (antallMedier(medlemmer) < MIN_MEDIER) continue;
      // Her siteden bir sak, en fazla 6 (ajans kopyaları elendikten sonra yine en az iki bağımsız kalsın).
      const valgt = [];
      for (const s of medlemmer) if (!valgt.some((v) => v.medie === s.medie)) valgt.push(s);
      kandidater.push(lagKandidat(valgt.slice(0, 6), medlemmer));
    }
    // Zaten yazılmış olaya ait başlıklar görüldü sayılır (sonraki çalışmada tekrar gruplanmasın);
    // hent-nyheter.mjs bunları alleredeSett'ten işaretler.
    this.alleredeSett = [...g.kjente].map((i) => saker[i].id);
    console.log(`  medier: ${saker.length} overskrifter, ${g.grupper.length} grupper, ${kandidater.length} med minst ${MIN_MEDIER} medier, ${this.alleredeSett.length} allerede skrevet`);
    return kandidater;
  },
};

function lagKandidat(valgt, alle) {
  const tid = new Date(Math.max(...alle.map((s) => s.tid)));
  return {
    id: valgt[0].id,
    // Grubun bütün başlıkları birlikte görüldü işaretlenir.
    ider: alle.map((s) => s.id),
    tid,
    tittel: `${valgt[0].tittel} (${[...new Set(alle.map((s) => s.medie))].join(', ')})`,
    async lag() {
      for (const k of valgt) {
        try {
          k.tekst = brodtekst(await hentTekst(k.url));
        } catch {
          k.tekst = '';
        }
      }
      // Gövde metinleriyle yeniden say: başlıkları farklı olsa da metin aynı ajanstan olabilir.
      if (uavhengigeKilder(valgt) < MIN_MEDIER) return { hopp: `bare én uavhengig kilde (byråsak eller kopi)` };
      const ai = await gemini({ prompt: prompt(valgt), schema: SKJEMA });
      if (!ai) return null;
      if (!ai.egnet) return { hopp: 'ikke egnet (varsomhet eller ikke nyhet)' };
      const { egnet, ...sak } = ai;
      const felles = { ...sak, date: osloIso(), kilder: [] };
      if (kontroll === 'ingen') return { ...felles, produksjon: 'ki-medier' };
      if (kontroll === 'manuell') return { ...felles, draft: true, produksjon: 'ki-assistert' };
      const kildeTekst = valgt.map((k) => `Medie: ${k.medie}\nTittel: ${k.tittel}\nIngress: ${k.ingress}\n\n${k.tekst}`).join('\n\n---\n\n');
      const { sak: ferdig, merknader, stopp } = await redigerSak(sak, kildeTekst, { medier: true });
      // Son kontrolde sorun kalırsa (medya adı, kaynakta olmayan rakam/alıntı) yayınlanmaz, taslak da açılmaz.
      if (stopp.length) return { hopp: `kontroll: ${stopp.join(' / ')}` };
      return { ...felles, ...ferdig, produksjon: 'ki-medier', ...(merknader.length && { merknader }) };
    },
  };
}
