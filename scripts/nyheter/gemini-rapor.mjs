// Kaynak: mecmua/site-ortak/gemini/gemini-rapor.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Katman 0 (Gemini kota planı): işin son adımı. Bu işteki betiklerin Gemini kullanımını (GEMINI_KULLANIM_DOSYASI,
// bkz. kullanim.mjs) mecmua-saat'e gönderir: POST <MOTOR_URL>/motor/<site>/gemini. Hiçbir durumda işi düşürmez;
// anahtar ve adres loga yazılmaz.
// Kullanım: node <bot klasörü>/gemini-rapor.mjs <site>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AZAMI_SATIR = 40;

export async function raporla({ dosya, url, anahtar, site, fetchFn = fetch }) {
  if (!url || !anahtar) return 'Gemini raporu: motor ayarı tanımlı değil (ayar yok), gönderilmedi';
  let kayitlar;
  try {
    kayitlar = JSON.parse(readFileSync(dosya, 'utf8'));
  } catch {
    return 'Gemini raporu: kayıt yok';
  }
  if (!Array.isArray(kayitlar) || !kayitlar.length) return 'Gemini raporu: kayıt yok';
  kayitlar = kayitlar.slice(0, AZAMI_SATIR);
  try {
    const res = await fetchFn(`${url.replace(/\/$/, '')}/motor/${site}/gemini`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' },
      body: JSON.stringify({ kayitlar }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return `Gemini raporu: saat ${res.status} döndü`;
    return `Gemini raporu: ${kayitlar.length} kayıt gönderildi`;
  } catch (e) {
    return `Gemini raporu: gönderilemedi (${String(e.message).replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[adres]').slice(0, 80)})`;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const site = process.argv[2];
  console.log(
    await raporla({ dosya: process.env.GEMINI_KULLANIM_DOSYASI ?? '', url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site }),
  );
}
