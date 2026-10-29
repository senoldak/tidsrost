// SSB veri sayfalarının (/prisstigning/, /boligpriser/, /arbeidsledighet/) saf dönüştürücüleri: JSON-stat2 → sayfa verisi.
// Ağ işi hent-data.mjs'te. Hiçbir değer tahmin edilmez: ana rakam yoksa ya da makul aralığın dışındaysa hata fırlatılır,
// çağıran eski dosyayı olduğu gibi bırakır. Grup ve bölge adları SSB'nin kendi etiketleridir.
import { lesJsonStat2 } from './ssb.mjs';

const tall = (v) => typeof v === 'number' && Number.isFinite(v);
const innen = (v, min, max) => tall(v) && v >= min && v <= max;
const en = (v) => Math.round(v * 10) / 10;
// SSB dönem kodları: 2026M09 → 2026-09; çeyrek kodu (2026K3) olduğu gibi kalır.
const maaned = (tid) => `${tid.slice(0, 4)}-${tid.slice(5)}`;

function tabell(json) {
  const { oppdatert, rader, etiketter } = lesJsonStat2(json);
  const finn = (krit) => rader.find((r) => Object.entries(krit).every(([k, v]) => r[k] === v))?.verdi ?? null;
  const perioder = [...new Set(rader.map((r) => r.Tid))].sort();
  return { oppdatert, rader, etiketter, finn, perioder };
}

/** Siste periode der hovedserien har verdi. */
function sistePeriode(perioder, verdi) {
  for (let i = perioder.length - 1; i >= 0; i--) if (tall(verdi(perioder[i]))) return perioder[i];
  return null;
}

/**
 * Tablo 14700 (KPI etter vare- og tjenestegruppe): 12 aylık değişim ve ağırlık. İstek: grup '00' + diğerleri,
 * ContentsCode Tolvmanedersendring ve KpiVektMnd.
 */
export function prisstigning(json) {
  const t = tabell(json);
  const v = (grp, tid, cc = 'Tolvmanedersendring') => t.finn({ VareTjenesteGrp: grp, ContentsCode: cc, Tid: tid });
  const siste = sistePeriode(t.perioder, (p) => v('00', p));
  if (!siste) throw new Error('SSB 14700: mangler tolvmånedersendring for KPI i alt');
  const tolvMnd = v('00', siste);
  if (!innen(tolvMnd, -30, 30)) throw new Error(`SSB 14700: urimelig tolvmånedersendring ${tolvMnd}`);
  const koder = Object.keys(t.etiketter.VareTjenesteGrp ?? {}).filter((k) => k !== '00');
  const grupper = koder.map((kode) => {
    const g = v(kode, siste);
    if (g !== null && !innen(g, -60, 60)) throw new Error(`SSB 14700: urimelig verdi ${g} for gruppe ${kode}`);
    return { kode, navn: t.etiketter.VareTjenesteGrp[kode], tolvMnd: g, vekt: v(kode, siste, 'KpiVektMnd') };
  });
  const serie = t.perioder.filter((p) => p <= siste && tall(v('00', p))).map((p) => ({ maaned: maaned(p), tolvMnd: v('00', p) }));
  return { oppdatert: t.oppdatert, sisteMaaned: maaned(siste), tolvMnd, grupper, serie };
}

/** Tablo 07221 (Prisindeks for brukte boliger, Boligtype 00, Boligindeks): son 13 çeyrek, bütün bölgeler. */
export function boligpriser(json) {
  const t = tabell(json);
  const v = (reg, tid) => t.finn({ Region: reg, Tid: tid });
  const siste = sistePeriode(t.perioder, (p) => v('TOTAL', p));
  if (!siste) throw new Error('SSB 07221: mangler indeks for hele landet');
  const iSiste = t.perioder.indexOf(siste);
  const aarFor = iSiste >= 4 ? t.perioder[iSiste - 4] : null;
  const regioner = Object.keys(t.etiketter.Region ?? {}).map((kode) => {
    const indeks = v(kode, siste);
    if (indeks !== null && !innen(indeks, 0, 1000)) throw new Error(`SSB 07221: urimelig indeks ${indeks} for ${kode}`);
    const for4 = aarFor ? v(kode, aarFor) : null;
    const endringAar = tall(indeks) && tall(for4) && for4 > 0 ? en((indeks / for4 - 1) * 100) : null;
    return { kode, navn: t.etiketter.Region[kode], indeks, endringAar };
  });
  if (!tall(regioner.find((r) => r.kode === 'TOTAL')?.indeks)) throw new Error('SSB 07221: mangler indeks for hele landet');
  const serie = t.perioder
    .slice(0, iSiste + 1)
    .filter((p) => tall(v('TOTAL', p)))
    .slice(-12)
    .map((p) => ({ kvartal: p, indeks: v('TOTAL', p) }));
  return { oppdatert: t.oppdatert, sisteKvartal: siste, regioner, serie };
}

const GRUPPER = [
  { kode: 'kvinner', Kjonn: '2', Alder: '15-74', navn: 'Kvinner' },
  { kode: 'menn', Kjonn: '1', Alder: '15-74', navn: 'Menn' },
  { kode: '15-24', Kjonn: '0', Alder: '15-24', navn: '15–24 år' },
  { kode: '25-74', Kjonn: '0', Alder: '25-74', navn: '25–74 år' },
];

/** Tablo 13760 (AKU, ArbledProsArbstyrk, sesongjustert): ana oran 15–74 yaş, gruplar, son 24 ay. */
export function arbeidsledighet(json) {
  const t = tabell(json);
  const v = (kjonn, alder, tid) => t.finn({ Kjonn: kjonn, Alder: alder, Tid: tid });
  const siste = sistePeriode(t.perioder, (p) => v('0', '15-74', p));
  if (!siste) throw new Error('SSB 13760: mangler arbeidsledighet for 15–74 år');
  const prosent = v('0', '15-74', siste);
  if (!innen(prosent, 0, 30)) throw new Error(`SSB 13760: urimelig arbeidsledighet ${prosent}`);
  const grupper = GRUPPER.map((g) => {
    const p = v(g.Kjonn, g.Alder, siste);
    if (p !== null && !innen(p, 0, 60)) throw new Error(`SSB 13760: urimelig verdi ${p} for ${g.kode}`);
    return { kode: g.kode, navn: g.navn, prosent: p };
  });
  const serie = t.perioder
    .filter((p) => p <= siste && tall(v('0', '15-74', p)))
    .slice(-24)
    .map((p) => ({ maaned: maaned(p), prosent: v('0', '15-74', p) }));
  return { oppdatert: t.oppdatert, sisteMaaned: maaned(siste), prosent, grupper, serie };
}

/**
 * Tablo 14711 (yıllık, 1865–) ve 14710 (aylık, 1920M03–): tarihsel KPI (2025=100). Bastırılmış (null) hücreler atlanır;
 * sisteAar / sisteMnd serinin son dolu dönemidir. İstek: ContentsCode KpiAar / KpiIndMnd, Tid '*'.
 */
export function kpiHistorisk(aarJson, mndJson) {
  const a = tabell(aarJson);
  const m = tabell(mndJson);
  const aar = {};
  for (const p of a.perioder) {
    const v = a.finn({ ContentsCode: 'KpiAar', Tid: p });
    if (tall(v)) aar[p] = v;
  }
  const mnd = {};
  for (const p of m.perioder) {
    const v = m.finn({ ContentsCode: 'KpiIndMnd', Tid: p });
    if (tall(v)) mnd[maaned(p)] = v;
  }
  const sisteAar = Object.keys(aar).at(-1);
  const sisteMnd = Object.keys(mnd).at(-1);
  if (!sisteAar || !sisteMnd) throw new Error('SSB 14711/14710: mangler indeksverdier');
  for (const [k, v] of [...Object.entries(aar), ...Object.entries(mnd)]) {
    if (!innen(v, 0, 100_000)) throw new Error(`SSB 14711/14710: urimelig indeks ${v} for ${k}`);
  }
  return { oppdatert: a.oppdatert ?? m.oppdatert, aar, mnd, sisteAar, sisteMnd };
}
