// Kommunene i tall (/kommune/): SSB 07459 (alder), 06913 (folketall og endringer), 11342 (areal), 06944 (husholdningsinntekt)
// → sayfa verisi. Saf dönüştürücü; ağ işi hent-data.mjs'te. SSB'nin bastırdığı hücre (null) olduğu gibi kalır; tahmin edilmez.
// Yalnız güncel kommuneler: 4 haneli kod, son yılda folketall dolu, 'xx99' (uoppgitt) hariç. Eski kodlar (-2019, 2020–2023) düşer.
import { lesJsonStat2 } from './ssb.mjs';
import { lagSlug } from '../../src/lib/slug.mjs';
import { FYLKER } from '../../src/lib/fylker.mjs';

const sayi = (v) => typeof v === 'number' && Number.isFinite(v);
const dolu = (v) => (sayi(v) ? v : null);
const rund = (v, d) => (sayi(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const erKommune = (kode) => /^\d{4}$/.test(kode) && !kode.endsWith('99');

/** Yaş kodundan yıl: '000'..'099', '100'..'104', '105+' → sayı. */
const alderAar = (kode) => parseInt(kode, 10);

/** Yaş grupları: 0–17, 18–66, 67+. */
export function aldersgruppe(aar) {
  return aar <= 17 ? 'barn' : aar <= 66 ? 'voksne' : 'eldre';
}

/**
 * @param {object} t07459 JSON-stat2: Region (hepsi), Kjonn 1/2, Alder tümü, Personer1, son yıl
 * @param {object} t06913 JSON-stat2: Region (hepsi), 8 ContentsCode, son 11 yıl
 * @param {object} t11342 JSON-stat2: Region (hepsi), Folkemengde/ArealKm2/LandArealKm2/FolkeLandArealKm2, son yıl
 * @param {object} [t06944] JSON-stat2: Region (hepsi), HusholdType 0000, InntSkatt, son yıl
 * @param {object} [hist] JSON-stat2: 06913 Folkemengde, codelist agg_KommSummerHist (kod 'K_<kommunekode>'): bugünkü kommune sınırlarına
 *   göre birleştirilmiş zaman serisi. Birleşen kommunelerin (2020 ve 2024 reformları) eski yılları yalnız böyle gelir; yoksa 06913'ün kendi serisi.
 * @returns {{ oppdatert: string|null, sisteAar: string, endringAar: string|null, inntektAar: string|null,
 *   kommuner: object[], land: object, fylker: Record<string, object> }}
 */
export function kommuneData(t07459, t06913, t11342, t06944, hist) {
  const bef = lesJsonStat2(t06913);
  const alder = lesJsonStat2(t07459);
  const areal = lesJsonStat2(t11342);
  const innt = t06944 ? lesJsonStat2(t06944) : null;
  const histPer = new Map(); // kommunekode → { Tid: folkemengde }
  if (hist) {
    for (const r of lesJsonStat2(hist).rader) {
      const m = /^K[_-](\d{4})$/.exec(r.Region);
      if (m && r.ContentsCode === 'Folkemengde') (histPer.get(m[1]) ?? histPer.set(m[1], {}).get(m[1]))[r.Tid] = r.verdi;
    }
  }

  // region → ContentsCode → Tid → verdi
  const per = new Map();
  for (const r of bef.rader) {
    if (!per.has(r.Region)) per.set(r.Region, {});
    const m = per.get(r.Region);
    (m[r.ContentsCode] ??= {})[r.Tid] = r.verdi;
  }
  const landFolk = per.get('0')?.Folkemengde ?? {};
  const aar = Object.keys(landFolk).filter((a) => sayi(landFolk[a])).sort();
  const sisteAar = aar.at(-1);
  if (!sisteAar) throw new Error('SSB 06913: ingen folkemengde for hele landet');
  const fraAar = Number(sisteAar) - 10;
  // Endringstall (født, døde, flytting) hører til et helt kalenderår: siste år der hele landet har tall.
  const landLev = per.get('0')?.Levende ?? {};
  const endringAar = Object.keys(landLev).filter((a) => sayi(landLev[a])).sort().at(-1) ?? null;

  const kommunekoder = [...per.keys()].filter((k) => erKommune(k) && (per.get(k).Folkemengde?.[sisteAar] ?? 0) > 0);
  if (kommunekoder.length === 0) throw new Error('SSB 06913: ingen kommuner med folketall');

  // Yaş: region → { barn, voksne, eldre } kişi sayıları; yalnız son yıl (sisteAar ile aynı olmalı)
  const alderAarSiste = [...new Set(alder.rader.map((r) => r.Tid))].sort().at(-1);
  const alderSum = new Map();
  for (const r of alder.rader) {
    if (r.Tid !== alderAarSiste || !sayi(r.verdi)) continue;
    if (!alderSum.has(r.Region)) alderSum.set(r.Region, { barn: 0, voksne: 0, eldre: 0 });
    alderSum.get(r.Region)[aldersgruppe(alderAar(r.Alder))] += r.verdi;
  }
  const andelAv = (kode) => {
    const s = alderSum.get(kode);
    if (!s) return null;
    const tot = s.barn + s.voksne + s.eldre;
    if (tot <= 0) return null;
    return { barn: rund((s.barn / tot) * 100, 1), voksne: rund((s.voksne / tot) * 100, 1), eldre: rund((s.eldre / tot) * 100, 1) };
  };

  // Areal: region → { areal, landareal }
  const arealAarSiste = [...new Set(areal.rader.map((r) => r.Tid))].sort().at(-1);
  const arealPer = new Map();
  for (const r of areal.rader) {
    if (r.Tid !== arealAarSiste) continue;
    if (!arealPer.has(r.Region)) arealPer.set(r.Region, {});
    arealPer.get(r.Region)[r.ContentsCode] = r.verdi;
  }

  // Inntekt: median husholdningsinntekt etter skatt (HusholdType 0000)
  const inntektAar = innt ? ([...new Set(innt.rader.map((r) => r.Tid))].sort().at(-1) ?? null) : null;
  const inntektPer = new Map();
  if (innt) {
    for (const r of innt.rader) {
      if (r.Tid === inntektAar && r.HusholdType === '0000' && r.ContentsCode === 'InntSkatt') inntektPer.set(r.Region, dolu(r.verdi));
    }
  }

  const post = (kode) => {
    const m = per.get(kode) ?? {};
    const folk = dolu(m.Folkemengde?.[sisteAar]);
    const serie10 = {};
    const kilde = histPer.get(kode) ?? m.Folkemengde ?? {};
    for (const a of aar) if (Number(a) >= fraAar && sayi(kilde[a]) && kilde[a] > 0) serie10[a] = kilde[a];
    const e = (c) => (endringAar ? dolu(m[c]?.[endringAar]) : null);
    const ar = arealPer.get(kode) ?? {};
    const landareal = dolu(ar.LandArealKm2);
    return {
      folkemengde: folk,
      serie10,
      andel: andelAv(kode),
      endring: { aar: endringAar, fodte: e('Levende'), dode: e('Dode'), fodselsoverskudd: e('Fodselsoverskudd'), innflytting: e('Innflyttinger'), utflytting: e('Utflyttinger'), netto: e('Nettoinnflytting'), tilvekst: e('Folketilvekst') },
      areal: dolu(ar.ArealKm2),
      landareal,
      tetthet: folk !== null && landareal ? rund(folk / landareal, 1) : null,
      inntektMedian: inntektPer.get(kode) ?? null,
    };
  };

  const kommuner = kommunekoder
    .map((kode) => {
      const fylke = kode.slice(0, 2);
      if (!FYLKER.some((f) => f.kode === fylke)) throw new Error(`SSB: ukjent fylke ${fylke} for kommune ${kode}`);
      return { kode, navn: String(bef.etiketter.Region[kode] ?? kode).trim(), fylke, ...post(kode) };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));
  // Fylkenin serisi: bugünkü fylke sınırlarında kommune serilerinin toplamı (yeni fylkelerin kendi kodu eski yıllarda boş); yalnız
  // bütün kommunelerin değeri olan yıllar.
  const fylker = Object.fromEntries(
    FYLKER.map((f) => {
      const p = post(f.kode);
      const mine = kommuner.filter((k) => k.fylke === f.kode);
      const serie10 = {};
      for (const a of aar) {
        if (Number(a) < fraAar) continue;
        if (mine.length && mine.every((k) => sayi(k.serie10[a]))) serie10[a] = mine.reduce((t, k) => t + k.serie10[a], 0);
      }
      return [f.kode, { kode: f.kode, navn: f.navn, ...p, serie10 }];
    }),
  );
  return { oppdatert: [bef.oppdatert, alder.oppdatert, areal.oppdatert, innt?.oppdatert].filter(Boolean).sort().at(-1) ?? null, sisteAar, endringAar, inntektAar, kommuner, land: { kode: '0', navn: 'Norge', ...post('0') }, fylker };
}

/**
 * Her kommune için sayfa adresi. Slug ilk adın kısmından ('Oslo - Oslove' → 'oslo'); çakışırsa '-<kode>'.
 * @returns {{ slug: string, kode: string, navn: string, fylke: string }[]} (navne göre sıralı)
 */
export function kommuneSider(data) {
  const grunn = new Map();
  for (const k of data.kommuner) {
    const sl = lagSlug(k.navn.split(/\s+-\s+/)[0]) || k.kode;
    grunn.set(sl, [...(grunn.get(sl) ?? []), k]);
  }
  const ut = [];
  for (const [sl, gruppe] of grunn) for (const k of gruppe) ut.push({ slug: gruppe.length > 1 ? `${sl}-${k.kode}` : sl, kode: k.kode, navn: k.navn, fylke: k.fylke });
  return ut.sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}
