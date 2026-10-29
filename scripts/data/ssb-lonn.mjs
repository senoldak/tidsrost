// Lønn etter yrke (/lonn/): SSB 11418 "Yrkesfordelt månedslønn" → sayfa verisi. Saf dönüştürücü; ağ işi hent-data.mjs'te.
// SSB'nin bastırdığı hücre (null) olduğu gibi kalır; tahmin edilmez. Yalnız toplu rakamlar (kişisel veri yok).
// Yrke kodları: '0-9' = Alle yrker, 1-haneli ana gruplar (3 yerine '3_01-03'), 4 haneli STYRK08 meslekler.
import { lesJsonStat2 } from './ssb.mjs';
import { lagSlug } from '../../src/lib/slug.mjs';

export const ALLE = '0-9';
// Ana gruplar (SSB kodları); 4 haneli '0xxx' (askeri) ve '3xxx' kodları '3_01-03' grubuna girer.
export const HOVEDGRUPPER = ['1', '2', '3_01-03', '4', '5', '6', '7', '8', '9'];
// 2015 farklı referans ayı ve hesap yöntemiyle (SSB notu); seri 2016'dan başlar.
export const SERIE_FRA = 2016;

/** SSB etiketindeki satır sonu tireleri ve boşluk hataları (yalnız bilinenler). */
const ETIKETT_RETT = [
  [/petro-leum/g, 'petroleum'],
  [/material-forvaltere/g, 'materialforvaltere'],
  [/og - forvaltere/g, 'og -forvaltere'],
];
export function rensEtikett(etikett) {
  return ETIKETT_RETT.reduce((t, [re, ny]) => t.replace(re, ny), String(etikett).trim());
}

/** 4 haneli koddan ana grup kodu. */
export const gruppeAv = (kode) => (kode[0] === '0' || kode[0] === '3' ? '3_01-03' : kode[0]);

const sayi = (v) => typeof v === 'number' && Number.isFinite(v);
const hent = (m, k) => (sayi(m.get(k)) ? m.get(k) : null);

/**
 * @param {object} siste JSON-stat2: MaaleMetode 01,02,11,051,061; tüm Yrke/Sektor/Kjonn; AvtaltVanlig 0; son yıl
 * @param {object} [serie] JSON-stat2: median (01), ALLE sektör, Kjonn 0, AvtaltVanlig 0, tüm yıllar
 * @returns {{ oppdatert: string|null, sisteAar: string, yrker: { kode: string, navn: string, median: number|null, snitt: number|null,
 *   heltidsekv: number|null, kvinner: number|null, menn: number|null, kvinnerHv: number|null, mennHv: number|null,
 *   nedre: number|null, ovre: number|null, sektor: { stat: number|null, kommune: number|null, privat: number|null },
 *   serie: Record<string, number|null> }[] }}
 */
export function lonnData(siste, serie) {
  const s = lesJsonStat2(siste);
  const aar = [...new Set(s.rader.map((r) => r.Tid))].sort();
  const sisteAar = aar.at(-1);
  if (!sisteAar) throw new Error('SSB 11418: ingen tall');
  // yrke → Map('mål|sektor|kjønn' → verdi); yalnız son yıl
  const per = new Map();
  for (const r of s.rader) {
    if (r.Tid !== sisteAar) continue;
    if (!per.has(r.Yrke)) per.set(r.Yrke, new Map());
    per.get(r.Yrke).set(`${r.MaaleMetode}|${r.Sektor}|${r.Kjonn}`, r.verdi);
  }
  const serier = new Map();
  if (serie) {
    const t = lesJsonStat2(serie);
    for (const r of t.rader) {
      if (r.MaaleMetode !== '01' || r.Sektor !== 'ALLE' || r.Kjonn !== '0') continue;
      if (Number(r.Tid) < SERIE_FRA) continue;
      if (!serier.has(r.Yrke)) serier.set(r.Yrke, {});
      serier.get(r.Yrke)[r.Tid] = r.verdi;
    }
  }
  const yrker = [];
  for (const [kode, m] of per) {
    const erFire = /^\d{4}$/.test(kode) && kode !== '0000';
    if (kode !== ALLE && !HOVEDGRUPPER.includes(kode) && !erFire) continue;
    const median = hent(m, '01|ALLE|0');
    const heltidsekv = hent(m, '11|ALLE|0');
    if (erFire && median === null && heltidsekv === null) continue;
    yrker.push({
      kode,
      navn: kode === ALLE ? 'Alle yrker' : rensEtikett(s.etiketter.Yrke[kode] ?? kode),
      median,
      snitt: hent(m, '02|ALLE|0'),
      heltidsekv,
      kvinner: hent(m, '01|ALLE|2'),
      menn: hent(m, '01|ALLE|1'),
      kvinnerHv: hent(m, '11|ALLE|2'),
      mennHv: hent(m, '11|ALLE|1'),
      nedre: hent(m, '051|ALLE|0'),
      ovre: hent(m, '061|ALLE|0'),
      sektor: { stat: hent(m, '01|6100|0'), kommune: hent(m, '01|6500|0'), privat: hent(m, '01|A+B+D+E|0') },
      serie: serier.get(kode) ?? {},
    });
  }
  if (!yrker.some((y) => y.kode === ALLE && y.median !== null)) throw new Error('SSB 11418: mangler «Alle yrker»');
  return { oppdatert: s.oppdatert, sisteAar, yrker };
}

/**
 * Kendi sayfası olan meslekler: 4 haneli kod, medyanı dolu, heltidsekv'e göre en büyük `topp`.
 * Slug kısa etiketten (parantezsiz); çakışırsa '-<kod>'.
 * @returns {{ slug: string, kode: string, navn: string }[]} (navne göre sıralı)
 */
export function lonnSider(data, { topp = 100 } = {}) {
  const valgt = data.yrker
    .filter((y) => /^\d{4}$/.test(y.kode) && y.kode !== '0000' && y.median !== null && y.heltidsekv !== null)
    .sort((a, b) => b.heltidsekv - a.heltidsekv || a.kode.localeCompare(b.kode))
    .slice(0, topp);
  const grunn = new Map();
  for (const y of valgt) {
    const sl = lagSlug(y.navn.replace(/\s*\([^)]*\)/g, '')) || y.kode;
    grunn.set(sl, [...(grunn.get(sl) ?? []), y]);
  }
  const ut = [];
  for (const [sl, gruppe] of grunn) for (const y of gruppe) ut.push({ slug: gruppe.length > 1 ? `${sl}-${y.kode}` : sl, kode: y.kode, navn: y.navn });
  return ut.sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}

/**
 * Dosya boyutu için: serie, sektör, kvartil, cinsiyet kırılımı yalnız kendi sayfası olan mesleklerde, 'Alle yrker'de ve
 * ana gruplarda kalır; diğerlerinde yalnız ad, median, snitt, heltidsekv (arama için). lonnSider(komprimer(d)) === lonnSider(d).
 */
export function komprimer(data, opt = {}) {
  const full = new Set([ALLE, ...HOVEDGRUPPER, ...lonnSider(data, opt).map((s) => s.kode)]);
  return {
    ...data,
    yrker: data.yrker.map((y) =>
      full.has(y.kode)
        ? y
        : { kode: y.kode, navn: y.navn, median: y.median, snitt: y.snitt, heltidsekv: y.heltidsekv },
    ),
  };
}
