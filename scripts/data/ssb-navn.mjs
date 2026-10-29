// Navnestatistikk (/navn/): SSB 10501 (jente-/guttenavn, personer 2013–), 10467 (fødte etter navn 1880–) ve
// 12891 (etternavn, 200+ personer) → sayfa verisi. Saf dönüştürücü; ağ işi hent-data.mjs'te.
// SSB'nin bastırdığı hücre (null) olduğu gibi kalır; tahmin edilmez. Yalnız toplam sayılar (kişisel veri yok).
import { lesJsonStat2 } from './ssb.mjs';
import { lagSlug } from '../../src/lib/slug.mjs';

/** SSB etiketi: tamamı büyük harfse 'ANNE-MARIE' → 'Anne-Marie'; aksi halde etiket olduğu gibi kalır. */
export function navnVisning(etikett) {
  const e = String(etikett).trim();
  if (e !== e.toUpperCase() || e === e.toLowerCase()) return e;
  return e.toLowerCase().replace(/(^|[-\s])(\p{L})/gu, (_, f, b) => f + b.toUpperCase());
}

/** '1ADA' → 'J', '2AARON' → 'G'; başka kod → null. */
export const kjonnFraKode = (kode) => (kode[0] === '1' ? 'J' : kode[0] === '2' ? 'G' : null);

const sayi = (v) => typeof v === 'number' && Number.isFinite(v);

// Bir tablodan { kode → { etikett, deger: Record<tid, sayı> } }; yalnız dolu hücreler.
function iTabell(json, dim, contents) {
  const { oppdatert, rader, etiketter } = lesJsonStat2(json);
  const ut = new Map();
  for (const r of rader) {
    if (contents && r.ContentsCode !== contents) continue;
    const kode = r[dim];
    if (!ut.has(kode)) ut.set(kode, { etikett: etiketter[dim]?.[kode] ?? kode, deger: {} });
    if (sayi(r.verdi)) ut.get(kode).deger[r.Tid] = r.verdi;
  }
  return { oppdatert, ut };
}

/**
 * @returns {{ oppdatert: string|null, sisteAar: string, fornavn: { navn: string, kjonn: 'J'|'G', antall: number|null,
 *   serie: Record<string, number>, fodte: Record<string, number> }[], etternavn: { navn: string, antall: number }[] }}
 */
export function navnData(personer10501, fodte10467, etternavn12891) {
  const p = iTabell(personer10501, 'Fornavn', 'Personer');
  const f = iTabell(fodte10467, 'Fornavn', 'Personer');
  const e = iTabell(etternavn12891, 'Etternavn', 'Personer');
  const aar = [...new Set(Object.values(Object.fromEntries([...p.ut].map(([k, v]) => [k, Object.keys(v.deger)]))).flat())].sort();
  const sisteAar = aar.at(-1);
  if (!sisteAar) throw new Error('SSB 10501: ingen tall for fornavn');
  const koder = new Set([...p.ut.keys(), ...f.ut.keys()]);
  const fornavn = [];
  for (const kode of koder) {
    const kjonn = kjonnFraKode(kode);
    if (!kjonn) continue;
    const serie = p.ut.get(kode)?.deger ?? {};
    fornavn.push({
      navn: navnVisning(p.ut.get(kode)?.etikett ?? f.ut.get(kode).etikett),
      kjonn,
      antall: serie[sisteAar] ?? null,
      serie,
      fodte: f.ut.get(kode)?.deger ?? {},
    });
  }
  const etternavn = [...e.ut.values()]
    .map((v) => ({ navn: navnVisning(v.etikett), antall: Object.values(v.deger).at(-1) ?? null }))
    .filter((v) => v.antall !== null)
    .sort((a, b) => b.antall - a.antall || a.navn.localeCompare(b.navn, 'nb'));
  if (!fornavn.length || !etternavn.length) throw new Error('SSB 10501/12891: tomt navnedatasett');
  return { oppdatert: p.oppdatert ?? f.oppdatert, sisteAar, fornavn, etternavn };
}

/** Son yıl sıralaması: cinsin içinde antall'a göre (1 = en çok taşınan); antall yoksa null. */
export function rangeringer(data, kjonn) {
  const sortert = data.fornavn.filter((n) => n.kjonn === kjonn && n.antall !== null).sort((a, b) => b.antall - a.antall || a.navn.localeCompare(b.navn, 'nb'));
  return new Map(sortert.map((n, i) => [n, i + 1]));
}

/**
 * Kendi sayfası olan adlar: son yıl antall'a göre her cinsten ilk `topp`, yalnız doğum serisinde en az `minAar` yıl
 * dolu olanlar. İki cinste aynı ad ya da aynı slug → '-jente' / '-gutt' eki (yalnız çakışmada).
 * @returns {{ slug: string, navn: string, kjonn: 'J'|'G' }[]} (navne göre sıralı)
 */
export function navnSider(data, { topp = 150, minAar = 20 } = {}) {
  const valgt = [];
  for (const k of ['J', 'G']) {
    const liste = data.fornavn
      .filter((n) => n.kjonn === k && n.antall !== null && Object.keys(n.fodte ?? {}).length >= minAar)
      .sort((a, b) => b.antall - a.antall || a.navn.localeCompare(b.navn, 'nb'))
      .slice(0, topp);
    valgt.push(...liste);
  }
  const grunn = new Map();
  for (const n of valgt) {
    const s = lagSlug(n.navn);
    grunn.set(s, [...(grunn.get(s) ?? []), n]);
  }
  const ut = [];
  for (const [s, gruppe] of grunn) {
    gruppe.forEach((n, i) => {
      const suffiks = gruppe.length > 1 ? `-${n.kjonn === 'J' ? 'jente' : 'gutt'}` : '';
      // Aynı cinste de çakışırsa (ör. 'Åse' / 'Ase') sıra numarası.
      const dup = gruppe.slice(0, i).filter((m) => m.kjonn === n.kjonn).length;
      ut.push({ slug: `${s}${suffiks}${dup ? `-${dup + 1}` : ''}`, navn: n.navn, kjonn: n.kjonn });
    });
  }
  return ut.sort((a, b) => a.navn.localeCompare(b.navn, 'nb') || a.kjonn.localeCompare(b.kjonn));
}

/**
 * Dosya boyutu için: tam doğum serisi ve yıllık seri yalnız kendi sayfası olan adlarda kalır; diğerlerinde yalnız son
 * yılın doğum sayısı (hub'ın "bebek adları" sıralaması için) ve antall. navnSider(komprimer(d)) === navnSider(d).
 */
export function komprimer(data) {
  const sider = navnSider(data);
  const sidenavn = new Set(sider.map((s) => `${s.kjonn}${s.navn}`));
  const sisteFodt = data.fornavn.flatMap((n) => Object.keys(n.fodte)).sort().at(-1);
  return {
    ...data,
    fornavn: data.fornavn
      .filter((n) => n.antall !== null || sidenavn.has(`${n.kjonn}${n.navn}`) || n.fodte[sisteFodt] !== undefined)
      .map((n) =>
        sidenavn.has(`${n.kjonn}${n.navn}`)
          ? n
          : { navn: n.navn, kjonn: n.kjonn, antall: n.antall, serie: {}, fodte: n.fodte[sisteFodt] !== undefined ? { [sisteFodt]: n.fodte[sisteFodt] } : {} },
      ),
  };
}
