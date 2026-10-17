// Yayın derlemesinden önce (yayinla.yml) paylaşılacak haberlerin post (1080×1350) ve story (1080×1920) görsellerini
// public/sosial/ altına Fjord diliyle çizer. Dosyalar repoya girmez (.gitignore); yalnız son pencere çizildiği için
// dosya sayısı küçük kalır. Meta görselleri tidsrost.com/sosial/… adresinden çeker.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fjordKart } from '../nyheter/fjord.mjs';
import { kapakCiz } from '../nyheter/bilde.mjs';
import { DIZIN, PENCERE_MS, sakerOku, paylasilir, bildeFil } from './saker.mjs';

const CIKIS = 'public/sosial';
// Biraz geniş pencere: derleme ile paylaşım arasında birkaç saat geçebilir.
const simdi = Date.now();
const saker = (await sakerOku()).filter((s) => paylasilir(s, simdi, PENCERE_MS + 6 * 3600e3));

await mkdir(CIKIS, { recursive: true });
let n = 0;
for (const s of saker) {
  try {
    const omslag = s.gorselKapak ? await readFile(path.join(DIZIN, s.id, 'cover.png')) : undefined;
    for (const bicim of ['post', 'story']) {
      await writeFile(path.join(CIKIS, bildeFil(s.id, bicim)), await kapakCiz(fjordKart({ tittel: s.tittel, ingress: s.ingress, tohum: s.id, omslag }, bicim)));
    }
    n++;
  } catch (e) {
    // Yazı tipi bekçisi dahil: görsel çizilemezse derleme durmaz, o haber paylaşılmaz (del.mjs görseli bulamaz).
    console.error(`${s.id}: sosyal görsel çizilemedi: ${e.message}`);
  }
}
console.log(`sosial: ${n} haber için post + story görseli (${CIKIS})`);
