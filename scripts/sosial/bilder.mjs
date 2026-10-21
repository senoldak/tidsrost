// Yayın derlemesinden önce (yayinla.yml) paylaşılacak haberlerin post (1080×1350) ve story (1080×1920) görsellerini
// public/sosial/ altına Fjord diliyle çizer. Dosyalar repoya girmez (.gitignore); yalnız son pencere çizildiği için
// dosya sayısı küçük kalır. Meta görselleri tidsrost.com/sosial/… adresinden çeker.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fjordKart } from '../nyheter/fjord.mjs';
import { kapakCiz } from '../nyheter/bilde.mjs';
import { DIZIN, PENCERE_MS, sakerOku, paylasilir, bildeFil } from './saker.mjs';

const CIKIS = 'public/sosial';
const DURUM = 'scripts/sosial/delt.json';
const KANALLAR = ['ig_post', 'ig_story', 'fb_post', 'fb_story'];
// Biraz geniş pencere: derleme ile paylaşım arasında birkaç saat geçebilir.
const simdi = Date.now();
const tumu = await sakerOku();
let delt = {};
try { delt = JSON.parse(await readFile(DURUM, 'utf8')) ?? {}; } catch {}
// Paylaşımı bitmemiş haber: delt.json'da hiç yok ya da bir kanalı eksik. Kaba ölçü: kalıcı olarak düşmüş kanal da
// "eksik" görünür; o zaman görsel fazladan çizilir ve del.mjs bir kez boş çalışır, zararı yok.
const eksikVar = (s) => !delt[s.id] || (!delt[s.id].atlandi && KANALLAR.some((c) => !delt[s.id][c]));
// Yalnız paylaşımı bitmemiş haberlerin görseli çizilir (C4): her yayında penceredeki 20–45 haberin hepsi yeniden
// çiziliyordu, oysa paylaşılmış haberin görseline Meta bir daha bakmaz.
const saker = tumu.filter((s) => paylasilir(s, simdi, PENCERE_MS + 6 * 3600e3)).filter(eksikVar);

// Yayınla'ya "paylaşılacak haber var mı" bilgisi: del.mjs'in penceresinde (24 saat) paylaşımı bitmemiş haber sayısı.
// Sıfırsa sosial.yml başlatılmaz (boş koşu 1 dk sayılıyordu).
const paylasilacak = tumu.filter((s) => paylasilir(s, simdi)).filter(eksikVar).length;
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `paylasilacak=${paylasilacak}\n`);

await mkdir(CIKIS, { recursive: true });
let n = 0;
for (const s of saker) {
  try {
    const omslag = s.gorselKapak ? await readFile(path.join(DIZIN, s.id, 'cover.png')) : undefined;
    for (const bicim of ['post', 'story']) {
      await writeFile(path.join(CIKIS, bildeFil(s.id, bicim)), await kapakCiz(fjordKart({ tittel: s.tittel, ingress: s.ingress, tohum: s.id, omslag, forfatter: s.forfatter, sjanger: s.sjanger }, bicim)));
    }
    n++;
  } catch (e) {
    // Yazı tipi bekçisi dahil: görsel çizilemezse derleme durmaz, o haber paylaşılmaz (del.mjs görseli bulamaz).
    console.error(`${s.id}: sosyal görsel çizilemedi: ${e.message}`);
  }
}
console.log(`sosial: ${n} haber için post + story görseli (${CIKIS}); paylaşılacak ${paylasilacak} haber`);
