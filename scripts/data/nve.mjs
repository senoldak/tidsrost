// NVE (Norges vassdrags- og energidirektorat, Varsom) varsel API'lerinin saf okuyucuları: snøskredvarsel (bölge bazlı)
// ve flom/jordskred (fylke → kommune). Ağ işi hent-data.mjs'te; burası saf ve test edilebilir (nve.test.mjs).
// NVE'nin uyarı metinleri değiştirilmez, olduğu gibi taşınır. Veri uydurulmaz: uyarı yoksa boş sonuç döner.
import { FYLKER } from '../../src/lib/fylker.mjs';

export const NVE_KILDE = {
  navn: 'Norges vassdrags- og energidirektorat (NVE), Varsom',
  url: 'https://www.varsom.no/',
  data: 'https://api01.nve.no/',
  lisens: 'NLOD',
  lisensUrl: 'https://data.norge.no/nlod/no/2.0',
};

const GYLDIGE_FYLKER = new Set(FYLKER.map((f) => f.kode));
const API = 'https://api01.nve.no/hydrology/forecast';

export const nveSnoskredUrl = (fra, til) => `${API}/avalanche/v6.3.0/api/RegionSummary/Simple/1/${fra}/${til}`;
export const nveFareUrl = (type, fra, til) => {
  if (!(type in { flom: 1, jordskred: 1 })) throw new Error(`Ukjent NVE-type: ${type}`);
  return `${API}/${type === 'flom' ? 'flood' : 'landslide'}/v1.0.10/api/CountySummary/1/${fra}/${til}`;
};

const dato = (iso) => String(iso ?? '').slice(0, 10);

/**
 * RegionSummary/Simple → A-regionlar (B-regionlar listelenmez). Seviye 0 = NVE bu bölgeyi değerlendirmiyor (sezon dışı);
 * metin yalnız seviye ≥1 için taşınır.
 * @returns {{ regioner: { id: number, navn: string, type: 'A', dager: { dato: string, nivaa: number, tekst: string | null }[] }[] }}
 */
export function snoskred(json) {
  if (!Array.isArray(json) || json.some((r) => !r || !Array.isArray(r.AvalancheWarningList))) {
    throw new Error('Uventet svar fra NVE snøskred (mangler AvalancheWarningList)');
  }
  const regioner = json
    .filter((r) => r.TypeName === 'A')
    .map((r) => ({
      id: r.Id,
      navn: r.Name,
      type: 'A',
      dager: r.AvalancheWarningList.map((w) => {
        const nivaa = Number(w.DangerLevel);
        return {
          dato: dato(w.ValidFrom),
          nivaa: Number.isInteger(nivaa) && nivaa >= 0 && nivaa <= 5 ? nivaa : 0,
          tekst: nivaa >= 1 ? String(w.MainText ?? '').trim() || null : null,
        };
      }).sort((a, b) => a.dato.localeCompare(b.dato)),
    }));
  return { regioner };
}

/** Herhangi bir bölge, herhangi bir günde seviye ≥1 mi? Hayırsa sezon dışı. */
export const iSesong = (data) => (data?.regioner ?? []).some((r) => r.dager.some((d) => d.nivaa >= 1));

/** Bir günde seviye ≥1 olan bölgeler, yüksekten alçağa (eşitse ada göre). */
export function dagNivaaer(data, dag) {
  return (data?.regioner ?? [])
    .map((r) => ({ id: r.id, navn: r.navn, ...(r.dager.find((d) => d.dato === dag) ?? { nivaa: 0, tekst: null }) }))
    .filter((r) => r.nivaa >= 1)
    .sort((a, b) => b.nivaa - a.nivaa || a.navn.localeCompare(b.navn, 'nb'));
}

// NVE ana metni bazen yalnız renk adıdır ("Oransje nivå", "Grønt nivå"); o durumda metin yok sayılır.
const FARGENAVN = /^(grønt|gult|oransje|rødt)\s+nivå\.?$/i;

/**
 * CountySummary (flom ya da jordskred) → verilen günün seviye ≥2 uyarıları, fylke bazında.
 * Seviye 1 (grønn) uyarı değildir. Svalbard ve Jan Mayen (fylke listesinde yok) atlanır.
 * Bir uyarı, ValidFrom tarihi o gün olan kayıttır.
 * @param {'flom' | 'jordskred'} type
 * @param {string} dag ÅÅÅÅ-AA-GG (Oslo tarihi)
 * @returns {{ dato: string, fylker: Record<string, { nivaa: number, kommuner: string[], tekst: string | null }> }}
 */
export function fareKommuner(json, type, dag) {
  if (type !== 'flom' && type !== 'jordskred') throw new Error(`Ukjent NVE-type: ${type}`);
  if (!json || !Array.isArray(json.CountyList)) throw new Error('Uventet svar fra NVE (mangler CountyList)');
  const fylker = {};
  for (const c of json.CountyList) {
    const kode = String(c.Id ?? '').padStart(2, '0');
    if (!GYLDIGE_FYLKER.has(kode)) continue;
    let hoyest = 0;
    let tekst = null;
    const kommuner = [];
    for (const k of c.MunicipalityList ?? []) {
      let kommuneNivaa = 0;
      for (const w of k.WarningList ?? []) {
        if (dato(w.ValidFrom) !== dag) continue;
        const n = Number(w.ActivityLevel);
        if (!Number.isInteger(n) || n < 2) continue;
        kommuneNivaa = Math.max(kommuneNivaa, n);
        if (n > hoyest) {
          hoyest = n;
          const t = String(w.WarningText ?? '').trim() || String(w.MainText ?? '').trim();
          tekst = t && !FARGENAVN.test(t) ? t : null;
        }
      }
      if (kommuneNivaa >= 2) kommuner.push(k.Name);
    }
    if (hoyest >= 2) fylker[kode] = { nivaa: hoyest, kommuner: kommuner.sort((a, b) => a.localeCompare(b, 'nb')), tekst };
  }
  return { dato: dag, fylker };
}

/**
 * Siteyi beklemeden yeniden derletmeli mi? Snøskred: bir bölgenin bugünkü seviyesi ≥3 ise ve küme değiştiyse.
 * Flom/jordskred: oransje/rødt (≥3) fylke-kommune kümesi değiştiyse. Gul/grønt değişiklik bir sonraki yayınla çıkar.
 */
export function hasterNve(fil, gammel, ny) {
  if (fil === 'snoskred.json') {
    const alvorlige = (o) => JSON.stringify((o?.regioner ?? []).filter((r) => (r.dager[0]?.nivaa ?? 0) >= 3).map((r) => [r.id, r.dager[0].nivaa]));
    return alvorlige(gammel) !== alvorlige(ny);
  }
  if (fil === 'flom.json') {
    const alvorlige = (o) =>
      JSON.stringify(
        ['flom', 'jordskred'].map((t) =>
          Object.entries(o?.[t] ?? {})
            .filter(([, v]) => v.nivaa >= 3)
            .map(([kode, v]) => [kode, v.nivaa, v.kommuner]),
        ),
      );
    return alvorlige(gammel) !== alvorlige(ny);
  }
  return false;
}
