// /lonn/<yrke>/-sayfalarının veriden türeyen parçaları: karşılaştırma cümleleri, başlık, açıklama, komşu bağlantılar.
// Saf fonksiyonlar; sabit metinde rakam yok, her sayı src/data/lonn.json'dan. Değer yargısı yok: yalnız
// "over/under", "høyere/lavere", "økning/nedgang" gibi yön sözcükleri; kıyas ölçütü hep «alle yrker» medyanı.
import { ALLE, gruppeAv } from '../../scripts/data/ssb-lonn.mjs';

const tall = (v, d = 0) => v.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
const prosentTekst = (p) => tall(p, Math.abs(p) >= 10 ? 0 : 1);
const aarSortert = (rec) => Object.keys(rec).sort();
const er = (v) => typeof v === 'number' && Number.isFinite(v);

/** Aylıktan yıllığa: 12 ile çarpma (SSB'nin kendi årslønn istatistiği değil). */
export const aarslonn = (m) => (er(m) ? m * 12 : null);
export const kroner = (v) => `${tall(v)} kroner`;

/** 'Leger' → 'leger'; 'IKT-teknikere' gibi büyük harfle başlayan kısaltmalar olduğu gibi kalır. */
export function lavNavn(navn) {
  if (!navn) return navn;
  if (/^\p{Lu}{2,}/u.test(navn)) return navn;
  return navn[0].toLocaleLowerCase('nb') + navn.slice(1);
}

/** Parantez içini atar: 'Sivilingeniører (geofag, …)' → 'Sivilingeniører'. */
export const kortNavn = (navn) => navn.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

/** Yüzde fark ve yön (|p| < 0,5 → 'lik'). */
export function forskjell(a, b) {
  if (!er(a) || !er(b) || b === 0) return null;
  const pst = ((a - b) / b) * 100;
  if (Math.abs(pst) < 0.5) return { pst: 0, retning: 'lik' };
  return { pst: Math.abs(pst), retning: pst > 0 ? 'over' : 'under' };
}

/** Median sırası (1 = en yüksek) yalnız sayfası olan meslekler arasında. */
export function medianRang(data, sider, kode) {
  const kodene = new Set(sider.map((s) => s.kode));
  const liste = data.yrker.filter((y) => kodene.has(y.kode) && er(y.median));
  const y = liste.find((x) => x.kode === kode);
  if (!y) return null;
  return 1 + liste.filter((x) => x.median > y.median).length;
}

/** Serinin ilk ve son dolu noktası: { fra, til, a, b } ya da null. */
export function serieEndepunkt(serie) {
  const a = aarSortert(serie).filter((k) => er(serie[k]));
  if (a.length < 2) return null;
  return { fra: a[0], til: a.at(-1), a: serie[a[0]], b: serie[a.at(-1)] };
}

/** Veriden cümleler. `y`: sayfa mesleği, `rang`/`antallSider`: medyan sırası ve sayfa sayısı. */
export function lonnSetninger(data, y, rang, antallSider) {
  const alle = data.yrker.find((x) => x.kode === ALLE);
  const n = lavNavn(y.navn);
  const ut = [];
  const dm = alle ? forskjell(y.median, alle.median) : null;
  if (er(y.median) && dm) {
    ut.push(
      dm.retning === 'lik'
        ? `Median månedslønn for ${n} ligger på omtrent samme nivå som medianen for alle yrker, som er ${kroner(alle.median)}.`
        : `Median månedslønn for ${n} ligger ${prosentTekst(dm.pst)} prosent ${dm.retning} medianen for alle yrker, som er ${kroner(alle.median)}.`,
    );
  }
  if (rang && antallSider) ut.push(`Blant de ${antallSider} yrkene med egen side har ${n} den ${rang === 1 ? '' : `${rang}. `}høyeste medianen.`);
  const ds = forskjell(y.snitt, y.median);
  if (ds && er(y.snitt)) {
    ut.push(
      ds.retning === 'lik'
        ? `Gjennomsnittet er ${kroner(y.snitt)}, omtrent likt medianen.`
        : `Gjennomsnittet er ${kroner(y.snitt)}, ${prosentTekst(ds.pst)} prosent ${ds.retning} medianen.`,
    );
  }
  if (er(y.nedre) && er(y.ovre)) {
    ut.push(`Nedre kvartil er ${kroner(y.nedre)} og øvre kvartil ${kroner(y.ovre)}: en fjerdedel av månedslønnene ligger under det første beløpet, og en fjerdedel over det andre.`);
  }
  if (er(y.kvinner) && er(y.menn)) {
    const k = y.menn >= y.kvinner ? forskjell(y.menn, y.kvinner) : { ...forskjell(y.kvinner, y.menn), retning: 'under' };
    if (k.retning === 'lik') ut.push(`Median månedslønn er omtrent lik for kvinner og menn: ${kroner(y.kvinner)} for kvinner og ${kroner(y.menn)} for menn.`);
    else
      ut.push(
        `Median månedslønn er ${kroner(y.kvinner)} for kvinner og ${kroner(y.menn)} for menn. ${k.retning === 'over' ? 'Menn' : 'Kvinner'} ligger ${prosentTekst(k.pst)} prosent over ${k.retning === 'over' ? 'kvinner' : 'menn'}.`,
      );
  }
  if (er(y.kvinnerHv) && er(y.mennHv) && alle && er(alle.kvinnerHv) && er(alle.mennHv)) {
    const andel = (y.kvinnerHv / (y.kvinnerHv + y.mennHv)) * 100;
    const andelAlle = (alle.kvinnerHv / (alle.kvinnerHv + alle.mennHv)) * 100;
    ut.push(`Kvinner utgjør ${prosentTekst(andel)} prosent av heltidsekvivalentene i yrket. For alle yrker under ett er andelen ${prosentTekst(andelAlle)} prosent.`);
  }
  const deler = [
    ['privat sektor og offentlig eide foretak', y.sektor?.privat],
    ['kommuneforvaltningen', y.sektor?.kommune],
    ['statsforvaltningen', y.sektor?.stat],
  ].filter(([, v]) => er(v));
  if (deler.length >= 2) {
    const liste = deler.map(([navn, v]) => `${kroner(v)} i ${navn}`);
    ut.push(`Etter sektor er median månedslønn ${liste.slice(0, -1).join(', ')} og ${liste.at(-1)}.`);
  } else if (deler.length === 1) {
    ut.push(`SSB oppgir median etter sektor bare for ${deler[0][0]}: ${kroner(deler[0][1])}. Tallene for de andre sektorene er skjult av hensyn til konfidensialitet.`);
  }
  const e = serieEndepunkt(y.serie ?? {});
  if (e) {
    const p = forskjell(e.b, e.a);
    const ea = alle ? serieEndepunkt(alle.serie ?? {}) : null;
    const pa = ea && ea.fra === e.fra && ea.til === e.til ? forskjell(ea.b, ea.a) : null;
    let s =
      p.retning === 'lik'
        ? `Median månedslønn er omtrent uendret fra ${kroner(e.a)} i ${e.fra} til ${kroner(e.b)} i ${e.til}.`
        : `Median månedslønn har gått fra ${kroner(e.a)} i ${e.fra} til ${kroner(e.b)} i ${e.til}, ${p.retning === 'over' ? 'en økning' : 'en nedgang'} på ${prosentTekst(p.pst)} prosent.`;
    if (pa && pa.retning !== 'lik') s += ` For alle yrker under ett var ${pa.retning === 'over' ? 'økningen' : 'nedgangen'} ${prosentTekst(pa.pst)} prosent.`;
    ut.push(s);
  }
  if (er(y.heltidsekv) && alle && er(alle.heltidsekv)) {
    ut.push(`Yrket utgjør ${tall(y.heltidsekv)} heltidsekvivalenter, ${prosentTekst((y.heltidsekv / alle.heltidsekv) * 100)} prosent av alle i statistikken.`);
  }
  return ut;
}

/** <title> (Base " | tidsrøst" ekler; sonuç ≤ 49 karakter, toplam ≤ 60). */
export function lonnTittel(navn, maks = 49) {
  const adaylar = [];
  for (const n of [lavNavn(navn), lavNavn(kortNavn(navn))]) adaylar.push(`Lønn for ${n}: tall fra SSB`, `Lønn for ${n}`);
  const fant = adaylar.find((t) => t.length <= maks);
  if (fant) return fant;
  // Son çare: kısa ad kelime sınırında kesilir (üç nokta yok).
  let n = `Lønn for ${lavNavn(kortNavn(navn))}`;
  while (n.length > maks && n.includes(' ')) n = n.slice(0, n.lastIndexOf(' ')).replace(/[\s,-]+(og|i|av|for|mv\.?|innen)$/i, '');
  return n;
}

/** Meta description: veriden, 120–160 karakter; hiçbiri uymazsa null (derleme hata verir). */
export function lonnBeskrivelse(y, aar, fra) {
  const m = er(y.median) ? tall(y.median) : null;
  if (!m) return null;
  const snitt = er(y.snitt) ? ` Snittet var ${tall(y.snitt)} kroner.` : '';
  const ekstra = [
    ` Se tall for kvinner og menn, sektor og utviklingen siden ${fra}.`,
    ` Se tall for kvinner og menn og utviklingen siden ${fra}.`,
    ` Se forskjell mellom kvinner og menn og utviklingen siden ${fra}.`,
    ' Se også kvinner og menn og utviklingen.',
    ' Tall fra SSB.',
    '',
  ];
  for (const n of [lavNavn(y.navn), lavNavn(kortNavn(y.navn))]) {
    for (const s of [snitt, '']) {
      for (const e of ekstra) {
        const t = `Median månedslønn for ${n} var ${m} kroner i ${aar}.${s}${e}`;
        if (t.length >= 120 && t.length <= 160) return t;
      }
    }
  }
  return null;
}

/** Aynı ana gruptaki sayfası olan diğer meslekler: en çok `antall`, heltidsekv'e göre; sonra navne göre sıralı. */
export function lignende(data, sider, kode, antall = 6) {
  const g = gruppeAv(kode);
  const hv = new Map(data.yrker.map((y) => [y.kode, y.heltidsekv ?? 0]));
  return sider
    .filter((s) => s.kode !== kode && gruppeAv(s.kode) === g)
    .sort((a, b) => (hv.get(b.kode) ?? 0) - (hv.get(a.kode) ?? 0))
    .slice(0, antall)
    .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}
