// Kaynak: mecmua/site-ortak/lib/src/lib/anlam.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// İlgili haberler için anlam benzerliği (Gemini Faz 2, 27 Ekim 2026). Bot her turda yayımlanan haberlerin
// vektörlerini src/data/vektorler.jsonl'a yazar (scripts/.../vektorler.mjs); derleme bu dosyayı okur. Dosya yoksa ya da
// haberin vektörü yoksa benzerlik null: ilgili kutusu bugünkü ad/kategori puanıyla seçilir.
// coz ve benzerlik bot tarafındaki gomme.mjs ile aynıdır (derleme bot klasörünü içe aktarmaz); biri değişirse ikisi.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const onbellek = new Map(); // kök → harita (derleme süreci boyunca bir kez okunur)

const coz = (s) => {
  const b = Buffer.from(s, 'base64');
  return new Int8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

function benzerlik(a, b) {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}

/** Haber kimliği → vektör. Dosya yoksa boş; bozuk satır atlanır. */
export function vektorleriOku(kok = process.cwd()) {
  if (onbellek.has(kok)) return onbellek.get(kok);
  const harita = new Map();
  let metin = '';
  try {
    metin = readFileSync(path.join(kok, 'src/data/vektorler.jsonl'), 'utf8');
  } catch {
    // dosya yok
  }
  for (const satir of metin.split('\n')) {
    if (!satir.trim()) continue;
    try {
      const j = JSON.parse(satir);
      if (typeof j?.id === 'string' && typeof j.v === 'string') harita.set(j.id, coz(j.v));
    } catch {
      // bozuk satır
    }
  }
  onbellek.set(kok, harita);
  return harita;
}

/** İki haberin anlam benzerliği ([-1, 1]); birinin vektörü yoksa null. */
export function anlamBenzerligi(harita, idA, idB) {
  const a = harita.get(idA);
  const b = harita.get(idB);
  return a && b ? benzerlik(a, b) : null;
}

// İlgili haberler puanına eklenen anlam payı (Faz 2, 27 Ekim; ölçümden sonra ayarlanabilir): benzerlik ANLAM_ALT'ın
// altındaysa 0, üstünde 0 ile ANLAM_AGIRLIK arasında doğrusal. Vektör yoksa (null) 0: bugünkü sıra değişmez.
export const ANLAM_ALT = 0.55;
export const ANLAM_AGIRLIK = 4;
export const anlamPuani = (b) => (b === null || b === undefined || b <= ANLAM_ALT ? 0 : (ANLAM_AGIRLIK * (b - ANLAM_ALT)) / (1 - ANLAM_ALT));
