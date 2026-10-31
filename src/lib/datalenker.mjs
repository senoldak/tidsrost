import styringsrente from '../data/styringsrente.json' with { type: 'json' };
import prisstigning from '../data/prisstigning.json' with { type: 'json' };
import boligpriser from '../data/boligpriser.json' with { type: 'json' };
import arbeidsledighet from '../data/arbeidsledighet.json' with { type: 'json' };

// Haberden ilgili veri sayfasına iç bağlantı: başlık ve gövdede geçen kavramlara göre en çok iki sayfa, en çok anılan
// önce. Saf ve test edilebilir (datalenker.test.mjs); artikkel sayfası "Tallene bak saken" kutusunda kullanır.
const SIDER = [
  { url: '/prisstigning/', navn: 'Prisstigningen nå', monster: /konsumpris|\bKPI\b|prisvekst|prisstigning|inflasjon/gi },
  { url: '/styringsrenten/', navn: 'Styringsrenten nå', monster: /styringsrent|\brenten\b|rentemøte|renteheving|rentekutt/gi },
  { url: '/boligpriser/', navn: 'Boligprisene nå', monster: /boligpris|bruktbolig|brukte boliger/gi },
  { url: '/arbeidsledighet/', navn: 'Arbeidsledigheten nå', monster: /arbeidsledig|\bledighet|\bAKU\b|arbeidskraftundersøkelse/gi },
  { url: '/farevarsler/', navn: 'Farevarsler i Norge', monster: /farevarsel|farevarsler/gi },
];

/** @returns {{ url: string, navn: string }[]} */
export function datasiderFor(tekst = '') {
  const s = String(tekst ?? '');
  return SIDER.map((d) => ({ url: d.url, navn: d.navn, n: (s.match(d.monster) ?? []).length }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map(({ url, navn }) => ({ url, navn }));
}

// ---- Datakort: ett kort med siste tall (Task 7) ----
const MAANEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const tall = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const prosent = (v, d) => `${v.toFixed(d).replace('.', ',').replace('-', '−')} %`;
const kildenavn = (k) => {
  const n = String(k?.navn ?? '').trim();
  return (n.match(/\(([^)]+)\)\s*$/)?.[1] ?? n) || null;
};
const dagTekst = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  const mnd = m ? MAANEDER[Number(m[2]) - 1] : undefined;
  return mnd ? `${Number(m[3])}. ${mnd} ${m[1]}` : null;
};
const maanedTekst = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym ?? ''));
  const mnd = m ? MAANEDER[Number(m[2]) - 1] : undefined;
  return mnd ? `${mnd} ${m[1]}` : null;
};
const kvartalTekst = (k) => {
  const m = /^(\d{4})K([1-4])$/.exec(String(k ?? ''));
  return m ? `${m[2]}. kvartal ${m[1]}` : null;
};

const KORT = {
  '/styringsrenten/': (d) => {
    const v = tall(d?.rente);
    const fra = dagTekst(d?.gjeldendeFra);
    return v === null || !fra ? null : { verdi: prosent(v, 2), tekst: `Styringsrenten nå, gjeldende fra ${fra}` };
  },
  '/prisstigning/': (d) => {
    const v = tall(d?.tolvMnd);
    const mnd = maanedTekst(d?.sisteMaaned);
    return v === null || !mnd ? null : { verdi: prosent(v, 1), tekst: `Prisstigning siste tolv måneder, ${mnd}` };
  },
  '/boligpriser/': (d) => {
    const v = tall(d?.regioner?.find((r) => r?.kode === 'TOTAL')?.endringAar);
    const kv = kvartalTekst(d?.sisteKvartal);
    return v === null || !kv ? null : { verdi: prosent(v, 1), tekst: `Boligprisene i hele landet, endring siste år, ${kv}` };
  },
  '/arbeidsledighet/': (d) => {
    const v = tall(d?.prosent);
    const mnd = maanedTekst(d?.sisteMaaned);
    return v === null || !mnd ? null : { verdi: prosent(v, 1), tekst: `Arbeidsledigheten (AKU), ${mnd}` };
  },
};
const DATA = { '/styringsrenten/': styringsrente, '/prisstigning/': prisstigning, '/boligpriser/': boligpriser, '/arbeidsledighet/': arbeidsledighet };

/**
 * Ett kort med siste tall for det temaet saken nevner oftest (styringsrente, prisstigning, boligpriser, ledighet).
 * Mangler verdi eller dato i dataene, prøves neste tema; ingen treff gir null. Tall formateres norsk, aldri oppdiktet.
 * @returns {{ navn: string, url: string, verdi: string, tekst: string, kilde: string } | null}
 */
export function datakortFor(tekst = '', data = DATA) {
  for (const { url, navn } of datasiderFor(tekst)) {
    const bygg = KORT[url];
    const d = data[url];
    const kilde = kildenavn(d?.kilde);
    const kort = bygg && kilde ? bygg(d) : null;
    if (kort) return { navn, url, kilde, ...kort };
  }
  return null;
}
