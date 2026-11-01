// Google denemesi: hangi ki-medier haberleri Google'a yeniden açılır? Kural src/lib/sok-synlighet.mjs kanApnesForGoogle'de;
// burada koleksiyon dosyalardan okunur (astro.config.mjs de aynı yolla okur, astro:content burada yok) ve küme bir kez
// hesaplanır. Haber sayfası, site haritası ve news-sitemap.xml (IndexNow bunu okur) aynı kümeyi kullanır.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { kanApnesForGoogle, googleTestPa } from './sok-synlighet.mjs';
import { datakortFor } from './datalenker.mjs';
import { visKart } from './sted.mjs';
import { tidligereSaker } from './tidligere.ts';

// Derleme (astro build) sayfa kodunu paketler; import.meta.url orada dist/.prerender'a işaret eder. Derleme ve testler
// proje kökünden çalışır (astro.config.mjs de aynı varsayımla ./src/content yolunu kullanır).
const DIZIN = path.resolve(process.cwd(), 'src/content/haberler');

/** Yayında olan haberler, tidligereSaker'ın beklediği biçimde (id, data, body) + sted.webp var mı. */
export function lesHaberler(dizin = DIZIN, na = Date.now()) {
  const sonuc = [];
  for (const f of readdirSync(dizin, { recursive: true })) {
    if (!String(f).endsWith('.md')) continue;
    const metin = readFileSync(path.join(dizin, f), 'utf8');
    const m = metin.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) continue;
    let data;
    try { data = YAML.parse(m[1]) ?? {}; } catch { continue; }
    const date = new Date(data.date);
    if (data.draft === true || Number.isNaN(date.getTime()) || date.getTime() > na) continue;
    const klasor = path.dirname(f);
    const id = klasor === '.' ? path.basename(f, '.md') : klasor.split(path.sep).join('/');
    sonuc.push({
      id,
      body: m[2],
      stedKart: klasor !== '.' && existsSync(path.join(dizin, klasor, 'sted.webp')),
      data: { ...data, date, produksjon: data.produksjon ?? 'manuell', sjanger: data.sjanger ?? 'nyhet' },
    });
  }
  return sonuc;
}

/** Saf: haber listesinden açılacak id'ler. `bidrag` testlerde enjekte edilebilir. */
export function googleTestIderFra(haberler, env = process.env) {
  const ider = new Set();
  if (!googleTestPa(env)) return ider;
  for (const h of haberler) {
    const d = h.data;
    if (d.produksjon !== 'ki-medier') continue;
    const antallKilder = Array.isArray(d.kilder) ? d.kilder.length : 0;
    const harKart = !!(h.stedKart && d.sted && visKart({ id: h.id, title: d.title, description: d.description, category: d.category, sjanger: d.sjanger, sted: d.sted }));
    const harBidrag = () => harKart || !!datakortFor(`${d.title} ${d.description ?? ''}`) || tidligereSaker(h, haberler).length > 0;
    if (antallKilder < 3) continue; // ucuz ön eleme: tidligereSaker yalnız uygun adaylarda çalışır
    if (kanApnesForGoogle({ id: h.id, title: d.title, produksjon: d.produksjon, antallKilder, harBidrag: harBidrag() }, env)) ider.add(h.id);
  }
  return ider;
}

let onbellek;
/** Derleme boyunca bir kez hesaplanan küme. */
export function googleTestIder() {
  return (onbellek ??= googleTestIderFra(lesHaberler()));
}
