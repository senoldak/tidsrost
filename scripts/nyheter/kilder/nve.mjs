// NVE / Varsom: sel (flom), heyelan (jordskred) ve çığ (snøskred) uyarıları.
// Metinler NVE'nin kendi resmî uyarı metinlerinden şablonla kurulur; yapay zekâ kullanılmaz.
import { hentJson, osloIso } from '../lib.mjs';
import { varselkart, kommuneOmrader } from '../bilde.mjs';

const NIVA = { 2: 'Gult', 3: 'Oransje', 4: 'Rødt' };
const KARTFARGE = { 2: 'gul', 3: 'oransje', 4: 'rod' };
const TYPE = { flood: 'flom', landslide: 'jordskred' };
const SNOSKRED_NIVA = { 4: 'Stor', 5: 'Meget stor' };
const KILDE = { navn: 'NVE / Varsom', url: 'https://www.varsom.no/', lisens: 'NLOD' };

const dato = (d) => d.toISOString().slice(0, 10);
// Test için geçmiş bir tarih verilebilir: NVE_DATO=2026-08-15
const idag = () => (process.env.NVE_DATO ? new Date(`${process.env.NVE_DATO}T12:00:00Z`) : new Date());

// NVE tarihleri saat dilimi olmadan, Norveç saatiyle gelir ("2026-10-10T07:00:00").
const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const DAG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
// Bitiş saatleri "06:59:59" gibi gelir; okura "kl. 07.00" olarak gösterilir.
function tid(lokal) {
  const t = new Date(`${lokal.slice(0, 19)}Z`);
  if (t.getUTCSeconds() === 59) t.setUTCSeconds(60);
  const ukedag = DAG[t.getUTCDay()];
  const kl = `${String(t.getUTCHours()).padStart(2, '0')}.${String(t.getUTCMinutes()).padStart(2, '0')}`;
  return `${ukedag} ${t.getUTCDate()}. ${MND[t.getUTCMonth()]} kl. ${kl}`;
}

const liste = (navn) => (navn.length <= 1 ? navn.join('') : `${navn.slice(0, -1).join(', ')} og ${navn.at(-1)}`);

async function farevarsler(type) {
  const fra = idag();
  const til = new Date(fra.getTime() + 2 * 864e5);
  const url = `https://api01.nve.no/hydrology/forecast/${type}/v1.0.10/api/Warning/All/1/${dato(fra)}/${dato(til)}`;
  const data = await hentJson(url);

  // Her kommune ve her gün için ayrı kayıt gelir. Aynı olay (EventId) günler boyunca sabit kalır;
  // hepsini tek haberde topla, metin olarak olayın ilk gününün uyarısını kullan.
  const grupper = new Map();
  for (const w of data) {
    const niva = Number(w.ActivityLevel);
    const nokkel = [w.EventId, w.MasterId].find((x) => x && x !== 'xxx');
    if (niva < 2 || !nokkel) continue;
    let g = grupper.get(nokkel);
    if (!g) {
      g = { ...w, nokkel, niva, fylker: new Set(), kommuner: new Set(), fra: w.ValidFrom, til: w.ValidTo };
      grupper.set(nokkel, g);
    }
    g.niva = Math.max(g.niva, niva);
    for (const c of w.CountyList ?? []) g.fylker.add(c.Name);
    for (const k of w.MunicipalityList ?? []) g.kommuner.add(k.Id);
    if (w.ValidFrom < g.fra) Object.assign(g, { fra: w.ValidFrom, WarningText: w.WarningText, ConsequenceText: w.ConsequenceText, AdviceText: w.AdviceText });
    if (w.ValidTo > g.til) g.til = w.ValidTo;
  }

  // NVE metinlerindeki fazladan boşlukları temizle.
  const rens = (s) => (s ?? '').replace(/[ \t]{2,}/g, ' ').trim();

  return [...grupper.values()].map((g) => {
    const fylker = liste([...g.fylker].sort());
    const navn = TYPE[type];
    g.WarningText = rens(g.WarningText);
    g.ConsequenceText = rens(g.ConsequenceText);
    g.AdviceText = rens(g.AdviceText);
    return {
      id: `nve:${type}:${g.nokkel}`,
      tid: new Date(`${g.fra}Z`),
      tittel: `${NIVA[g.niva]} farevarsel for ${navn} i ${fylker}`,
      async lag() {
        const avsnitt = [
          `NVE har sendt ut ${NIVA[g.niva].toLowerCase()} farevarsel for ${navn} i ${fylker}.`,
          `Varselet gjelder fra ${tid(g.fra)} til ${tid(g.til)}.`,
          g.WarningText,
          g.ConsequenceText ? `**Mulige konsekvenser:** ${g.ConsequenceText}` : null,
          g.AdviceText ? `**Råd fra NVE:** ${g.AdviceText}` : null,
          'Følg med på oppdaterte varsler på [varsom.no](https://www.varsom.no/).',
        ].filter(Boolean);
        return {
          title: `${NIVA[g.niva]} farevarsel for ${navn} i ${fylker}`,
          description: (g.WarningText || `NVE varsler ${navn}fare i ${fylker}.`).split(/(?<=\.)\s/)[0],
          body: avsnitt.join('\n\n'),
          category: 'innenriks',
          breaking: g.niva >= 3,
          date: osloIso(),
          produksjon: 'automatisk',
          kilde: KILDE,
          bilde: {
            svg: async () =>
              varselkart({
                omrade: await kommuneOmrader([...g.kommuner]),
                niva: KARTFARGE[g.niva],
                tittel: `${NIVA[g.niva]} farevarsel`,
                undertittel: `${navn[0].toUpperCase()}${navn.slice(1)} · ${fylker}`,
                kilde: 'Varselområde: NVE. Kommunegrenser: © Kartverket',
                klippTilLand: true,
              }),
            alt: `Kart som viser kommunene med ${NIVA[g.niva].toLowerCase()} farevarsel for ${navn} i ${fylker}.`,
            kreditt: 'Kart: tidsrøst. Varselområde: NVE (NLOD). Kommunegrenser: © Kartverket (CC BY 4.0). Kartgrunnlag: Natural Earth.',
          },
        };
      },
    };
  });
}

// Çığ: sadece büyük (4) ve çok büyük (5) tehlike; kışın seviye 3 çok sık, haber değeri düşük.
async function snoskred() {
  const fra = idag();
  const til = new Date(fra.getTime() + 864e5);
  const url = `https://api01.nve.no/hydrology/forecast/avalanche/v6.3.0/api/RegionSummary/Simple/1/${dato(fra)}/${dato(til)}`;
  const regioner = await hentJson(url);
  const saker = [];
  for (const r of regioner) {
    for (const w of r.AvalancheWarningList ?? []) {
      const niva = Number(w.DangerLevel);
      if (niva < 4) continue;
      const dag = w.ValidFrom.slice(0, 10);
      saker.push({
        id: `nve:snoskred:${w.RegionId}:${dag}`,
        tid: new Date(`${w.ValidFrom}Z`),
        tittel: `${SNOSKRED_NIVA[niva]} snøskredfare i ${w.RegionName}`,
        async lag() {
          return {
            title: `${SNOSKRED_NIVA[niva]} snøskredfare i ${w.RegionName}`,
            description: `NVE varsler ${SNOSKRED_NIVA[niva].toLowerCase()} snøskredfare (faregrad ${niva}) i ${w.RegionName} ${tid(w.ValidFrom).replace(/ kl\..*/, '')}.`,
            body: [
              `NVE har satt faregrad ${niva} – ${SNOSKRED_NIVA[niva].toLowerCase()} snøskredfare – for ${w.RegionName} ${tid(w.ValidFrom).replace(/ kl\..*/, '')}.`,
              w.MainText,
              'Les hele varselet og rådene for ferdsel i skredterreng på [varsom.no](https://www.varsom.no/snoskred/).',
            ]
              .filter(Boolean)
              .join('\n\n'),
            category: 'innenriks',
            breaking: true,
            date: osloIso(),
            produksjon: 'automatisk',
            kilde: KILDE,
          };
        },
      });
    }
  }
  return saker;
}

export default {
  navn: 'nve',
  async hent() {
    const deler = await Promise.allSettled([farevarsler('flood'), farevarsler('landslide'), snoskred()]);
    for (const d of deler) if (d.status === 'rejected') console.error(`  nve: ${d.reason?.message ?? d.reason}`);
    return deler.flatMap((d) => (d.status === 'fulfilled' ? d.value : []));
  },
};
