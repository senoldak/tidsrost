// Farevarsel sayfasının istatistikleri: src/data/varselarkiv.json → dönem sayıları, karşılaştırma ve özet cümleleri.
// Saf ve test edilebilir (varselstat.test.mjs). Dönem tam kaplanmıyorsa (MET arşivi yılda bir güncellenir, arada
// boşluk olabilir) sayfa o dönemi göstermez: erKomplett. Rakam uydurulmaz.
import { fylkeNavn } from './fylker.mjs';

const OSLO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' });
const osloDag = (iso) => OSLO.format(new Date(iso));
const topla = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sonGun = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** Arşiv aylarının günleri toplanır; arşivin son gününden sonraki günler kendi kaydımızdan (lopende) gelir. */
export function dagerFraArkiv(arkiv) {
  const aylar = Object.keys(arkiv?.maaneder ?? {}).sort();
  const arkivTil = aylar.length ? sonGun(aylar.at(-1)) : '';
  const ut = {};
  const ekle = (d, v) => {
    const h = (ut[d] ??= { land: {}, landTotal: [0, 0, 0], hav: [0, 0, 0] });
    h.landTotal = topla(h.landTotal, v.landTotal);
    h.hav = topla(h.hav, v.hav);
    for (const [f, c] of Object.entries(v.land ?? {})) h.land[f] = topla(h.land[f] ?? [0, 0, 0], c);
  };
  for (const ay of aylar) for (const [d, v] of Object.entries(arkiv.maaneder[ay].dager ?? {})) if (d <= arkivTil) ekle(d, v);
  for (const [d, v] of Object.entries(arkiv?.lopende?.dager ?? {})) if (d > arkivTil) ekle(d, v);
  return Object.fromEntries(Object.keys(ut).sort().map((k) => [k, ut[k]]));
}

/** Hangi günler kaplanıyor: arşiv (ilk ayın ilk günü → son ayın son günü) ve kendi kaydımız (fra → son alma günü). */
export function dekning(arkiv) {
  const aylar = Object.keys(arkiv?.maaneder ?? {}).sort();
  const l = arkiv?.lopende;
  return {
    arkivFra: aylar.length ? `${aylar[0]}-01` : null,
    arkivTil: aylar.length ? sonGun(aylar.at(-1)) : null,
    egneFra: l?.fra ?? null,
    egneTil: l?.hentet ? osloDag(l.hentet) : null,
  };
}

const ertesi = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** [fra, til] günleri arşiv ve kendi kaydımızla boşluksuz kaplanıyor mu? */
export function erKomplett(dk, fra, til) {
  if (!fra || !til || fra > til) return false;
  const araliklar = [
    [dk.arkivFra, dk.arkivTil],
    [dk.egneFra, dk.egneTil],
  ].filter(([a, b]) => a && b);
  let d = fra;
  while (d <= til) {
    const a = araliklar.find(([x, y]) => x <= d && d <= y);
    if (!a) return false;
    d = ertesi(a[1]);
  }
  return true;
}

/** Dönem sayıları: kara toplamı [gult, oransje, rødt], fylke başına uyarı sayısı ve seviye kırılımı, deniz. */
export function periodeTall(dager, fra, til) {
  let total = [0, 0, 0];
  let hav = [0, 0, 0];
  const fylker = {};
  const fylkerNiva = {};
  for (const [d, v] of Object.entries(dager)) {
    if (d < fra || d > til) continue;
    total = topla(total, v.landTotal);
    hav = topla(hav, v.hav);
    for (const [f, c] of Object.entries(v.land ?? {})) {
      fylker[f] = (fylker[f] ?? 0) + c[0] + c[1] + c[2];
      fylkerNiva[f] = topla(fylkerNiva[f] ?? [0, 0, 0], c);
    }
  }
  return { total, fylker, fylkerNiva, hav };
}

export const hittilIAar = (dager, idag) => periodeTall(dager, `${idag.slice(0, 4)}-01-01`, idag);

const sum = (t) => t[0] + t[1] + t[2];

/** Her yıl 1 Ocak → aynı ay-gün arası kara uyarıları; 29 Şubat artık olmayan yılda 28 Şubat sayılır. */
export function sammenlign(dager, idag, fraAar, tilAar = Number(idag.slice(0, 4))) {
  const md = idag.slice(5);
  const ut = [];
  for (let aar = fraAar; aar <= tilAar; aar++) {
    const skudd = (aar % 4 === 0 && aar % 100 !== 0) || aar % 400 === 0;
    const slutt = `${aar}-${md === '02-29' && !skudd ? '02-28' : md}`;
    ut.push({ aar, total: sum(periodeTall(dager, `${aar}-01-01`, slutt).total) });
  }
  return ut;
}

export const helAar = (dager, aar) => sum(periodeTall(dager, `${aar}-01-01`, `${aar}-12-31`).total);

export function toppFylker(fylker, n = 2) {
  return Object.entries(fylker)
    .filter(([, a]) => a > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([kode, antall]) => ({ kode, navn: fylkeNavn(kode), antall }));
}

const ORD = ['null', 'ett', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv'];
const ord = (n) => (n < ORD.length ? ORD[n] : String(n));
const stor = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const og = (l) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} og ${l.at(-1)}`);

/**
 * 1–3 sade bokmål cümle: kaç uyarı, kaçı turuncu/kırmızı, en çok hangi fylkeler. Kurallı; yeni bilgi eklemez.
 * @param {{ total: number[], fylker: Record<string, number> }} stat
 * @param {string} periode ör. 'de siste 30 dagene', 'hittil i år', 'i 2025'
 */
export function oppsummering(stat, periode) {
  const n = sum(stat.total);
  if (n === 0) return [`Det er ikke sendt ut farevarsler på land ${periode}.`];
  const ut = [`Meteorologisk institutt har sendt ut ${n} ${n === 1 ? 'farevarsel' : 'farevarsler'} på land ${periode}.`];
  const [, o, r] = stat.total;
  const deler = [];
  if (o) deler.push(`${ord(o)} var oransje`);
  if (r) deler.push(`${ord(r)} var ${r === 1 ? 'rødt' : 'røde'}`);
  if (deler.length && n > 1) ut.push(`${stor(deler[0].replace(' var ', ' av dem var '))}${deler[1] ? ` og ${deler[1]}` : ''}.`);
  const topp = toppFylker(stat.fylker, 2);
  if (topp.length) ut.push(`Flest gikk til ${og(topp.map((t) => t.navn))}.`);
  return ut;
}
