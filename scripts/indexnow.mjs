// Yayından sonra yeni haberleri IndexNow'a bildirir (Bing, Yandex, Seznam, Naver).
// dist/news-sitemap.xml'deki son 48 saatin haberleri + anasayfa gönderilir.
// Hiçbir koşulda iş akışını düşürmez: hata olursa yalnız kaydeder.
import { readFile } from 'node:fs/promises';

const HOST = 'tidsrost.com';
const KEY = '222a74bb7155608bc5f603f0b446cda5';

try {
  const xml = await readFile(new URL('../dist/news-sitemap.xml', import.meta.url), 'utf8').catch(() => '');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  const urlList = [...new Set([`https://${HOST}/`, ...urls])].slice(0, 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log(`IndexNow: ${urlList.length} adres gönderildi, yanıt ${res.status} ${res.statusText}`);
} catch (e) {
  console.log(`IndexNow gönderilemedi: ${e?.message ?? e}`);
}
