// Forklart/Analyse grafikleri: yazıdaki `![…](./graf-N.svg)` paragrafı, yanında `graf-N.json` (grafik setinin şeması,
// resmî rakamlar, alt metinle doğrulanmış) varsa aynı veriyle etkileşimli karta döner. JSON yoksa ya da geçersizse
// resim olduğu gibi kalır. RSS, kapak ve arama dosyaları markdown'dan okur; onlarda resim kalır.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grafHtml } from './html.mjs';
import { nyId } from './index.mjs';
import { validerGraf } from './sema.mjs';

const GRAF = /^\.\/(graf-\d+)\.svg$/;

/**
 * Paragraf bir graf-N.svg resminden (ve isteğe bağlı altındaki italik açıklamadan) ibaretse ve JSON'u varsa kart HTML'i;
 * yoksa null. Açıklamanın metni (alt başlık ve "Kilde: …") çeviricide JSON'un under/kilde alanlarına birebir taşınır.
 */
export function grafForAvsnitt(p, mappe) {
  const barn = (p.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()));
  if (barn.length === 2 && barn[1].type === 'element' && barn[1].tagName === 'em') barn.pop();
  if (barn.length !== 1 || barn[0].type !== 'element' || barn[0].tagName !== 'img') return null;
  const m = String(barn[0].properties?.src ?? '').match(GRAF);
  if (!m) return null;
  const fil = join(mappe, `${m[1]}.json`);
  if (!existsSync(fil)) return null;
  try {
    const data = JSON.parse(readFileSync(fil, 'utf8'));
    const feil = validerGraf(data);
    if (feil.length) {
      console.warn(`[forklart-graf] ${fil}: ${feil.join('; ')} (bildet beholdes)`);
      return null;
    }
    return grafHtml(data, { id: nyId(), bred: !!data.bred });
  } catch (e) {
    console.warn(`[forklart-graf] ${fil}: ${e.message} (bildet beholdes)`);
    return null;
  }
}

// Sätteri hast-plugin: yalnız src/content/haberler/ altındaki yazılar.
export function satteriGraf() {
  return (fabrikk) => {
    const sti = fabrikk?.fileURL ? fileURLToPath(fabrikk.fileURL) : '';
    if (!sti.split('\\').join('/').includes('src/content/haberler/')) return null;
    const mappe = dirname(sti);
    return {
      name: 'tidsrost-forklart-graf',
      element: {
        filter: ['p'],
        visit(node, ctx) {
          const html = grafForAvsnitt(node, mappe);
          if (html) ctx.replaceNode(node, { type: 'raw', value: html });
        },
      },
    };
  };
}
