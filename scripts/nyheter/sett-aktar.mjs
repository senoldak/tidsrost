// Tek seferlik geçiş: eski düzende karar verilmiş adayların kimliklerini mecmua-saat motor defterine 'elendi' olarak yazar.
// Defterde bitmiş kayıt değişmez; yeniden çalıştırmak güvenlidir. İstekte yalnız tek yönlü özetlenmiş kimlik gider
// (motorKimlik); ham id gitmez, loga yazılmaz. tidsrost'ta havuz yok; sett'teki her id aktarılır.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { motorKimlik } from './motor.mjs';

export const PARCA = 35;
export const GEREKCE = 'aktarım: eski düzende karar verildi';

export function aktarimKayitlari(durum) {
  return Object.keys(durum.sett ?? {}).map((id) => ({ kimlik: motorKimlik(id), durum: 'elendi', gerekce: GEREKCE }));
}

export async function aktar({ durum, url, anahtar, fetchFn = fetch, log = () => {} }) {
  if (!url || !anahtar) throw new Error('MOTOR_URL ve MOTOR_ANAHTARI gerekli');
  const kayitlar = aktarimKayitlari(durum);
  const adres = `${String(url).replace(/\/$/, '')}/motor/tidsrost/kaydet`;
  for (let i = 0; i < kayitlar.length; i += PARCA) {
    const res = await fetchFn(adres, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' },
      body: JSON.stringify({ haberler: kayitlar.slice(i, i + PARCA) }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`motor kaydı reddedildi: saat ${res.status} döndü (parça ${i / PARCA + 1})`);
    log(`  parça ${i / PARCA + 1}: ${Math.min(PARCA, kayitlar.length - i)} kayıt`);
  }
  return kayitlar.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const durum = JSON.parse(readFileSync(new URL('./sett.json', import.meta.url), 'utf8'));
    const n = await aktar({ durum, url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, log: console.log });
    console.log(`aktarıldı: ${n}`);
  } catch (e) {
    console.error(`aktarım başarısız: ${String(e?.message ?? e).slice(0, 200)}`);
    process.exit(1);
  }
}
