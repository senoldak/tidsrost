// Haber sitelerinin akışları. Resmi kaynakların aksine burada tek sitenin haberi
// yazılmaz: bir olay ancak en az MIN_MEDIER farklı sitede yer aldıysa haber olur (başka sitenin özel haberini
// sahiplenmemek ve tek kaynağa dayanmamak için, sahibin kararı 2026-10-11).
// Sahibin kesin kuralı (2026-10-11): haber siteleri ve ajanslar ne metinde, ne kaynak satırında, ne görselde
// anılır. Bu yüzden bir sitenin kendi ortaya çıkardığı bilgiye ("erfarer", "kjenner til") dayanan olay yazılmaz;
// medyaya atfedilen bilgi ("ifølge <medie>") metne alınmaz. Kaynak satırı yok, kapakta kategori yazar.
//
// Akış: akışlar → son 24 saatin başlıkları → tek Gemini çağrısıyla aynı olayı anlatanlar gruplanır ve son 48 saatte
// yazılmış haberlerle eşlenir → MIN_MEDIER siteye ulaşan grup aday olur → lag(): sayfa metinleri, taslak, yazı işleri.
//
// Akış listesi repoda açık durmaz (repo herkese açık): hemmelige-kilder.kryptert dosyasından okunur (bkz. ../hemmelig.mjs).
// Site adı ve adresi kimliklere, loglara ve sett.json'a girmez: kimlik `medier:<anahtarlı özet>`, logda kısa kod;
// gerçek ad ve bağlantı yalnızca haberin şifreli kildeSpor alanına yazılır.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentTekst, lesRss, htmlTilTekst, gemini, osloIso, KATEGORIER } from '../lib.mjs';
import { redigerSak, forLiteKilde, LENGDE_REGEL, TITTEL_REGEL } from '../redaktor.mjs';
import { uavhengigeKilder } from '../uavhengighet.mjs';
import { benzerlik, komsusuzlar, olcumSatiri } from '../gomme.mjs';
import { gommeAyari } from '../vektorler.mjs';
import { yerelOlcum } from '../yerel-model.mjs';
import { fjernAdresser, hemmeligeKilder, hmacId, kildeKode, kildeSpor } from '../hemmelig.mjs';

const { kontroll } = JSON.parse(await readFile(new URL('../../../src/lib/redaksjon.json', import.meta.url), 'utf8'));
const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const MIN_MEDIER = 2;
const MAKS_ALDER_TIMER = 24;

// Aynı sitenin birden fazla akışı olabilir; teyit sayımında site adı (medie) esas alınır.
// { medie, feed } listesi; anahtar yoksa boş (bot yalnızca resmi kaynakları okur).
export const AKISLAR = hemmeligeKilder().feeder;

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
    const ingress = md.match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] ?? '';
    const dato = Date.parse(md.match(/^date:\s*(\S+)/m)?.[1] ?? '');
    if (tittel && dato >= grense) ut.push({ tittel, tekst: `${tittel}\n${ingress}` });
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
${publisert.length ? publisert.map((t) => `- ${t.tittel ?? t}`).join('\n') : '(ingen)'}`,
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
    body: { type: 'string', description: 'Brødtekst i Markdown, 250–400 ord i 4–6 avsnitt, uten overskrift' },
    category: { type: 'string', enum: KATEGORIER },
  },
  required: ['egnet', 'title', 'description', 'body', 'category'],
};

function prompt(kilder) {
  const navn = [...new Set(kilder.map((k) => k.medie))];
  return `Du er nyhetsjournalist i nettavisen tidsrøst, som arbeider etter Vær Varsom-plakaten. Under er saker fra ${navn.length} norske medier (${navn.join(', ')}) om samme hendelse. Skriv en nøytral, fullverdig nyhetssak på norsk bokmål.

Kilde og tilskriving (VVP 2.7, 3.1):
- Bruk bare opplysninger som står i sakene, helst det flere av dem forteller. Er sakene uenige om et tall eller en opplysning, ta det ikke med.
- Nevn ALDRI et medie, en nettavis, en tv-kanal, et nyhetsbyrå eller en podkast ved navn (heller ikke ${navn.join(', ')}), og skriv ikke «melder flere medier» eller lignende. Skriv saken som en selvstendig nyhetssak.
- Opplysninger som bare tilskrives et medie («ifølge avisen», «sier han til kanalen», «avisen erfarer») skal utelates helt. Uttalelser kan gjengis med hvem som sa dem, men uten å nevne hvilket medie de ble sagt til.
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
- Første avsnitt forteller det viktigste. Ingen overskrift i body, ingen kildeliste og ingen lenker.
${LENGDE_REGEL}
${TITTEL_REGEL}
- Kategori: sport for idrett; kultur for kultur og underholdning; okonomi for næringsliv, økonomi og arbeidsliv; teknologi for teknologi; utenriks for saker utenfor Norge; ellers innenriks.

${kilder.map((k, i) => `### Sak ${i + 1}: ${k.medie}\nTittel: ${k.tittel}\nIngress: ${k.ingress}\n${k.tekst ? `Tekst:\n${k.tekst.slice(0, 6000)}` : ''}`).join('\n\n')}`;
}

// Gemini Faz 2 (27 Ekim 2026): gömme ölçümü (golge) ve ön eleme (acik). Gömme "aynı olay" demez. Açıkken başka
// hiçbir başlığa ve son 48 saatin yayımlananlarına alt eşik üstünde benzemeyen başlık grup kuramaz (MIN_MEDIER=2) ve
// istemden çıkar; görüldü işaretlenmez (sonraki turda benzer bir başlık gelirse yeniden aday olur). Yayımlananlardan
// yalnız kalan bir başlığa yakın olanlar gider. Medya adı vektör metnine ve loga girmez.
const GOMME_ONBELLEGI = fileURLToPath(new URL('../gomme-onbellek.json', import.meta.url));
export const gommeMetni = (s) => `${s.tittel}\n${String(s.ingress ?? '').slice(0, 300)}`;

/** Döner: { secilen: saker indeksleri, publisert: gönderilecek yayımlananlar, vs, vp } ya da gömme yoksa null. */
export async function gommeOnEleme(saker, publisert, ayar) {
  let v = null;
  try {
    v = await ayar.vektorle([...saker.map(gommeMetni), ...publisert.map((p) => p.tekst ?? p.tittel)], { onbellek: ayar.onbellek, amac: 'medier/gomme' });
  } catch {
    v = null;
  }
  if (!v) return null;
  const vs = v.slice(0, saker.length);
  const vp = v.slice(saker.length);
  if (ayar.kip !== 'acik') return { secilen: saker.map((_, i) => i), publisert, vs, vp };
  const yalniz = komsusuzlar(vs, vp, ayar.alt);
  const secilen = saker.map((_, i) => i).filter((i) => !yalniz.has(i));
  const yakin = (j) => vp[j] && secilen.some((i) => vs[i] && benzerlik(vs[i], vp[j]) >= ayar.alt);
  return { secilen, publisert: publisert.filter((_, j) => !vp[j] || yakin(j)), vs, vp };
}

/**
 * Ölçüm (golge): grup içi ve kjente "aynı", farklı gruplardan en çok 20 rastgele çift "farklı". g indeksleri saker'e göre.
 * metin: { s: saker metinleri, p: yayımlananların metinleri } (gommeMetni ile aynı). Döner: yerel gölgeye (yerel-model.mjs)
 * gidecek çiftler; metin yoksa boş.
 */
export function gommeOlcumu(g, r, log = console.log, metin = null) {
  const ciftler = [];
  const yaz = (x, y, tur, karar, id, a, b) => {
    if (!x || !y) return;
    const bg = benzerlik(x, y);
    log(olcumSatiri({ tur, karar, b: bg, id }));
    if (metin && a && b) ciftler.push({ tur, karar, a, b, bg, dil: 'no', id });
  };
  const s = (i) => metin?.s[i];
  for (const grp of g.grupper) for (const i of grp.slice(1)) yaz(r.vs[grp[0]], r.vs[i], 'grup', 'ayni', String(grp[0]), s(grp[0]), s(i));
  for (const i of g.kjente) {
    if (!r.vs[i]) continue;
    let enYakin = -1;
    r.vp.forEach((p, j) => {
      if (p && (enYakin < 0 || benzerlik(r.vs[i], p) > benzerlik(r.vs[i], r.vp[enYakin]))) enYakin = j;
    });
    yaz(r.vs[i], r.vp[enYakin], 'kjent', 'ayni', String(i), s(i), metin?.p[enYakin]);
  }
  const grubu = new Map();
  g.grupper.forEach((grp, k) => grp.forEach((i) => grubu.set(i, k)));
  const farkli = [];
  for (let i = 0; i < r.vs.length; i++) {
    for (let j = i + 1; j < r.vs.length; j++) if (!(grubu.has(i) && grubu.get(i) === grubu.get(j))) farkli.push([i, j]);
  }
  for (let k = farkli.length - 1; k > 0; k--) {
    const m = Math.floor(Math.random() * (k + 1));
    [farkli[k], farkli[m]] = [farkli[m], farkli[k]];
  }
  for (const [i, j] of farkli.slice(0, 20)) yaz(r.vs[i], r.vs[j], 'aday', 'farkli', String(i), s(i), s(j));
  return ciftler;
}

export default {
  navn: 'medier',
  // Loglarda ve durum dosyasında bu kaynağın adayları maskelenir (bkz. hent-nyheter.mjs).
  skjult: true,
  async hent({ sett = {}, akislar = AKISLAR } = {}) {
    const naa = Date.now();
    const saker = [];
    const lenker = new Set();
    for (const a of akislar) {
      let liste = [];
      try {
        liste = lesRss(await hentTekst(a.feed));
      } catch (e) {
        console.warn(`  medier: ${kildeKode(a.medie)} akış okunamadı (${fjernAdresser(e.message)})`);
        continue;
      }
      for (const i of liste) {
        const tid = new Date(i.pubDate);
        const id = `medier:${hmacId(i.link)}`;
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
    const publisert = await nyligeSaker();
    const ayar = gommeAyari({ onbellekDosyasi: GOMME_ONBELLEGI });
    const on = ayar ? await gommeOnEleme(saker, publisert, ayar) : null;
    const secilen = on ? on.secilen : saker.map((_, i) => i);
    if (on && ayar.kip === 'acik') console.log(`  medier: gömme ${saker.length - secilen.length} başlığı istemden çıkardı, ${publisert.length - on.publisert.length} yayımlanmışı`);
    // Gruplama seçilen başlıklarla; indeksler saker'e geri çevrilir.
    const ham = secilen.length ? await grupper(secilen.map((i) => saker[i]), on ? on.publisert : publisert) : { grupper: [], kjente: new Set() };
    const g = ham && { grupper: ham.grupper.map((grp) => grp.map((i) => secilen[i])), kjente: new Set([...ham.kjente].map((i) => secilen[i])) };
    if (g && on && ayar.kip === 'golge') {
      const metin = { s: saker.map(gommeMetni), p: on.publisert.map((p) => p.tekst ?? p.tittel) };
      try {
        await yerelOlcum(gommeOlcumu(g, on, ayar.log, metin), { log: ayar.log });
      } catch {
        // yerel gölge düşerse gruplama etkilenmez
      }
    }
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
    skjult: true,
    // Grubun bütün başlıkları birlikte görüldü işaretlenir.
    ider: alle.map((s) => s.id),
    tid,
    // Site adları başlığa yazılmaz; parantezde yalnızca site sayısı durur (viktighet.mjs modele göstermez).
    tittel: `${valgt[0].tittel} (${new Set(alle.map((s) => s.medie)).size} medier)`,
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
      // Sadece başlık ve özet okunabildiyse (ücretli sayfalar) uydurmadan tam haber çıkmaz.
      if (forLiteKilde(valgt.map((k) => `${k.ingress}\n\n${k.tekst}`).join('\n\n'))) return { hopp: 'for lite kildemateriale for en fullverdig sak' };
      const ai = await gemini({ prompt: prompt(valgt), schema: SKJEMA });
      if (!ai) return null;
      if (!ai.egnet) return { hopp: 'ikke egnet (varsomhet eller ikke nyhet)' };
      const { egnet, ...sak } = ai;
      // Kaynak satırı yok; hangi sitelerden yazıldığı yalnızca şifreli kildeSpor'da kalır (sitede gösterilmez).
      const felles = { ...sak, date: osloIso(), kilder: [], kildeSpor: kildeSpor(valgt.map((k) => ({ navn: k.medie, url: k.url }))) };
      if (kontroll === 'ingen') return { ...felles, produksjon: 'ki-medier' };
      if (kontroll === 'manuell') return { ...felles, draft: true, produksjon: 'ki-assistert' };
      const kildeTekst = valgt.map((k) => `Medie: ${k.medie}\nTittel: ${k.tittel}\nIngress: ${k.ingress}\n\n${k.tekst}`).join('\n\n---\n\n');
      const { sak: ferdig, merknader, stopp, bekle } = await redigerSak(sak, kildeTekst, { medier: true });
      if (bekle) return { bekle: `vaktsjef-onay alınamadı: ${merknader.join(' / ')}`.slice(0, 400) };
      // Son kontrolde sorun kalırsa (medya adı, kaynakta olmayan rakam/alıntı) yayınlanmaz, taslak da açılmaz.
      if (stopp.length) return { hopp: `kontroll: ${stopp.join(' / ')}` };
      return { ...felles, ...ferdig, produksjon: 'ki-medier', kildeTekst, ...(merknader.length && { merknader }) };
    },
  };
}
