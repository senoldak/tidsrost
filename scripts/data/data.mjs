// Sürekli güncel veri sayfaları (/styringsrenten/, /farevarsler/) için saf ayrıştırma yardımcıları.
// Ağ işi hent-data.mjs'te; burası test edilebilir (data.test.mjs). Hiçbir değer tahmin edilmez ya da uydurulmaz:
// beklenen alan yoksa hata fırlatılır ve çağıran eski dosyayı olduğu gibi bırakır.

export const RENTE_KILDE = {
  navn: 'Norges Bank',
  url: 'https://www.norges-bank.no/tema/pengepolitikk/Styringsrenten/',
  data: 'https://data.norges-bank.no/',
  lisens: 'NLOD',
};

export const VARSEL_KILDE = {
  navn: 'Meteorologisk institutt (MET Norway)',
  url: 'https://www.met.no/',
  data: 'https://api.met.no/weatherapi/metalerts/2.0/documentation',
  lisens: 'CC BY 4.0',
  lisensUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

// Norges Bank SDMX CSV (format=csv&locale=en): noktalı virgülle ayrılmış, başlık satırı TIME_PERIOD ve OBS_VALUE içerir.
export function lesSdmxCsv(tekst) {
  const [hode, ...rader] = String(tekst ?? '').trim().split(/\r?\n/);
  const kol = (hode ?? '').split(';');
  const iDato = kol.indexOf('TIME_PERIOD');
  const iVerdi = kol.indexOf('OBS_VALUE');
  if (iDato < 0 || iVerdi < 0) throw new Error('Uventet CSV-format fra Norges Bank (mangler TIME_PERIOD/OBS_VALUE)');
  return rader
    .map((r) => r.split(';'))
    .map((c) => ({ dato: c[iDato], verdi: Number(c[iVerdi]) }))
    .filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.dato) && rimelig(o.verdi))
    .sort((a, b) => a.dato.localeCompare(b.dato));
}
// Politika faizi için makul aralık; dışındaki değer bozuk veri sayılır.
const rimelig = (n) => Number.isFinite(n) && n > -10 && n < 50;

/**
 * Günlük politika faizi serisinden: bugünkü düzey, o düzeyin başladığı ilk gün ve son değişiklikler.
 * @param {{dato: string, verdi: number}[]} serie eskiden yeniye sıralı
 */
export function styringsrente(serie, maksEndringer = 10) {
  if (!serie.length) throw new Error('Ingen observasjoner av styringsrenten');
  const endringer = [];
  for (let i = 1; i < serie.length; i++) {
    if (serie[i].verdi !== serie[i - 1].verdi) endringer.push({ fra: serie[i].dato, rente: serie[i].verdi, forrige: serie[i - 1].verdi });
  }
  const siste = serie.at(-1);
  return {
    rente: siste.verdi,
    sisteObservasjon: siste.dato,
    // Serinin başından beri değişmediyse başlangıç tarihi bilinmez (null); sayfa bunu "før <dato>" diye gösterir.
    gjeldendeFra: endringer.at(-1)?.fra ?? null,
    serieFra: serie[0].dato,
    endringer: endringer.slice(-maksEndringer).reverse(),
    // Grafik için bütün pencere: serinin ilk günü + her değişiklik, eskiden yeniye.
    trinn: [{ fra: serie[0].dato, rente: serie[0].verdi }, ...endringer.map((e) => ({ fra: e.fra, rente: e.rente }))],
  };
}

const NIVA = { yellow: 'gult', orange: 'oransje', red: 'rodt' };

/** MetAlerts 2.0 current.json → sayfa için sade liste (seviyeye, sonra başlangıca göre sıralı). */
export function farevarsler(json) {
  if (!json || !Array.isArray(json.features)) throw new Error('Uventet svar fra MetAlerts (mangler features)');
  const rang = { rodt: 0, oransje: 1, gult: 2 };
  return json.features
    .map((f) => {
      const p = f.properties ?? {};
      const farge = String(p.awareness_level ?? '').split(';')[1]?.trim();
      const [start, slutt] = f.when?.interval ?? [];
      return {
        id: p.id,
        niva: NIVA[farge],
        hendelse: p.eventAwarenessName,
        omrade: p.area,
        domene: p.geographicDomain === 'marine' ? 'hav' : 'land',
        start: start ?? null,
        slutt: slutt ?? p.eventEndingTime ?? null,
        beskrivelse: (p.description ?? '').trim(),
        konsekvenser: (p.consequences ?? '').trim(),
        rad: (p.instruction ?? '').trim(),
        web: typeof p.web === 'string' && p.web.startsWith('https://www.met.no/') ? p.web : null,
      };
    })
    .filter((v) => v.id && v.niva && v.hendelse && v.omrade)
    .sort((a, b) => rang[a.niva] - rang[b.niva] || String(a.start).localeCompare(String(b.start)) || a.omrade.localeCompare(b.omrade, 'nb'));
}

/** İki veri nesnesi, alma zamanı (hentet) dışında aynı mı? Yayın yalnızca içerik değişince tetiklenir. */
export function sammeInnhold(a, b) {
  const ren = (o) => JSON.stringify({ ...(o ?? {}), hentet: undefined });
  return ren(a) === ren(b);
}

/**
 * Değişiklik siteyi beklemeden yeniden derletmeli mi? Faiz ve turuncu/kırmızı uyarılar hemen yayımlanır; SSB verisi ve
 * uyarı arşivi bir sonraki olağan yayınla çıkar. Yalnız sarı
 * uyarılar değiştiyse yeni veri dosyaya yazılıp commit edilir, siteye bir sonraki gerçek yayınla çıkar (denetim B7).
 */
export function hasterPublisering(fil, gammel, ny) {
  if (sammeInnhold(gammel, ny)) return false;
  if (fil === 'styringsrente.json') return true;
  // SSB-tall og varselarkivet endrer seg sjelden og haster ikke: de kommer ut med neste vanlige publisering.
  if (fil !== 'farevarsler.json') return false;
  const alvorlige = (o) => JSON.stringify((o?.varsler ?? []).filter((v) => v.niva !== 'gult'));
  return alvorlige(gammel) !== alvorlige(ny);
}
