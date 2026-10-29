// /navn/<navn>/-sayfalarının veriden türeyen parçaları: sıra, değişim, zirve yılı, on yıl ortalaması, başlık ve
// açıklama, komşu bağlantılar. Saf fonksiyonlar; sabit metinde rakam yok, her sayı n.serie / n.fodte'den.
// Değer yargısı yok: yalnız "flere/færre", "økt/sunket" gibi yön sözcükleri.

const tall = (v, d = 0) => v.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
const prosentTekst = (p) => tall(p, Math.abs(p) >= 10 ? 0 : 1);
const aarSortert = (rec) => Object.keys(rec).sort();

/** 'J' → 'jentenavn', 'G' → 'guttenavn' */
export const kjonnNavn = (k) => (k === 'J' ? 'jentenavn' : 'guttenavn');

/** En çok doğum yılı: { aar, antall } (eşitlikte en yeni yıl). */
export function toppAar(fodte) {
  let best = null;
  for (const a of aarSortert(fodte)) if (!best || fodte[a] >= best.antall) best = { aar: a, antall: fodte[a] };
  return best;
}

/** On yıl başına yıllık ortalama doğum; en az `minAar` yıl dolu on yıllar. [{ tiaar: '1990', snitt, aarMed }] */
export function tiaarSnitt(fodte, minAar = 5) {
  const grupper = new Map();
  for (const a of aarSortert(fodte)) {
    const t = `${a.slice(0, 3)}0`;
    const g = grupper.get(t) ?? { sum: 0, aarMed: 0 };
    g.sum += fodte[a];
    g.aarMed += 1;
    grupper.set(t, g);
  }
  return [...grupper]
    .filter(([, g]) => g.aarMed >= minAar)
    .map(([tiaar, g]) => ({ tiaar, snitt: Math.round(g.sum / g.aarMed), aarMed: g.aarMed }));
}

/** Aynı cinsin içinde, `aar` yılında doğum sayısına göre sıra (1 = en çok). Veri yoksa null. */
export function fodtRang(data, n, aar) {
  if (typeof n.fodte?.[aar] !== 'number') return null;
  return 1 + data.fornavn.filter((m) => m.kjonn === n.kjonn && typeof m.fodte?.[aar] === 'number' && m.fodte[aar] > n.fodte[aar]).length;
}

/** Serinin ilk ve son yılı arasındaki yıl boşlukları var mı (SSB bazı yılları göstermiyor). */
export function harHull(rec) {
  const a = aarSortert(rec).map(Number);
  return a.length > 1 && a.at(-1) - a[0] + 1 !== a.length;
}

/** Veriden cümleler. `rang`: cins içi sıra (10501), `sisteFodt`: 10467'nin son yılı. */
export function navnSetninger(data, n, rang) {
  const ut = [];
  const navn = n.navn;
  const type = kjonnNavn(n.kjonn);
  if (rang) ut.push(`${navn} er det ${rang === 1 ? '' : `${rang}. `}mest brukte ${type}et i Norge, målt i antall personer som har navnet.`);
  const sa = aarSortert(n.serie);
  if (sa.length >= 2) {
    const fra = sa[0];
    const til = sa.at(-1);
    const a = n.serie[fra];
    const b = n.serie[til];
    const pst = a > 0 ? ((b - a) / a) * 100 : null;
    if (pst === null) {
      // sıfır başlangıçta yüzde tanımsız
    } else if (Math.abs(pst) < 1) {
      ut.push(`Antallet personer med navnet er omtrent uendret siden ${fra}: ${tall(a)} i ${fra} og ${tall(b)} i ${til}.`);
    } else {
      ut.push(`Siden ${fra} har antallet personer med navnet ${pst > 0 ? 'økt' : 'sunket'} fra ${tall(a)} til ${tall(b)}, ${pst > 0 ? 'en økning' : 'en nedgang'} på ${prosentTekst(Math.abs(pst))} prosent.`);
    }
  }
  const fa = aarSortert(n.fodte);
  if (fa.length) {
    const siste = fa.at(-1);
    const f = n.fodte[siste];
    const forrige = n.fodte[String(Number(siste) - 1)];
    let s = `I ${siste} ble navnet gitt til ${tall(f)} barn`;
    if (typeof forrige === 'number') s += f === forrige ? `, like mange som i ${Number(siste) - 1}.` : `, ${f > forrige ? 'flere' : 'færre'} enn i ${Number(siste) - 1}, da tallet var ${tall(forrige)}.`;
    else s += '.';
    ut.push(s);
    const topp = toppAar(n.fodte);
    if (topp.aar === siste) ut.push(`${siste} er året med flest barn i tallene fra ${fa[0]}.`);
    else ut.push(`Flest barn fikk navnet i ${topp.aar}, med ${tall(topp.antall)}. I ${siste} lå tallet på ${prosentTekst((f / topp.antall) * 100)} prosent av dette.`);
    const t = tiaarSnitt(n.fodte);
    if (t.length) {
      const best = t.reduce((m, x) => (x.snitt > m.snitt ? x : m));
      ut.push(`Målt per år var navnet mest brukt i ${best.tiaar}-årene, med i snitt ${tall(best.snitt)} barn i året.`);
    }
    const r = fodtRang(data, n, siste);
    if (r) ut.push(`Etter antall barn som fikk navnet i ${siste} står ${navn} på ${r}. plass blant ${type}ene i SSBs liste.`);
  }
  return ut;
}

/** <title> (Base " | tidsrøst" ekler; sonuç ≤ 49 karakter toplam ≤ 60 olsun). */
export function navnTittel(navn, maks = 49) {
  const adaylar = [`Hvor mange heter ${navn}? Statistikk fra SSB`, `Hvor mange heter ${navn}? Navnestatistikk`, `Hvor mange heter ${navn}? Tall fra SSB`, `Hvor mange heter ${navn}?`];
  return adaylar.find((t) => t.length <= maks) ?? adaylar.at(-1);
}

/** Meta description: veriden, 120–160 karakter. İlk uyan aday; hiçbiri uymazsa null (derleme hata verir). */
export function navnBeskrivelse(n, rang) {
  const type = kjonnNavn(n.kjonn);
  const a = tall(n.antall);
  const adaylar = [
    `${a} personer i Norge heter ${n.navn}. Se utviklingen i antall, når navnet ble gitt til flest barn og hvor det ligger blant ${type}ene. Tall fra SSB.`,
    `${a} personer i Norge heter ${n.navn}. Tall fra SSB om utviklingen, toppåret og plassen blant ${type}ene.`,
    `${a} personer heter ${n.navn}. Se utviklingen, toppåret og plassen blant ${type}ene i Norge, med tall fra SSB.`,
    `${a} personer i Norge heter ${n.navn}. Utvikling, toppår og plass blant ${type}ene, med tall fra Statistisk sentralbyrå.`,
  ];
  void rang;
  return adaylar.find((t) => t.length >= 120 && t.length <= 160) ?? null;
}

/**
 * Komşu sayfalar: aynı baş harfliler öncelikli, sonra alfabetik yakınlık. `sider` navne göre sıralı
 * [{ slug, navn, kjonn }]; kendisi hariç en çok `antall`.
 */
export function naboer(sider, slug, antall = 5) {
  const i = sider.findIndex((s) => s.slug === slug);
  if (i < 0) return [];
  const bokstav = (s) => s.navn[0].toLocaleLowerCase('nb');
  return sider
    .map((s, j) => ({ s, d: Math.abs(j - i), annen: bokstav(s) !== bokstav(sider[i]) }))
    .filter((x) => x.s.slug !== slug)
    .sort((x, y) => Number(x.annen) - Number(y.annen) || x.d - y.d)
    .slice(0, antall)
    .map((x) => x.s)
    .sort((x, y) => x.navn.localeCompare(y.navn, 'nb'));
}
