// Kaynak: mecmua/site-ortak/kok/indexnow.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// IndexNow: yayından sonra yeni yazıların adreslerini Bing, Yandex, Seznam, Naver'a bildirir.
// dist/news-sitemap.xml'deki (son 48 saat) adresler + anasayfa + sitenin ek adresleri gönderilir. Site, anahtar ve ek
// adresler scripts/site-ortak.json'dadır; anahtar dosyası public/<anahtar>.txt. İş akışını asla düşürmez: her hata
// yakalanır, yalnızca günlüğe yazılır, çıkış kodu 0.
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const UC = 'https://api.indexnow.org/indexnow';
const AZAMI = 10000;

/** Gönderilecek adresler: önce anasayfa ve ekler, sonra sitemap'teki yalnız bu siteye ait adresler; tekrarsız. */
export function adresListesi({ xml = '', site, ek = [] }) {
  const kok = site.replace(/\/+$/, '');
  const sitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/&amp;/g, '&').trim())
    .filter((u) => u === `${kok}/` || u.startsWith(`${kok}/`));
  return [...new Set([`${kok}/`, ...ek.map((e) => `${kok}${e}`), ...sitemap])].slice(0, AZAMI);
}

/** Adresleri IndexNow'a gönderir; hiç fırlatmaz. Döner: { adet, durum } (gönderilemezse durum null). */
export async function bildir({ ayar, xml, fetchFn = fetch, log = console.log }) {
  const site = ayar.site.replace(/\/+$/, '');
  const urlList = adresListesi({ xml, site, ek: ayar.indexnowEk ?? [] });
  try {
    const res = await fetchFn(UC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(site).host, key: ayar.indexnowAnahtar, keyLocation: `${site}/${ayar.indexnowAnahtar}.txt`, urlList }),
      signal: AbortSignal.timeout(30_000),
    });
    log(`IndexNow: ${urlList.length} adres gönderildi, yanıt ${res.status} ${res.statusText}`.trim());
    const metin = await res.text().catch(() => '');
    if (metin) log(metin.slice(0, 500));
    return { adet: urlList.length, durum: res.status };
  } catch (e) {
    log(`IndexNow: gönderilemedi (${e?.message ?? e})`);
    return { adet: urlList.length, durum: null };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const ayar = JSON.parse(readFileSync(new URL('./site-ortak.json', import.meta.url), 'utf8'));
    let xml = '';
    try {
      xml = readFileSync('dist/news-sitemap.xml', 'utf8');
    } catch {
      console.log('IndexNow: dist/news-sitemap.xml okunamadı; yalnızca anasayfa ve ek adresler gönderiliyor.');
    }
    const { adet, durum } = await bildir({ ayar, xml });
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `IndexNow: ${adet} adres, yanıt ${durum ?? 'yok'}\n`);
  } catch (e) {
    console.log(`IndexNow atlandı: ${e?.message ?? e}`);
  }
}
