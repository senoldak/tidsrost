// SSB (Statistisk sentralbyrå) PxWebApi v2 okuyucusu: istek adresi ve JSON-stat2 yanıtının düz satırlara çevrilmesi.
// Ağ işi hent-data.mjs'te; burası saf ve test edilebilir (ssb.test.mjs). Değer tahmin edilmez: SSB'nin bastırdığı
// hücre (".." / ":") JSON-stat2'de null gelir ve null olarak kalır.

export const SSB_KILDE = {
  navn: 'Statistisk sentralbyrå (SSB)',
  url: 'https://www.ssb.no/',
  data: 'https://data.ssb.no/api/pxwebapi/v2/',
  lisens: 'NLOD',
  lisensUrl: 'https://data.norge.no/nlod/no/2.0',
};

/**
 * PxWebApi v2 veri adresi. Köşeli parantezler kodlanmaz (SSB'nin belgelediği biçim); değerler virgülle birleşir.
 * @param {string} tabell SSB tablo numarası, ör. '13760'
 * @param {Record<string, string | string[]>} valg boyut kodu → değer(ler), ör. { Tid: 'top(3)' }
 */
export function ssbUrl(tabell, valg = {}) {
  const deler = ['lang=no', 'outputFormat=json-stat2'];
  for (const [dim, v] of Object.entries(valg)) {
    const verdier = (Array.isArray(v) ? v : [v]).map((x) => encodeURIComponent(String(x)).replace(/%28/g, '(').replace(/%29/g, ')'));
    deler.push(`valueCodes[${dim}]=${verdier.join(',')}`);
  }
  return `https://data.ssb.no/api/pxwebapi/v2/tables/${tabell}/data?${deler.join('&')}`;
}

/**
 * JSON-stat2 veri kümesini düz satırlara çevirir: her satırda her boyutun kodu ve `verdi` (sayı ya da null).
 * Satır sırası JSON-stat kuralıdır: son boyut en hızlı değişir.
 * @returns {{ oppdatert: string, rader: Array<Record<string, string> & { verdi: number | null }>, etiketter: Record<string, Record<string, string>> }}
 */
export function lesJsonStat2(json) {
  if (!json || json.class !== 'dataset' || !Array.isArray(json.value) || !Array.isArray(json.id) || !Array.isArray(json.size)) {
    throw new Error('Uventet svar fra SSB (ikke et JSON-stat2-datasett)');
  }
  const koder = json.id.map((dim) => {
    const index = json.dimension?.[dim]?.category?.index ?? {};
    const liste = Array.isArray(index) ? index : Object.entries(index).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    return liste;
  });
  const antall = json.size.reduce((a, b) => a * b, 1);
  if (antall !== json.value.length) throw new Error('Uventet svar fra SSB (størrelse og antall verdier stemmer ikke)');
  const rader = [];
  for (let i = 0; i < antall; i++) {
    const rad = {};
    let rest = i;
    for (let d = json.id.length - 1; d >= 0; d--) {
      rad[json.id[d]] = koder[d][rest % json.size[d]];
      rest = Math.floor(rest / json.size[d]);
    }
    const v = json.value[i];
    const ordnet = {};
    for (const dim of json.id) ordnet[dim] = rad[dim];
    ordnet.verdi = typeof v === 'number' && Number.isFinite(v) ? v : null;
    rader.push(ordnet);
  }
  const etiketter = Object.fromEntries(json.id.map((dim) => [dim, { ...(json.dimension?.[dim]?.category?.label ?? {}) }]));
  return { oppdatert: json.updated ?? null, rader, etiketter };
}
