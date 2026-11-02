// Derleme sonu denetimi: grafiği olan her sayfa etkileşim betiğini (src/scripts/graf.mjs'in paketi) yüklemeli ve her
// grafik kartı ipucu noktalarını (data-graf-punkter) taşımalı. Biri eksikse grafik çizilir ama üzerine gelince/dokununca
// değer çıkmaz; bu sessiz bir bozulma olduğu için derleme durdurulur (astro.config.mjs → grafEtkilesim).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const KART = /<figure class="g-kort[^"]*" data-graf[\s>]/g;
const BETIK = /<script type="module" src="\/(_astro\/[^"]+\.js)"/g;
// graf.mjs paketinde bu seçici geçer; paket adı her derlemede değiştiği için içerikten tanınır.
const ISARET = 'data-graf-punkter';

/**
 * Tek sayfanın eksikleri. grafBetigi(src) → o betik (doğrudan ya da import ettikleriyle) etkileşim kodunu içeriyor mu.
 * @param {string} html @param {(src: string) => boolean} grafBetigi @returns {string[]}
 */
export function sayfaEksikleri(html, grafBetigi) {
  const kart = (html.match(KART) ?? []).length;
  if (!kart) return [];
  const eksik = [];
  const nokta = html.split(`<script type="application/json" ${ISARET}>`).length - 1;
  if (nokta < kart) eksik.push(`${kart - nokta}/${kart} grafikte ipucu verisi yok`);
  if (![...html.matchAll(BETIK)].some((m) => grafBetigi(m[1]))) eksik.push('etkileşim betiği yüklenmiyor');
  return eksik;
}

/** @param {string} kok dist klasörü @returns {Promise<{ sayfa: number, grafik: number, hatalar: string[] }>} */
export async function grafEtkilesimDenetle(kok) {
  const onbellek = new Map();
  const icerik = async (src) => readFile(path.join(kok, src), 'utf8').catch(() => '');
  // Betik ve import ettiği yerel paketler (./x.js) gezilir; döngüye karşı ziyaret kümesi tutulur.
  async function tara(src, gorulen = new Set()) {
    if (gorulen.has(src)) return false;
    gorulen.add(src);
    const t = await icerik(src);
    if (t.includes(ISARET)) return true;
    for (const m of t.matchAll(/(?:from\s*|import\s*\(?\s*)"\.\/([^"]+\.js)"/g)) if (await tara(`_astro/${m[1]}`, gorulen)) return true;
    return false;
  }
  for (const f of await readdir(path.join(kok, '_astro')).catch(() => [])) if (f.endsWith('.js')) onbellek.set(`_astro/${f}`, await tara(`_astro/${f}`));

  let sayfa = 0;
  let grafik = 0;
  const hatalar = [];
  for (const f of await readdir(kok, { recursive: true })) {
    if (!f.endsWith('.html')) continue;
    const html = await readFile(path.join(kok, f), 'utf8');
    const n = (html.match(KART) ?? []).length;
    if (!n) continue;
    sayfa++;
    grafik += n;
    for (const e of sayfaEksikleri(html, (src) => onbellek.get(src) === true)) hatalar.push(`${f.split(path.sep).join('/')}: ${e}`);
  }
  return { sayfa, grafik, hatalar };
}
