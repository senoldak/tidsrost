// Norveç'in 15 fylkesi (1 Ocak 2024 yapısı) ve eski fylke numaralarının bugünkü fylkelere eşlemesi.
// MET'in uyarı arşivi 2019'dan beri tutuluyor; eski kayıtlar 2020 öncesi ve 2020–2023 numaralarını taşır.
// Bölünen eski fylkenin (Viken, Vestfold og Telemark, Troms og Finnmark) uyarısı ondan çıkan bütün fylkelere sayılır.
// Hem veri betikleri (scripts/data) hem sayfalar kullanır.

export const FYLKER = [
  { kode: '03', navn: 'Oslo' },
  { kode: '11', navn: 'Rogaland' },
  { kode: '15', navn: 'Møre og Romsdal' },
  { kode: '18', navn: 'Nordland' },
  { kode: '31', navn: 'Østfold' },
  { kode: '32', navn: 'Akershus' },
  { kode: '33', navn: 'Buskerud' },
  { kode: '34', navn: 'Innlandet' },
  { kode: '39', navn: 'Vestfold' },
  { kode: '40', navn: 'Telemark' },
  { kode: '42', navn: 'Agder' },
  { kode: '46', navn: 'Vestland' },
  { kode: '50', navn: 'Trøndelag' },
  { kode: '55', navn: 'Troms' },
  { kode: '56', navn: 'Finnmark' },
];

const GYLDIGE = new Set(FYLKER.map((f) => f.kode));

// Eski numara → bugünkü fylke(ler).
const GAMLE = {
  '01': ['31'], '02': ['32'], '04': ['34'], '05': ['34'], '06': ['33'], '07': ['39'], '08': ['40'],
  '09': ['42'], '10': ['42'], '12': ['46'], '14': ['46'], '16': ['50'], '17': ['50'], '19': ['55'], '20': ['56'],
  '30': ['31', '32', '33'], '38': ['39', '40'], '54': ['55', '56'],
};

/** Uyarının fylke kodlarını bugünkü 15 fylkeye çevirir; bilinmeyen kod (ör. 21 Svalbard) atlanır. Tekrarsız, sıralı. */
export function fylkerFraKoder(koder) {
  const ut = new Set();
  for (const k of Array.isArray(koder) ? koder : []) {
    const kode = String(k).padStart(2, '0');
    if (GYLDIGE.has(kode)) ut.add(kode);
    else for (const ny of GAMLE[kode] ?? []) ut.add(ny);
  }
  return [...ut].sort();
}

export const fylkeNavn = (kode) => FYLKER.find((f) => f.kode === kode)?.navn ?? kode;
