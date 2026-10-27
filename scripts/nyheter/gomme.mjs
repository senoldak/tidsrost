// Kaynak: mecmua/site-ortak/gemini/gomme.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gömme çekirdeği (Gemini yönlendirici Faz 2, 27 Ekim 2026). Başlıkları vektöre çevirir; aynı olay ön elemesi
// (esleme/olaylar/medier) ve ilgili haberler (vektorler.mjs) bunu kullanır. Tasarım:
// mecmua/docs/superpowers/specs/2026-10-27-gemini-faz2-gomme-design.md.
//
// Kural: gömme hiçbir zaman "aynı olay" kararı vermez. Yalnız alt eşiğin altındaki çiftleri "kesin farklı" diye
// ayıklar ve yeni çift önerir; kararı Gemini verir. Gömme düşerse (anahtar yok, 429/5xx, ağ, kota) vektorle null
// döner ve çağıran bugünkü yoldan sürer.
//
// Kota: proje başına günde 1.000 istek. Toplu çağrıda her metnin ayrı istek sayılıp sayılmadığı bilinmediği için en
// kötü varsayım: her metin bir istek. GUNLUK_AZAMI'ya (bu süreç + saatin bugünkü kaydı) gelince kalan metinler
// vektörlenmez (null). Aynı metin ONBELLEK_GUN boyunca önbellekten gelir.
//
// Dakikalık sınır (100, metin başına sayıldığı 27 Ekim'de canlıda görüldü): çağrı başına TOPLU metin, çağrılar arasında
// GOMME_ARALIK_MS; süreçte en çok TUR_AZAMI metin. Bir çağrı düşerse başarılı parçalar önbelleğe girer, kalanlar null
// ve süreç gömmeyi bırakır (429'u tekrarlamasın).
//
// Önbellek dosyası açık repoya commit'lenir: aday başlıkların vektörleri ve özetleri gizli kaynakları ele verebilir.
// Bu yüzden dosya GOMME_ANAHTARI ile AES-256-GCM şifrelidir; anahtar yoksa önbellek yalnız bellekte kalır, dosya
// yazılmaz ve okunmaz.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gommeEkle, hataEkle, modelHarcamasi } from './kullanim.mjs';
import { saatKullanimi } from './butce.mjs';

export const GOMME_MODELI = 'gemini-embedding-2';
export const BOYUT = 256;
export const GUNLUK_AZAMI = 900;
export const ONBELLEK_GUN = 3;
export const TUR_AZAMI = 150;
const TOPLU = 50;
const SURE_MS = 30_000;
const aralikMs = () => Number(process.env.GOMME_ARALIK_MS ?? 35_000);

let esiksizUyari = false;
let durdu = false; // bu süreçte bir gömme çağrısı düştü
let turdaGonderilen = 0;

// Testler için: süreç durumunu sıfırlar.
export function gommeSifirla() {
  durdu = false;
  turdaGonderilen = 0;
}

/** GOMME_ON_ELEME: yok → kapali, 'golge' → yalnız ölçüm, '1' → ön eleme (alt eşik tanımlı değilse ölçüm). */
export function gommeKipi(env = process.env) {
  const k = env.GOMME_ON_ELEME;
  if (k === 'golge') return 'golge';
  if (k !== '1') return 'kapali';
  if (esikler(env).alt !== null) return 'acik';
  if (!esiksizUyari) {
    esiksizUyari = true;
    console.warn('  gömme: GOMME_ON_ELEME=1 ama GOMME_ALT_ESIK yok; yalnız ölçüm yapılıyor');
  }
  return 'golge';
}

export function esikler(env = process.env) {
  // Yalnız 0 < x < 1: "55" gibi bir yazım hatası bütün çiftleri elemesin.
  const sayi = (s) => {
    const n = s && s.trim() ? Number(s) : NaN;
    return Number.isFinite(n) && n > 0 && n < 1 ? n : null;
  };
  return { alt: sayi(env.GOMME_ALT_ESIK), ust: sayi(env.GOMME_UST_ESIK) };
}

/** Normalize edilip ×127 yuvarlanmış int8, base64 (256 boyutta 344 karakter). */
export function kodla(v) {
  const n = Math.hypot(...v) || 1;
  const q = Int8Array.from(v, (x) => Math.max(-127, Math.min(127, Math.round((x / n) * 127))));
  return Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString('base64');
}

export function coz(s) {
  const b = Buffer.from(s, 'base64');
  return new Int8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

/** Kosinüs benzerliği, [-1, 1]. */
export function benzerlik(a, b) {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}

export const metinAnahtari = (metin) => createHash('sha1').update(metin).digest('hex').slice(0, 12);

const sifreAnahtari = () => (process.env.GOMME_ANAHTARI ? createHash('sha256').update(`gomme-onbellek:${process.env.GOMME_ANAHTARI}`).digest() : null);

/**
 * Önbellek (bellekte): { surum: 1, kayitlar: { anahtar: { v, z } } }. Dosya: { surum: 2, iv, etiket, veri } (şifreli).
 * Dosya yok, bozuk, anahtar yok ya da yanlışsa boş.
 */
export function onbellekYukle(dosya) {
  const bos = { surum: 1, kayitlar: {} };
  const anahtar = sifreAnahtari();
  if (!dosya || !anahtar) return bos;
  try {
    const j = JSON.parse(readFileSync(dosya, 'utf8'));
    if (j?.surum !== 2) return bos; // eski düz dosya okunmaz
    const d = createDecipheriv('aes-256-gcm', anahtar, Buffer.from(j.iv, 'base64'));
    d.setAuthTag(Buffer.from(j.etiket, 'base64'));
    const ic = JSON.parse(Buffer.concat([d.update(Buffer.from(j.veri, 'base64')), d.final()]).toString('utf8'));
    if (ic?.kayitlar && typeof ic.kayitlar === 'object') return { surum: 1, kayitlar: ic.kayitlar };
  } catch {
    // yok, bozuk ya da anahtar uymuyor
  }
  return bos;
}

/** Eski kayıtları atar ve şifreli yazar; GOMME_ANAHTARI yoksa dosya yazılmaz. */
export function onbellekKaydet(onbellek, dosya, simdi = new Date()) {
  const sinir = simdi.getTime() - ONBELLEK_GUN * 864e5;
  const kayitlar = {};
  for (const a of Object.keys(onbellek.kayitlar)) {
    const k = onbellek.kayitlar[a];
    if (Date.parse(k?.z) >= sinir) kayitlar[a] = k;
  }
  onbellek.kayitlar = kayitlar;
  const anahtar = sifreAnahtari();
  if (!anahtar) return;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', anahtar, iv);
  const veri = Buffer.concat([c.update(JSON.stringify({ kayitlar }), 'utf8'), c.final()]);
  writeFileSync(dosya, `${JSON.stringify({ surum: 2, iv: iv.toString('base64'), etiket: c.getAuthTag().toString('base64'), veri: veri.toString('base64') })}\n`);
}

const kalanHak = () => GUNLUK_AZAMI - modelHarcamasi(GOMME_MODELI) - saatKullanimi(GOMME_MODELI);

/**
 * Metinleri aynı sırada Int8Array vektörlere çevirir. Önbellekte olan gönderilmez; günlük hak bitince kalanlar null.
 * Toplu çağrı düşerse (HTTP hatası, ağ, eksik gövde) ya da anahtar yoksa null (hepsi).
 */
export async function vektorle(metinler, { onbellek, amac = 'gomme', fetchFn = fetch, simdi = new Date() } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const z = simdi.toISOString();
  const sonuc = metinler.map((m) => {
    const k = onbellek?.kayitlar[metinAnahtari(m)];
    if (!k) return null;
    k.z = z; // isabet zamanı yeniler: hafızadaki kayıtlar her 3 günde yeniden vektörlenmesin
    return coz(k.v);
  });
  const eksik = [...new Set(metinler.filter((_, i) => !sonuc[i]))];
  if (durdu && eksik.length) return sonuc.some(Boolean) ? sonuc : null;
  const gonderilecek = eksik.slice(0, Math.max(0, Math.min(kalanHak(), TUR_AZAMI - turdaGonderilen)));
  const yeni = new Map();
  const bitir = () => {
    for (const [m, v] of yeni) if (onbellek) onbellek.kayitlar[metinAnahtari(m)] = { v, z };
    const r = metinler.map((m, i) => sonuc[i] ?? (yeni.has(m) ? coz(yeni.get(m)) : null));
    return r.some(Boolean) || !metinler.length ? r : null;
  };
  const dus = (neden) => {
    durdu = true;
    console.warn(`  gömme: ${neden}; bu süreçte gömme bırakıldı`);
    return bitir();
  };
  for (let i = 0; i < gonderilecek.length; i += TOPLU) {
    if (i > 0 && aralikMs() > 0) await new Promise((r) => setTimeout(r, aralikMs()));
    const parca = gonderilecek.slice(i, i + TOPLU);
    let res;
    try {
      res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${GOMME_MODELI}:batchEmbedContents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          requests: parca.map((text) => ({ model: `models/${GOMME_MODELI}`, content: { parts: [{ text }] }, outputDimensionality: BOYUT })),
        }),
        signal: AbortSignal.timeout(SURE_MS),
      });
    } catch (e) {
      return dus(e.name === 'TimeoutError' ? 'zaman aşımı' : 'ağ hatası');
    }
    if (!res.ok) {
      hataEkle(GOMME_MODELI, amac, res.status);
      return dus(String(res.status));
    }
    let j;
    try {
      j = await res.json();
    } catch {
      j = null;
    }
    const vler = j?.embeddings;
    if (!Array.isArray(vler) || vler.length !== parca.length || vler.some((e) => !Array.isArray(e?.values))) return dus('eksik yanıt');
    gommeEkle(parca.length, amac);
    turdaGonderilen += parca.length;
    parca.forEach((m, n) => yeni.set(m, kodla(vler[n].values)));
  }
  return bitir();
}

/**
 * ciftler: [{ a, b }] (metin), vek: metin → vektör. İki tarafın vektörü varsa ve benzerlik < alt → elenen.
 * Vektörü olmayan çift elenmez (Gemini'ye gider).
 */
export function ciftleriSuz(ciftler, vek, alt) {
  const kalan = [];
  const elenen = [];
  const benzerlikler = ciftler.map((c, i) => {
    const [x, y] = [vek.get(c.a), vek.get(c.b)];
    const b = x && y ? benzerlik(x, y) : null;
    (b !== null && b < alt ? elenen : kalan).push(i);
    return b;
  });
  return { kalan, elenen, benzerlikler };
}

/** Benzerlik ≥ alt kenarlarıyla bağlı bileşenler (öğe indeksleri, her bileşen ve liste sıralı). */
export function bilesenler(vektorler, alt) {
  const ust = vektorler.map((_, i) => i);
  const kok = (i) => (ust[i] === i ? i : (ust[i] = kok(ust[i])));
  for (let i = 0; i < vektorler.length; i++) {
    for (let j = i + 1; j < vektorler.length; j++) {
      if (vektorler[i] && vektorler[j] && benzerlik(vektorler[i], vektorler[j]) >= alt) ust[kok(j)] = kok(i);
    }
  }
  const gruplar = new Map();
  vektorler.forEach((_, i) => (gruplar.get(kok(i)) ?? gruplar.set(kok(i), []).get(kok(i))).push(i));
  return [...gruplar.values()].sort((a, b) => a[0] - b[0]);
}

/** Kendi listesindeki başka hiçbir öğeye ve digerleri'ne alt eşik üstünde benzemeyen, vektörü olan öğeler. */
export function komsusuzlar(vektorler, digerleri, alt) {
  const out = new Set();
  // Vektörsüz bir öğe herkesin komşusu olabilir: o zaman kimse "komşusuz" sayılmaz (çıkarılan başlık eşini kaybetmesin).
  if (vektorler.some((v) => !v) || digerleri.some((v) => !v)) return out;
  vektorler.forEach((v, i) => {
    if (!v) return;
    const komsu = vektorler.some((w, j) => j !== i && w && benzerlik(v, w) >= alt) || digerleri.some((w) => w && benzerlik(v, w) >= alt);
    if (!komsu) out.add(i);
  });
  return out;
}

const IZINLI = ['tur', 'karar', 'b', 'dil', 'id'];

/** Ölçüm log satırı: yalnız sayı, karar, dil ve kısaltılmış kimlik (botlar açık repolarda çalışır). */
export function olcumSatiri(alan) {
  const j = {};
  for (const k of IZINLI) {
    if (alan[k] === undefined || alan[k] === null) continue;
    if (k === 'b') j.b = Math.round(alan.b * 100) / 100;
    else if (k === 'id') j.id = metinAnahtari(String(alan.id)).slice(0, 8);
    else j[k] = String(alan[k]).slice(0, 12);
  }
  return `gömme-ölçüm ${JSON.stringify(j)}`;
}
