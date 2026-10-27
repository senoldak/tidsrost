// Kaynak: mecmua/site-ortak/gemini/kullanim.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gemini kullanım ölçümü: her cevaptaki usageMetadata toplanır, süreç biterken log'a ve Actions özetine yazılır.
// Fiyatlar 1 milyon token başına dolar; GEMINI_FIYAT_GIRIS / GEMINI_FIYAT_CIKIS ile değiştirilebilir.
// Düşünme tokenları çıkış fiyatından faturalanır.
//
// Katman 0 (Gemini kota planı): sayaç ayrıca model ve amaç başına tutulur (amaç: çağıran dosya/fonksiyon). İş akışı
// GEMINI_KULLANIM_DOSYASI verdiyse süreç biterken kayıtlar o dosyaya birleştirilir; işin son adımı (gemini-rapor.mjs)
// dosyayı mecmua-saat'e gönderir.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const fiyat = (ad, varsayilan) => {
  const n = Number(process.env[ad]);
  return Number.isFinite(n) && n >= 0 && process.env[ad] ? n : varsayilan;
};
const FIYAT_GIRIS = fiyat('GEMINI_FIYAT_GIRIS', 0.1);
const FIYAT_CIKIS = fiyat('GEMINI_FIYAT_CIKIS', 0.4);
const AZAMI_SATIR = 40; // saatin kabul ettiği en fazla satır (D1 sorgu sınırı)
const ATLANAN = new Set(['kullanim.mjs', 'lib.mjs', 'istemci.mjs']);

export const kullanim = { cagri: 0, giris: 0, cikis: 0, dusunme: 0 };
// Günlük kotası dolan (429, PerDay) modeller: bu süreçte bir daha denenmez (lib.mjs), ana model doluysa bütçe
// yöneticisi yeni habere başlatmaz (butce.mjs).
export const gunlukDolu = new Set();
const ayrinti = new Map();

// Çağrının amacı: yığında lib ve sayaç dışındaki ilk dosya ve fonksiyon ("yazar/yaziYaz").
export function amacBul(yigin = new Error().stack) {
  for (const satir of String(yigin).split('\n').slice(1)) {
    const m = satir.match(/^\s*at (?:(.+?) \()?(.+?):\d+:\d+\)?$/);
    if (!m) continue;
    const dosya = m[2].split(/[\\/]/).pop();
    if (!/\.m?js$/.test(dosya) || ATLANAN.has(dosya) || m[2].startsWith('node:')) continue;
    const fonk = (m[1] ?? '').replace(/^async /, '').split('.').pop() || 'anonim';
    return `${dosya.replace(/\.m?js$/, '')}/${fonk}`.replace(/[^A-Za-z0-9_./-]/g, '_').slice(0, 60);
  }
  return 'diger';
}

const satirAl = (model, amac) => {
  const anahtar = `${model}|${amac}`;
  if (!ayrinti.has(anahtar)) ayrinti.set(anahtar, { model, amac, cagri: 0, giris: 0, cikis: 0, h429: 0, h503: 0 });
  return ayrinti.get(anahtar);
};

export function kullanimEkle(u, { model = 'bilinmiyor', amac = 'diger' } = {}) {
  kullanim.cagri++;
  kullanim.giris += u?.promptTokenCount ?? 0;
  kullanim.cikis += u?.candidatesTokenCount ?? 0;
  kullanim.dusunme += u?.thoughtsTokenCount ?? 0;
  const s = satirAl(model, amac);
  s.cagri++;
  s.giris += u?.promptTokenCount ?? 0;
  s.cikis += (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
}

// Gömme (Faz 2): toplu çağrıdaki her metin bir istek sayılır (en kötü varsayım); token sayılmaz.
export function gommeEkle(adet, amac = 'diger', model = 'gemini-embedding-2') {
  satirAl(model, amac).cagri += adet;
}

// 429 (kota) ve 5xx (Google meşgul) yanıtları; başarılı çağrı sayılmaz.
export function hataEkle(model, amac, durum) {
  const s = satirAl(model, amac);
  if (durum === 429) s.h429++;
  else if (durum >= 500) s.h503++;
}

// En fazla AZAMI_SATIR satır: çok çağrılandan aza; fazlası tek "diger" satırında toplanır.
function sinirla(satirlar) {
  if (satirlar.length <= AZAMI_SATIR) return satirlar;
  const sirali = [...satirlar].sort((a, b) => b.cagri - a.cagri);
  const kalan = sirali.slice(AZAMI_SATIR - 1);
  const diger = { model: 'karisik', amac: 'diger', cagri: 0, giris: 0, cikis: 0, h429: 0, h503: 0 };
  for (const s of kalan) for (const a of ['cagri', 'giris', 'cikis', 'h429', 'h503']) diger[a] += s[a];
  return [...sirali.slice(0, AZAMI_SATIR - 1), diger];
}

// Bu süreçte modelin bütün amaçlardaki başarılı + başarısız istekleri: Google'ın günlük sayacı hepsini sayar
// (22 Ekim ölçümü); bütçe yöneticisi model payını bununla izler.
export function modelHarcamasi(model) {
  let n = 0;
  for (const s of ayrinti.values()) if (s.model === model) n += s.cagri + s.h429 + s.h503;
  return n;
}

export const ayrintiKayitlari = () => sinirla([...ayrinti.values()].map((s) => ({ ...s })));

export function ayrintiSifirla() {
  ayrinti.clear();
}

// Aynı işte birden çok betik Gemini kullanabilir: dosyadaki kayıtlarla birleştirilir (eşzamanlı yazma).
export function kullanimDosyasinaYaz(dosya) {
  let onceki = [];
  try {
    onceki = JSON.parse(readFileSync(dosya, 'utf8'));
  } catch {
    // dosya yok ya da bozuk: yalnız bu sürecin kayıtları yazılır
  }
  const birlesik = new Map(onceki.map((s) => [`${s.model}|${s.amac}`, { ...s }]));
  for (const s of ayrinti.values()) {
    const a = `${s.model}|${s.amac}`;
    const t = birlesik.get(a);
    if (!t) birlesik.set(a, { ...s });
    else for (const k of ['cagri', 'giris', 'cikis', 'h429', 'h503']) t[k] += s[k];
  }
  writeFileSync(dosya, JSON.stringify([...birlesik.values()]));
}

export function kullanimOzeti() {
  const { cagri, giris, cikis, dusunme } = kullanim;
  const dolar = (giris * FIYAT_GIRIS + (cikis + dusunme) * FIYAT_CIKIS) / 1e6;
  const n = (x) => x.toLocaleString('tr-TR');
  return `Gemini: ${cagri} çağrı, ${n(giris)} giriş / ${n(cikis + dusunme)} çıkış token (düşünme ${n(dusunme)}), ~$${dolar.toFixed(4)}`;
}

// process.exit ile biten betiklerde de çalışsın diye 'exit' olayı (yalnızca eşzamanlı yazma).
process.on('exit', () => {
  if (ayrinti.size && process.env.GEMINI_KULLANIM_DOSYASI) {
    try {
      kullanimDosyasinaYaz(process.env.GEMINI_KULLANIM_DOSYASI);
    } catch (e) {
      console.warn(`Gemini kullanım dosyası yazılamadı: ${e.message}`);
    }
  }
  if (!kullanim.cagri) return;
  const satir = kullanimOzeti();
  console.log(`\n${satir}`);
  try {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n**${satir}**\n`);
  } catch {
    // özet yazılamazsa log yeter
  }
});
