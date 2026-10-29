// /kommune/<kommune>/-sayfalarının veriden türeyen parçaları: sıralamalar, karşılaştırma cümleleri, başlık, açıklama,
// aynı fylkedeki komşular. Saf fonksiyonlar; sabit metinde rakam yok, her sayı src/data/kommuner.json'dan.
// Şablon riski (spec §4): her sayfa kendi sırasını, kendi yönünü (økning/nedgang, over/under) ve kendi en uç sıralamasını
// taşır; paragraflar o kommunede en uç olan ölçüte göre başlar. Değer yargısı yok: yalnız yön sözcükleri ve sıra.

// Yaş grupları (SSB 07459'dan toplanır; scripts/data/ssb-kommune.mjs aldersgruppe ile aynı sınırlar).
export const ALDER = { barnTil: 17, voksneFra: 18, voksneTil: 66, eldreFra: 67 };

const er = (v) => typeof v === 'number' && Number.isFinite(v);
export const tall = (v, d = 0) => v.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
const prosentTekst = (p) => tall(p, Math.abs(p) >= 10 ? 0 : 1);
/** Küçük paylar için: 0,04 → 'mindre enn 0,1'. */
export function andelTekst(p) {
  if (p > 0 && p < 0.1) return 'mindre enn 0,1';
  return tall(p, p < 1 ? 2 : p < 10 ? 1 : 0);
}
const tettTekst = (v) => tall(v, v < 10 ? 1 : 0);
const kroner = (v) => `${tall(v)} kroner`;

/** Yüzde fark ve yön (|p| < 0,5 → 'lik'). */
export function forskjell(a, b) {
  if (!er(a) || !er(b) || b === 0) return null;
  const pst = ((a - b) / b) * 100;
  if (Math.abs(pst) < 0.5) return { pst: 0, retning: 'lik' };
  return { pst: Math.abs(pst), retning: pst > 0 ? 'over' : 'under' };
}

/** Serinin ilk ve son dolu noktası (ya da verilen iki yıl): { fra, til, a, b, abs, pst } ya da null. */
export function utvikling(serie, fra, til) {
  let aar = Object.keys(serie ?? {}).filter((a) => er(serie[a])).sort();
  if (fra && til) aar = aar.filter((a) => a === fra || a === til); // aynı dönem karşılaştırması
  if (aar.length < 2) return null;
  const a = serie[aar[0]];
  const b = serie[aar.at(-1)];
  return { fra: aar[0], til: aar.at(-1), a, b, abs: b - a, pst: a > 0 ? ((b - a) / a) * 100 : null };
}

/** Per 1 000 innbyggere (yılın başındaki folketall). */
export const perTusen = (v, folk) => (er(v) && er(folk) && folk > 0 ? (v / folk) * 1000 : null);

/** Resmî ad olduğu gibi kalır; parantezli adlar 'Våler kommune (Østfold)', diğerleri 'Oslo - Oslove kommune'. */
export function medSuffiks(navn) {
  const m = navn.match(/^(.*?)\s*(\([^)]*\))$/);
  return m ? `${m[1]} kommune ${m[2]}` : `${navn} kommune`;
}

const forsteNavn = (navn) => navn.split(/\s+-\s+/)[0];

/**
 * Her kommune için sıralamalar. 1 = en yüksek değer. Ölçüt başına yalnız değeri dolu kommuneler sayılır (`av`).
 * @returns {Map<string, { land: Record<string, {plass:number, av:number}|undefined>, fylke: { plass:number, av:number } }>}
 */
const rangCache = new WeakMap();
export function kommuneRang(data) {
  if (rangCache.has(data)) return rangCache.get(data);
  const ut = new Map(data.kommuner.map((k) => [k.kode, { land: {}, fylke: { plass: 1, av: 1 } }]));
  // Prosentvis utvikling sıralanır yalnız bütün kommuneler için ortak dönemde (serisi kısa kalanlar sıralamaya girmez).
  const hela = utvikling(data.land?.serie10);
  const verdier = {
    folkemengde: (k) => k.folkemengde,
    vekst: (k) => (hela ? utvikling(k.serie10, hela.fra, hela.til)?.pst ?? null : null),
    eldre: (k) => k.andel?.eldre ?? null,
    barn: (k) => k.andel?.barn ?? null,
    tetthet: (k) => k.tetthet,
    areal: (k) => k.areal,
    inntekt: (k) => k.inntektMedian,
  };
  for (const [navn, fn] of Object.entries(verdier)) {
    const liste = data.kommuner.filter((k) => er(fn(k)));
    for (const k of liste) ut.get(k.kode).land[navn] = { plass: 1 + liste.filter((x) => fn(x) > fn(k)).length, av: liste.length };
  }
  const perFylke = new Map();
  for (const k of data.kommuner) perFylke.set(k.fylke, [...(perFylke.get(k.fylke) ?? []), k]);
  for (const liste of perFylke.values()) {
    for (const k of liste) ut.get(k.kode).fylke = { plass: 1 + liste.filter((x) => (x.folkemengde ?? 0) > (k.folkemengde ?? 0)).length, av: liste.length };
  }
  rangCache.set(data, ut);
  return ut;
}

/**
 * Ölçüt adı ve rank: en uç (orta sıradan en uzak) iki ölçüt.
 * @returns {{ navn: string, plass: number, av: number }[]}
 */
export function mestUvanlig(rangLand, fra, antall = 2) {
  const maal = [
    ['folketall', rangLand.folkemengde],
    [`befolkningsutvikling siden ${fra}`, rangLand.vekst],
    ['andel eldre', rangLand.eldre],
    ['andel barn og unge', rangLand.barn],
    ['befolkningstetthet', rangLand.tetthet],
    ['areal', rangLand.areal],
    ['husholdningsinntekt', rangLand.inntekt],
  ].filter(([, r]) => r && r.av > 1);
  const avstand = ([, r]) => Math.abs((r.av + 1) / 2 - r.plass) / r.av;
  return maal
    .sort((x, y) => avstand(y) - avstand(x) || x[1].plass - y[1].plass)
    .slice(0, antall)
    .map(([navn, r]) => ({ navn, plass: r.plass, av: r.av }));
}

/**
 * Veriden paragraflar (her eleman bir paragraf). `k`: sayfanın kommunesi, `fylke`/`land`: toplam kayıtlar,
 * `rangFylke`: { plass, av }, `rangLand`: kommuneRang(...).land. `aar`: folketall yılı, `inntektAar`: inntekt yılı.
 */
export function kommuneSetninger(k, fylke, land, rangFylke, rangLand, aar, inntektAar) {
  const n = k.navn;
  const ut = [];
  const u = utvikling(k.serie10);
  const ul = u ? utvikling(land.serie10, u.fra, u.til) : null;
  const uf = u ? utvikling(fylke?.serie10, u.fra, u.til) : null;
  const medFylke = rangFylke && rangFylke.av > 1 && fylke;

  // 0) Mest uvanlige ölçütler (sayfayı diğerlerinden ayıran).
  const uvanlig = mestUvanlig(rangLand, u?.fra);
  if (uvanlig.length >= 2) {
    const biter = uvanlig.map((x) => `${x.navn} (plass nummer ${x.plass} av ${x.av})`);
    ut.push(`På ${biter.join(' og ')} ligger ${n} lengst fra midten av kommunene.`);
  }

  // 1) Folketall og sıra.
  if (er(k.folkemengde)) {
    const r = rangLand.folkemengde;
    let s = r
      ? r.plass === 1
        ? `${n} er landets største kommune etter folketall, med ${tall(k.folkemengde)} innbyggere 1. januar ${aar}.`
        : r.plass === r.av
          ? `${n} er landets minste kommune etter folketall, med ${tall(k.folkemengde)} innbyggere 1. januar ${aar}.`
          : `${n} hadde ${tall(k.folkemengde)} innbyggere 1. januar ${aar}. Det gir plass nummer ${r.plass} av ${r.av} kommuner etter folketall.`
      : `${n} hadde ${tall(k.folkemengde)} innbyggere 1. januar ${aar}.`;
    if (er(land.folkemengde) && land.folkemengde > 0) s += ` Kommunen har ${andelTekst((k.folkemengde / land.folkemengde) * 100)} prosent av landets befolkning.`;
    ut.push(s);
    if (medFylke && er(fylke.folkemengde) && fylke.folkemengde > 0) {
      const fp = rangFylke.plass === 1 ? 'den største kommunen' : rangFylke.plass === rangFylke.av ? 'den minste kommunen' : `nummer ${rangFylke.plass} av ${rangFylke.av} kommuner`;
      ut.push(`I ${fylke.navn} er ${n} ${fp} etter folketall, og har ${andelTekst((k.folkemengde / fylke.folkemengde) * 100)} prosent av innbyggerne i fylket.`);
    }
  }

  // 2) Utvikling siden første år i serien.
  if (u) {
    const sammenlign = [];
    if (uf && medFylke && uf.fra === u.fra && uf.pst !== null) sammenlign.push(`i ${fylke.navn} ${endringTekst(uf.pst)}`);
    if (ul && ul.fra === u.fra && ul.pst !== null) sammenlign.push(`i hele landet ${endringTekst(ul.pst)}`);
    let s;
    if (u.abs === 0) s = `Folketallet var det samme i ${u.fra} og ${u.til}: ${tall(u.a)} innbyggere.`;
    else if (u.pst !== null && Math.abs(u.pst) < 0.5) s = `Folketallet er omtrent uendret fra ${tall(u.a)} i ${u.fra} til ${tall(u.b)} i ${u.til}.`;
    else
      s = `Folketallet har gått ${u.abs > 0 ? 'opp' : 'ned'} fra ${tall(u.a)} i ${u.fra} til ${tall(u.b)} i ${u.til}, ${u.abs > 0 ? 'en økning' : 'en nedgang'} på ${tall(Math.abs(u.abs))} personer${u.pst === null ? '' : ` (${prosentTekst(Math.abs(u.pst))} prosent)`}.`;
    if (sammenlign.length) s += ` I samme periode var utviklingen ${sammenlign.join(', ')}.`;
    const r = rangLand.vekst;
    if (r && u.pst !== null && Math.abs(u.pst) >= 0.5) {
      s += u.pst > 0 ? ` Etter prosentvis vekst er det plass nummer ${r.plass} av ${r.av} kommuner.` : ` Etter prosentvis endring er det plass nummer ${r.plass} av ${r.av} kommuner, regnet fra den høyeste veksten.`;
    }
    ut.push(s);
  }

  // 3) Alder.
  if (k.andel && land.andel) {
    const e = forskjell(k.andel.eldre, land.andel.eldre);
    const re = rangLand.eldre;
    let s = `${tall(k.andel.eldre, 1)} prosent av innbyggerne er ${ALDER.eldreFra} år eller eldre, mot ${tall(land.andel.eldre, 1)} prosent i hele landet.`;
    if (e) s += e.retning === 'lik' ? ' Andelen ligger omtrent på landsnivå.' : ` Andelen ligger ${prosentTekst(e.pst)} prosent ${e.retning} landsandelen.`;
    if (medFylke && fylke.andel) s += ` I ${fylke.navn} er andelen ${tall(fylke.andel.eldre, 1)} prosent.`;
    if (re) s += ` Etter andel eldre er det plass nummer ${re.plass} av ${re.av} kommuner.`;
    ut.push(s);
    const b = forskjell(k.andel.barn, land.andel.barn);
    let t = `Barn og unge fra 0 til ${ALDER.barnTil} år utgjør ${tall(k.andel.barn, 1)} prosent, mot ${tall(land.andel.barn, 1)} prosent i landet.`;
    if (b) t += b.retning === 'lik' ? ' Det er omtrent samme andel som i landet.' : ` Andelen er ${prosentTekst(b.pst)} prosent ${b.retning} landsandelen.`;
    t += ` Aldersgruppen fra ${ALDER.voksneFra} til ${ALDER.voksneTil} år utgjør ${tall(k.andel.voksne, 1)} prosent.`;
    ut.push(t);
  }

  // 4) Fødsler, dødsfall og flytting i siste hele år.
  const e = k.endring;
  if (e && e.aar) {
    const folkStart = k.serie10?.[e.aar];
    const deler = [];
    if (er(e.fodte) && er(e.dode)) {
      const diff = e.fodte - e.dode;
      deler.push(
        `I ${e.aar} ble det født ${tall(e.fodte)} og døde ${tall(e.dode)} personer i kommunen. ${diff === 0 ? 'Fødsler og dødsfall utliknet hverandre.' : diff > 0 ? `Det ble født ${tall(diff)} flere enn det døde.` : `Det døde ${tall(-diff)} flere enn det ble født.`}`,
      );
    }
    const netto = er(e.netto) ? e.netto : er(e.innflytting) && er(e.utflytting) ? e.innflytting - e.utflytting : null;
    if (er(e.innflytting) && er(e.utflytting) && netto !== null) {
      let f = `${tall(e.innflytting)} flyttet inn og ${tall(e.utflytting)} flyttet ut, ${netto === 0 ? 'så innflyttingen og utflyttingen var like store' : netto > 0 ? `en netto innflytting på ${tall(netto)} personer` : `en netto utflytting på ${tall(-netto)} personer`}.`;
      const pk = perTusen(netto, folkStart);
      const pl = perTusen(land.endring?.netto, land.serie10?.[e.aar]);
      if (pk !== null && pl !== null && netto !== 0) f += ` Per 1 000 innbyggere tilsvarer det en netto ${netto > 0 ? 'innflytting' : 'utflytting'} på ${tall(Math.abs(pk), 1)}, mot en netto ${pl >= 0 ? 'innflytting' : 'utflytting'} på ${tall(Math.abs(pl), 1)} i landet.`;
      deler.push(f);
    } else if (er(netto)) {
      deler.push(`Netto flytting var ${tall(netto)} personer i ${e.aar}.`);
    }
    if (deler.length) ut.push(deler.join(' '));
  }

  // 5) Areal og tetthet.
  if (er(k.areal) && er(k.tetthet)) {
    const d = forskjell(k.tetthet, land.tetthet);
    const ra = rangLand.areal;
    const rt = rangLand.tetthet;
    let s = `Kommunen har et areal på ${tall(k.areal)} kvadratkilometer, og det bor ${tettTekst(k.tetthet)} personer per kvadratkilometer landareal.`;
    if (er(land.tetthet)) {
      const ratio = k.tetthet / land.tetthet;
      s += ` For hele landet er tettheten ${tettTekst(land.tetthet)}`;
      s += ratio >= 2 ? `, så tettheten i kommunen er ${tall(ratio, ratio < 10 ? 1 : 0)} ganger så høy som landstallet.` : d && d.retning !== 'lik' ? `, så tettheten i kommunen er ${prosentTekst(d.pst)} prosent ${d.retning} landstallet.` : '.';
    }
    if (medFylke && er(fylke.tetthet)) s += ` I ${fylke.navn} er tettheten ${tettTekst(fylke.tetthet)}.`;
    if (ra && rt) s += ` Kommunen har plass nummer ${ra.plass} av ${ra.av} etter areal og plass nummer ${rt.plass} av ${rt.av} etter befolkningstetthet.`;
    ut.push(s);
  }

  // 6) Inntekt.
  if (er(k.inntektMedian) && er(land.inntektMedian)) {
    const d = forskjell(k.inntektMedian, land.inntektMedian);
    let s = `Median husholdningsinntekt etter skatt var ${kroner(k.inntektMedian)} i ${inntektAar}${d && d.retning !== 'lik' ? `, ${prosentTekst(d.pst)} prosent ${d.retning} medianen for landet på ${kroner(land.inntektMedian)}` : `, omtrent som medianen for landet på ${kroner(land.inntektMedian)}`}.`;
    if (medFylke && er(fylke.inntektMedian)) s += ` I ${fylke.navn} var medianen ${kroner(fylke.inntektMedian)}.`;
    const ri = rangLand.inntekt;
    if (ri) s += ` Det gir plass nummer ${ri.plass} av ${ri.av} kommuner.`;
    ut.push(s);
  }
  return ut;
}

/** '+12 prosent' dili ifade: 'økte med 12 prosent' / 'gikk ned med 3,1 prosent'. */
function endringTekst(pst) {
  if (Math.abs(pst) < 0.5) return 'omtrent uendret';
  return pst > 0 ? `en økning på ${prosentTekst(pst)} prosent` : `en nedgang på ${prosentTekst(-pst)} prosent`;
}

/** Plass-tablosu satırları: { navn, verdi, plass, av }. Boş ölçütler yok. */
export function rangRader(k, rangLand, fra) {
  const u = utvikling(k.serie10);
  const rader = [
    ['Folketall', er(k.folkemengde) ? tall(k.folkemengde) : null, rangLand.folkemengde],
    [`Prosentvis endring siden ${fra ?? ''}`.trim(), u && u.pst !== null ? `${u.pst > 0 ? '+' : u.pst < 0 ? '−' : ''}${tall(Math.abs(u.pst), 1)} %` : null, rangLand.vekst],
    ['Andel 67 år og eldre', k.andel ? `${tall(k.andel.eldre, 1)} %` : null, rangLand.eldre],
    ['Andel 0 til 17 år', k.andel ? `${tall(k.andel.barn, 1)} %` : null, rangLand.barn],
    ['Innbyggere per km² landareal', er(k.tetthet) ? tettTekst(k.tetthet) : null, rangLand.tetthet],
    ['Areal i km²', er(k.areal) ? tall(k.areal) : null, rangLand.areal],
    ['Median husholdningsinntekt etter skatt', er(k.inntektMedian) ? `${tall(k.inntektMedian)} kr` : null, rangLand.inntekt],
  ];
  return rader.filter(([, v, r]) => v !== null && r).map(([navn, verdi, r]) => ({ navn, verdi, plass: r.plass, av: r.av }));
}

/** <title> (Base " | tidsrøst" ekler; sonuç ≤ 49 karakter, toplam ≤ 60). Çift adlarda ilk ad yedek. */
export function kommuneTittel(navn, maks = 49) {
  const adaylar = [];
  for (const n of [navn, forsteNavn(navn)]) {
    adaylar.push(`${medSuffiks(n)}: folketall og nøkkeltall`, `${medSuffiks(n)}: folketall`, `${n}: folketall og nøkkeltall`, `${n}: folketall`, medSuffiks(n), n);
  }
  return adaylar.find((t) => t.length <= maks) ?? forsteNavn(navn).slice(0, maks);
}

/** Meta description: veriden, 120–160 karakter; hiçbiri uymazsa null (derleme hata verir). */
export function kommuneBeskrivelse(k, aar, rangLand, fra) {
  if (!er(k.folkemengde)) return null;
  const u = utvikling(k.serie10);
  const r = rangLand.folkemengde;
  const plass = r ? `, plass ${r.plass} av ${r.av} etter folketall` : '';
  const utv = u && u.pst !== null && Math.abs(u.pst) >= 0.5 ? ` Folketallet har gått ${u.pst > 0 ? 'opp' : 'ned'} ${prosentTekst(Math.abs(u.pst))} prosent siden ${fra ?? u.fra}.` : '';
  const ekstra = [
    ' Se alder, flytting, areal og inntekt. Tall fra SSB.',
    ' Se også alder, flytting og inntekt.',
    ' Tall for alder, flytting og inntekt fra SSB.',
    ' Tall fra SSB.',
    ' Se utvikling, alder, flytting og inntekt.',
    '',
  ];
  for (const n of [medSuffiks(k.navn), medSuffiks(forsteNavn(k.navn)), k.navn]) {
    for (const [pl, ut2] of [[plass, utv], [plass, ''], ['', utv], ['', '']]) {
      for (const e of ekstra) {
        const t = `${n} hadde ${tall(k.folkemengde)} innbyggere 1. januar ${aar}${pl}.${ut2}${e}`;
        if (t.length >= 120 && t.length <= 160) return t;
      }
    }
  }
  return null;
}

/**
 * Aynı fylkedeki komşular: folketall sırasında kommunenin üstündeki ve altındaki `yan` kommune (kenarlarda pencere kayar,
 * mümkünse 2×yan döner). Sıra: büyükten küçüğe.
 * @returns {{ slug: string, navn: string, folkemengde: number|null }[]}
 */
export function naboer(data, sider, kode, yan = 3) {
  const slug = new Map(sider.map((s) => [s.kode, s.slug]));
  const me = data.kommuner.find((x) => x.kode === kode);
  if (!me) return [];
  const liste = data.kommuner.filter((x) => x.fylke === me.fylke).sort((a, b) => (b.folkemengde ?? 0) - (a.folkemengde ?? 0) || a.kode.localeCompare(b.kode));
  const i = liste.findIndex((x) => x.kode === kode);
  const vindu = Math.min(2 * yan, liste.length - 1);
  let fra = Math.max(0, i - yan);
  const til = Math.min(liste.length, fra + vindu + 1);
  fra = Math.max(0, til - vindu - 1);
  return liste.slice(fra, til).filter((x) => x.kode !== kode).map((x) => ({ slug: slug.get(x.kode), navn: x.navn, folkemengde: x.folkemengde }));
}
