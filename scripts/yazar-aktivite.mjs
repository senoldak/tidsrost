// Yazar sayfasının dört siteli gün ızgarası için diğer üç sitenin imzalı yazı tarihlerini çeker (dört sitede aynı dosya).
// Her site kendi listesini /yazar-aktivite.json adresinde yayımlar ([{ site, date }], yalnız yayımlanmış imzalı yazılar).
// Kullanım (prebuild): node scripts/yazar-aktivite.mjs <bu-site>   ör. tidsrost
// Çıktı: src/data/yazar-aktivite.json { oppdatert, sider: { <site>: [ISO tarih, ...] } }. Bu sitenin kendi yazıları
// dosyaya girmez; sayfa onları derlemede kendi içeriğinden alır. Bir site erişilemezse o sitenin önceki listesi kalır.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SIDER = {
  tidsrost: 'https://tidsrost.com',
  jendume: 'https://jendume.com',
  finfolis: 'https://finfolis.com',
  kifobu: 'https://kifobu.com',
};

const ISO = /^\d{4}-\d{2}-\d{2}T/;

/** Gelen yanıtı doğrular: yalnız bu siteye ait, geçerli tarihli kayıtlar; sıralı ve tekrarsız. */
export function rens(site, data) {
  if (!Array.isArray(data)) return null;
  const datoer = data
    .filter((x) => x && x.site === site && typeof x.date === 'string' && ISO.test(x.date) && !Number.isNaN(Date.parse(x.date)))
    .map((x) => new Date(x.date).toISOString());
  return [...new Set(datoer)].sort();
}

/** onceki: önceki dosya; svar: { site: dizi | null }. Başarısız site için önceki liste korunur. */
export function birlestir(onceki, svar, na = new Date()) {
  const sider = { ...(onceki?.sider ?? {}) };
  for (const [site, liste] of Object.entries(svar)) if (liste) sider[site] = liste;
  return { oppdatert: na.toISOString(), sider };
}

async function hent(site, url, timeoutMs = 8000) {
  try {
    const res = await fetch(`${url}/yazar-aktivite.json`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return rens(site, await res.json());
  } catch (feil) {
    console.warn(`[yazar-aktivite] ${site}: ${feil.message}; önceki liste korunuyor`);
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const denne = process.argv[2];
  if (!SIDER[denne]) {
    console.error(`[yazar-aktivite] bilinmeyen site: ${denne}`);
    process.exit(0); // derlemeyi durdurma
  }
  const fil = new URL('../src/data/yazar-aktivite.json', import.meta.url);
  let onceki = null;
  try {
    onceki = JSON.parse(readFileSync(fil, 'utf8'));
  } catch {}
  const andre = Object.entries(SIDER).filter(([s]) => s !== denne);
  const svar = Object.fromEntries(await Promise.all(andre.map(async ([s, u]) => [s, await hent(s, u)])));
  const ut = birlestir(onceki, svar);
  delete ut.sider[denne];
  writeFileSync(fil, JSON.stringify(ut, null, 1) + '\n');
  console.log(`[yazar-aktivite] ${Object.entries(ut.sider).map(([s, l]) => `${s} ${l.length}`).join(', ')}`);
}
