// Kaynak: mecmua/site-ortak/gemini/vektorler.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yayımlanan haberlerin vektör dosyası (Faz 2, 27 Ekim 2026): ilgili haberler kutusu derlemede bunu okur
// (src/lib/anlam.mjs). Biçim: her satırda bir haber {"id","v"}, kimliğe göre sıralı (commit farkı yalnız yeni
// satırlar olsun). id = Astro glob kimliği (haberin klasör ya da dosya adı). Bot her turda en çok `azami` eksik haberi
// ekler; geriye dönük doldurma da böyle, ayrı betik olmadan ilerler (turda 25, günde ≤ 300).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { esikler, gommeKipi, kodla, vektorle as gommeVektorle, onbellekYukle, onbellekKaydet } from './gomme.mjs';

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

// Bir süreçte gömme önbelleği tek nesnedir: eşleme ve tur sonu aynı dosyayı okuyup yazar.
const onbellekler = new Map();
export function ortakOnbellek(dosya) {
  const k = path.resolve(dosya); // çağıranlar yolu farklı kurabilir (göreli kök, mutlak klasör)
  if (!onbellekler.has(k)) onbellekler.set(k, onbellekYukle(k));
  return onbellekler.get(k);
}

const alan = (fm, ad) => {
  const m = fm.match(new RegExp(`^${ad}:[ \\t]*(.*)$`, 'm'));
  if (!m) return '';
  const v = m[1].trim();
  try {
    return v.startsWith('"') ? JSON.parse(v) : v.replace(/^'(.*)'$/, '$1');
  } catch {
    return v.replace(/^"|"$/g, '');
  }
};

/** İçerik klasöründeki haberler (<slug>/index.md ya da <slug>.md), en yeniden eskiye: { id, metin, zaman }. */
export function haberMetinleri(klasor) {
  let girdiler = [];
  try {
    girdiler = readdirSync(klasor);
  } catch {
    return [];
  }
  const out = [];
  for (const ad of girdiler) {
    const yol = path.join(klasor, ad);
    let dosya = null;
    let id = null;
    try {
      if (statSync(yol).isDirectory()) [dosya, id] = [path.join(yol, 'index.md'), ad];
      else if (ad.endsWith('.md')) [dosya, id] = [yol, ad.slice(0, -3)];
      if (!dosya) continue;
      const fm = readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n').split(/^---[ \t]*$/m)[1] ?? '';
      const baslik = alan(fm, 'title');
      if (!baslik) continue;
      out.push({ id, metin: `${baslik}\n${alan(fm, 'description')}`, zaman: Date.parse(alan(fm, 'date')) || 0 });
    } catch {
      // okunamayan haber atlanır
    }
  }
  return out.sort((a, b) => b.zaman - a.zaman || a.id.localeCompare(b.id));
}

/**
 * Bot turunun sonunda (durum dosyası yazılmadan önce): GOMME_VEKTOR=1 ise vektör dosyasına en çok 25 eksik haber
 * eklenir; bu süreçte yüklenmiş gömme önbelleği kaydedilir. Hiçbir durumda atmaz (tur düşmesin).
 * kok: site klasörü; icerik: köke göre haber klasörü (jendume: src/content/haberler/tr).
 */
export async function gommeTurSonu({ kok, icerik, onbellekDosyasi, env = process.env, vektorle = gommeVektorle, simdi = new Date() }) {
  let sonuc = null;
  try {
    if (env.GOMME_VEKTOR === '1') {
      const onbellek = ortakOnbellek(onbellekDosyasi);
      sonuc = await vektorDosyasiGuncelle({ dosya: path.join(kok, 'src/data/vektorler.jsonl'), haberler: haberMetinleri(path.join(kok, icerik)), onbellek, vektorle });
      console.log(`  gömme: vektör dosyasına ${sonuc.eklenen} haber eklendi, ${sonuc.eksik} eksik`);
    }
  } catch (e) {
    console.warn(`  gömme: vektör dosyası güncellenemedi (${e.message})`);
    sonuc = null;
  }
  try {
    const k = path.resolve(onbellekDosyasi);
    if (onbellekler.has(k)) onbellekKaydet(onbellekler.get(k), k, simdi);
  } catch (e) {
    console.warn(`  gömme: önbellek yazılamadı (${e.message})`);
  }
  return sonuc;
}

/** Ön eleme ayarı (finfolis olaylar, tidsrost medier): kip kapalıysa null. */
export function gommeAyari({ onbellekDosyasi, env = process.env, log = console.log }) {
  const kip = gommeKipi(env);
  if (kip === 'kapali') return null;
  return { kip, alt: esikler(env).alt, vektorle: gommeVektorle, onbellek: ortakOnbellek(onbellekDosyasi), log };
}
