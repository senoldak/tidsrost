// Kaynak: mecmua/site-ortak/gemini/vektorler.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yayımlanan haberlerin vektör dosyası (Faz 2, 27 Ekim 2026): ilgili haberler kutusu derlemede bunu okur
// (src/lib/anlam.mjs). Biçim: her satırda bir haber {"id","v"}, kimliğe göre sıralı (commit farkı yalnız yeni
// satırlar olsun). id = Astro glob kimliği (haberin klasör ya da dosya adı). Bot her turda en çok `azami` eksik haberi
// ekler; geriye dönük doldurma da böyle, ayrı betik olmadan ilerler (turda 25, günde ≤ 300).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { kodla, vektorle as gommeVektorle } from './gomme.mjs';

const AZAMI_BAYT = 2 * 1024 * 1024;

/** id → base64 vektör. Dosya yoksa boş; bozuk satır atlanır. */
export function vektorDosyasiOku(dosya) {
  const out = new Map();
  let metin = '';
  try {
    metin = readFileSync(dosya, 'utf8');
  } catch {
    return out;
  }
  for (const satir of metin.split('\n')) {
    if (!satir.trim()) continue;
    try {
      const j = JSON.parse(satir);
      if (typeof j?.id === 'string' && typeof j.v === 'string') out.set(j.id, j.v);
    } catch {
      // bozuk satır
    }
  }
  return out;
}

/**
 * haberler: [{ id, metin }] sitenin bütün yayımlanmış haberleri, en yeniden eskiye. Dosyada olmayanlardan en yeni
 * `azami` tanesi vektörlenip eklenir; listede olmayan kimlikler silinir; dosya azamiBayt'ı aşarsa en eskiler atılır.
 * Gömme yoksa dosyaya dokunulmaz.
 */
export async function vektorDosyasiGuncelle({ dosya, haberler, azami = 25, onbellek, amac = 'vektorler/guncelle', vektorle = gommeVektorle, azamiBayt = AZAMI_BAYT }) {
  const eski = vektorDosyasiOku(dosya);
  const eksikler = haberler.filter((h) => !eski.has(h.id));
  const secilen = eksikler.slice(0, azami);
  const yeni = new Map();
  if (secilen.length) {
    const v = await vektorle(secilen.map((h) => h.metin), { onbellek, amac });
    if (!v) return { eklenen: 0, eksik: eksikler.length };
    secilen.forEach((h, i) => {
      if (v[i]) yeni.set(h.id, kodla(Array.from(v[i])));
    });
  }
  const sira = haberler.map((h) => h.id).filter((id) => eski.has(id) || yeni.has(id));
  const satir = (id) => JSON.stringify({ id, v: yeni.get(id) ?? eski.get(id) });
  let bayt = 0;
  const tutulan = [];
  for (const id of sira) {
    bayt += Buffer.byteLength(satir(id)) + 1;
    if (bayt > azamiBayt) break;
    tutulan.push(id);
  }
  const degisti = yeni.size > 0 || tutulan.length !== eski.size || tutulan.some((id) => !eski.has(id));
  if (degisti) {
    mkdirSync(path.dirname(dosya), { recursive: true });
    writeFileSync(dosya, tutulan.sort().map(satir).join('\n') + (tutulan.length ? '\n' : ''));
  }
  return { eklenen: yeni.size, eksik: eksikler.length - yeni.size };
}
