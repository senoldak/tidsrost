// DEVRE DIŞI (2026-10-17): Actions ve Cloudflare çıkışı Azure WAF 403 alıyor; bkz. hent-nyheter.mjs, KILDER.
// UDI: aylık istatistik tabloları (iltica başvuruları, çalışma ve aile izinleri).
// Tabloya yeni ay eklenince o ay için bir veri haberi yazılır. Yapay zekâ kullanılmaz:
// metin sabit Norveççe kalıplarla tablodaki rakamlardan kurulur (produksjon: automatisk).
import { hentTekst, decodeEntities, osloIso } from '../lib.mjs';
import { tallkort } from '../bilde.mjs';

const BASE = 'https://www.udi.no/statistikk-og-analyse/statistikk/';
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const MND_NAVN = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

// slug(år): tablonun adresi. Metinler: tittel(antall, måned), ingress, enhet.
const TABELLER = [
  {
    navn: 'asyl',
    slug: (ar) => `asylsoknader-etter-statsborgerskap-og-maned-${ar}/`,
    tittel: (n, m) => `${n} søkte asyl i Norge i ${m}`,
    hva: 'asylsøknader',
    verb: 'registrerte',
    overlinje: 'Asylsøknader',
  },
  {
    navn: 'arbeid',
    slug: (ar) => `innvilgede-arbeidstillatelser-for-tredjelandsborgere-etter-maned-og-statsborgerskap-${ar}/`,
    tittel: (n, m) => `UDI innvilget ${n} arbeidstillatelser i ${m}`,
    hva: 'arbeidstillatelser til borgere fra land utenfor EU/EØS',
    verb: 'innvilget',
    overlinje: 'Arbeidstillatelser',
  },
  {
    navn: 'familie',
    slug: (ar) => `innvilgede-familietillatelser-for-tredjelandborgere-etter-maned-og-statsborgerskap-${ar}/`,
    tittel: (n, m) => `UDI innvilget ${n} familietillatelser i ${m}`,
    hva: 'familietillatelser til borgere fra land utenfor EU/EØS',
    verb: 'innvilget',
    overlinje: 'Familietillatelser',
  },
];

const tall = (n) => n.toLocaleString('nb-NO');
const stor = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Tablodaki ilk <table>: { kolonner: ['Jan', …, 'Total'], rader: [{ land, verdier: { Jan: 4, … } }], total }
async function lesTabell(url) {
  const html = await hentTekst(url);
  const i = html.indexOf('<table');
  if (i < 0) throw new Error(`UDI: tabell mangler: ${url}`);
  const tabell = html.slice(i, html.indexOf('</table>', i));
  const celler = (rad) => [...rad.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decodeEntities(c[1].replace(/<[^>]+>/g, '')).trim());
  const [hode, ...rader] = [...tabell.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => celler(r[0]));
  const kolonner = hode.slice(1).map((k) => (k === 'Totalt' ? 'Total' : k));
  const tilRad = (r) => ({ land: r[0], verdier: Object.fromEntries(kolonner.map((k, n) => [k, Number(String(r[n + 1]).replace(/\s/g, '')) || 0])) });
  const alle = rader.filter((r) => r.length === hode.length).map(tilRad);
  const erTotal = (r) => /^Total(t)?$/.test(r.land);
  return { kolonner, rader: alle.filter((r) => !erTotal(r)), total: alle.find(erTotal) };
}

function lagSak(t, ar, mnd, denne, ifjor) {
  const kol = MND[mnd];
  const mNavn = `${MND_NAVN[mnd]} ${ar}`;
  const sum = denne.total.verdier[kol];
  const forrigeKol = mnd > 0 ? MND[mnd - 1] : null;
  const forrige = forrigeKol ? denne.total.verdier[forrigeKol] : null;
  const ifjorSum = ifjor?.total?.verdier[kol];
  const hittil = MND.slice(0, mnd + 1).reduce((s, k) => s + (denne.total.verdier[k] ?? 0), 0);
  const hittilIfjor = ifjor?.total ? MND.slice(0, mnd + 1).reduce((s, k) => s + (ifjor.total.verdier[k] ?? 0), 0) : null;
  const topp = denne.rader.filter((r) => r.verdier[kol] > 0).sort((a, b) => b.verdier[kol] - a.verdier[kol]).slice(0, 5);
  const url = BASE + t.slug(ar);

  const sammenligning = [
    forrige != null ? `${sum > forrige ? 'flere' : sum < forrige ? 'færre' : 'like mange'} enn i ${MND_NAVN[mnd - 1]} (${tall(forrige)})` : null,
    ifjorSum != null ? `${sum > ifjorSum ? 'flere' : sum < ifjorSum ? 'færre' : 'like mange'} enn i ${MND_NAVN[mnd]} i fjor (${tall(ifjorSum)})` : null,
  ].filter(Boolean);

  const avsnitt = [
    `Utlendingsdirektoratet (UDI) ${t.verb} ${tall(sum)} ${t.hva} i ${mNavn}. Det er ${sammenligning.join(' og ') || 'første måned i statistikken'}.`,
    topp.length
      ? `Flest gjaldt borgere fra ${topp.slice(0, 3).map((r) => `${r.land} (${tall(r.verdier[kol])})`).join(', ').replace(/, ([^,]*)$/, ' og $1')}.`
      : null,
    `Hittil i år er tallet ${tall(hittil)}${hittilIfjor != null ? `, mot ${tall(hittilIfjor)} i samme periode i fjor` : ''}.`,
    topp.length ? `| Statsborgerskap | ${stor(MND_NAVN[mnd])} |\n|---|---:|\n${topp.map((r) => `| ${r.land} | ${tall(r.verdier[kol])} |`).join('\n')}\n| **Totalt** | **${tall(sum)}** |` : null,
    `Tallene er hentet fra UDIs månedlige statistikk og kan bli justert senere.`,
  ].filter(Boolean);

  return {
    title: t.tittel(tall(sum), MND_NAVN[mnd]),
    description: `UDI ${t.verb} ${tall(sum)} ${t.hva} i ${mNavn}${sammenligning[0] ? `, ${sammenligning[0]}` : ''}.`,
    body: avsnitt.join('\n\n'),
    category: 'innenriks',
    date: osloIso(),
    produksjon: 'automatisk',
    kilde: { navn: 'Utlendingsdirektoratet (UDI)', url },
    bilde: {
      svg: () => tallkort({ overlinje: `${t.overlinje}, ${mNavn}`, tall: tall(sum), underlinje: forrige != null ? `${sum >= forrige ? '▲' : '▼'} fra ${tall(forrige)} i ${MND_NAVN[mnd - 1]}` : 'Kilde: UDI' }),
      alt: `${t.overlinje} i ${mNavn}: ${tall(sum)}.`,
      kreditt: 'Grafikk: tidsrøst. Data: UDI.',
    },
  };
}

export default {
  navn: 'udi',
  // Üç tablonun aynı ayı aynı anda gelir; ilk çalışmada hepsi yazılsın.
  forsteGang: 3,
  async hent() {
    // Haber konusu: geçen ay (UDI ayın ilk günlerinde günceller). Ocak'ta geçen ay önceki yılın tablosunda.
    const naa = new Date();
    const mal = new Date(Date.UTC(naa.getUTCFullYear(), naa.getUTCMonth() - 1, 1));
    const ar = mal.getUTCFullYear();
    const mnd = mal.getUTCMonth();
    const ut = [];
    for (const t of TABELLER) {
      let denne;
      try {
        denne = await lesTabell(BASE + t.slug(ar));
      } catch (e) {
        console.warn(`  udi: ${t.navn} ${ar} alınamadı (${e.message})`);
        continue;
      }
      // Ay sütunu henüz yoksa ya da boşsa UDI o ayı yayınlamamış demektir.
      if (!denne.kolonner.includes(MND[mnd]) || !denne.total?.verdier[MND[mnd]]) continue;
      ut.push({
        id: `udi:${t.navn}:${ar}-${String(mnd + 1).padStart(2, '0')}`,
        tid: new Date(Date.UTC(ar, mnd + 1, 1)),
        tittel: `UDI ${t.navn} ${MND_NAVN[mnd]} ${ar}`,
        async lag() {
          let ifjor = null;
          try {
            ifjor = await lesTabell(BASE + t.slug(ar - 1));
          } catch {
            // Geçen yılın tablosu yoksa karşılaştırma yapılmaz.
          }
          return lagSak(t, ar, mnd, denne, ifjor);
        },
      });
    }
    return ut;
  },
};
