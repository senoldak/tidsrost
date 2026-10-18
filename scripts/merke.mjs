// Logo ve simge dosyalarını üretir (BRAND.md §5–6). Logo yazının kendisidir: "tidsrøst", Archivo 800 / wdth 112, sıkı
// aralık, ø su mavisi (sitedeki .logo gibi). Simge, o logodaki ø'nün birebir aynısıdır (favicon, sosyal profil).
// Yazı glif yolu olarak çizilir; SVG'ler yazı tipi istemez.
//   public/        favicon.svg (gece temasında açık mavi), favicon.ico, favicon-32/192/512.png (saydam),
//                  favicon-maskable-512.png ve apple-touch-icon.png (kâğıt), logo-600x60.png (Google yayıncı logosu)
//   brand/logo/    tidsrost-ordmerke-* (logo), tidsrost-merke-* (ø simgesi); SVG + saydam PNG
//   brand/sosyal/  profil-lys.png, profil-mork.png (1080 kare, ø simgesi)
// Kullanım: node scripts/merke.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'fontkitten';
import sharp from 'sharp';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(KOK, 'public');
const LOGO = path.join(KOK, 'brand/logo');
const SOSYAL = path.join(KOK, 'brand/sosyal');
fs.mkdirSync(LOGO, { recursive: true });
fs.mkdirSync(SOSYAL, { recursive: true });

// Renkler src/styles/global.css'ten: --ink, --paper, --water ve gece yaprağı.
const F = { blekk: '#16191c', papir: '#fdfdfb', vann: '#1f5f99', natt: '#171612', nattTekst: '#ebe9e2', nattVann: '#7fb2e5', hvit: '#ffffff' };

const font = create(fs.readFileSync(path.join(KOK, 'scripts/nyheter/fonts/Archivo.ttf'))).getVariation({ wght: 800, wdth: 112 });
const EM = font.unitsPerEm;
const NAVN = 'tidsrøst';
const SPERRING = -0.04; // harf aralığı (em), sitedeki .logo gibi
const O = font.glyphsForString('ø')[0];

const svg = (b, h, innhold, bakgrunn) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(b)}" height="${Math.round(h)}" viewBox="0 0 ${b.toFixed(1)} ${h.toFixed(1)}">${bakgrunn ? `<rect width="100%" height="100%" fill="${bakgrunn}"/>` : ''}${innhold}</svg>`;

/** Logo: ad glif yollarıyla. Kutu: üstte d'nin tepesi, altta ø'nün kuyruğu; çevrede luft (em) kadar boşluk. */
function ordmerke(storrelse, { tekst, o }, luft = 0.2) {
  const s = storrelse / EM;
  const glyfer = font.glyphsForString(NAVN);
  const tegn = [...NAVN];
  const topp = Math.max(...glyfer.map((g) => g.bbox.maxY)) * s;
  const bunn = -Math.min(...glyfer.map((g) => g.bbox.minY)) * s;
  const l = luft * storrelse;
  const venstre = -glyfer[0].bbox.minX * s;
  let cx = l + venstre;
  let ut = '';
  glyfer.forEach((g, i) => {
    ut += `<path fill="${tegn[i] === 'ø' ? o : tekst}" transform="translate(${cx.toFixed(2)} ${(l + topp).toFixed(2)}) scale(${s} ${-s})" d="${g.path.toSVG()}"/>`;
    cx += g.advanceWidth * s + (i < glyfer.length - 1 ? SPERRING * storrelse : 0);
  });
  const sonBosluk = (glyfer.at(-1).advanceWidth - glyfer.at(-1).bbox.maxX) * s;
  return { b: cx - sonBosluk + l, h: l * 2 + topp + bunn, innhold: ut };
}

/** ø simgesi: glifin kutusu kenarı K olan karenin ortasında, en uzun kenarı K·andel. */
function merke(K, farge, andel = 0.84) {
  const { minX, minY, maxX, maxY } = O.bbox;
  const s = (K * andel) / Math.max(maxX - minX, maxY - minY);
  const x = (K - (maxX - minX) * s) / 2 - minX * s;
  const y = (K - (maxY - minY) * s) / 2 + maxY * s;
  return `<path fill="${farge}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s} ${-s})" d="${O.path.toSVG()}"/>`;
}

const tilPng = (s, bredde, hoyde) => sharp(Buffer.from(s), { density: 300 }).resize(Math.round(bredde), hoyde && Math.round(hoyde)).png({ compressionLevel: 9 }).toBuffer();

const VARIANTER = {
  lys: { tekst: F.blekk, o: F.vann }, // açık zemin (ana)
  mork: { tekst: F.nattTekst, o: F.nattVann }, // koyu zemin (gece yaprağı gibi)
  hvit: { tekst: F.hvit, o: F.hvit }, // fiyort mavisi ya da fotoğraf üstü
  blekk: { tekst: F.blekk, o: F.blekk }, // tek renk baskı
};

// --- Logo paketi -----------------------------------------------------------------------------------------------
for (const [ad, v] of Object.entries(VARIANTER)) {
  const { b, h, innhold } = ordmerke(200, v);
  const s = svg(b, h, innhold);
  fs.writeFileSync(path.join(LOGO, `tidsrost-ordmerke-${ad}.svg`), `${s}\n`);
  fs.writeFileSync(path.join(LOGO, `tidsrost-ordmerke-${ad}.png`), await tilPng(s, b * 2));
  const m = svg(512, 512, merke(512, v.o));
  fs.writeFileSync(path.join(LOGO, `tidsrost-merke-${ad}.svg`), `${m}\n`);
  fs.writeFileSync(path.join(LOGO, `tidsrost-merke-${ad}.png`), await tilPng(m, 1024));
}

// --- Sosyal profil fotoğrafı (yuvarlak kırpılır: ø ortada, çapın %56'sı) ------------------------------------------
fs.writeFileSync(path.join(SOSYAL, 'profil-lys.png'), await tilPng(svg(1080, 1080, merke(1080, F.vann, 0.56), F.papir), 1080));
fs.writeFileSync(path.join(SOSYAL, 'profil-mork.png'), await tilPng(svg(1080, 1080, merke(1080, F.nattVann, 0.56), F.natt), 1080));

// --- Favicon ve uygulama simgeleri -----------------------------------------------------------------------------
const ikon = (K, { bakgrunn, andel } = {}) => sharp(Buffer.from(svg(K, K, merke(K, F.vann, andel), bakgrunn))).png().toBuffer();

/** PNG gömülü ICO. */
function ico(pnger) {
  const hode = Buffer.alloc(6 + 16 * pnger.length);
  hode.writeUInt16LE(1, 2);
  hode.writeUInt16LE(pnger.length, 4);
  let pos = hode.length;
  pnger.forEach(([str, data], i) => {
    const o = 6 + i * 16;
    hode.writeUInt8(str, o);
    hode.writeUInt8(str, o + 1);
    hode.writeUInt16LE(1, o + 4);
    hode.writeUInt16LE(32, o + 6);
    hode.writeUInt32LE(data.length, o + 8);
    hode.writeUInt32LE(pos, o + 12);
    pos += data.length;
  });
  return Buffer.concat([hode, ...pnger.map(([, d]) => d)]);
}

// favicon.svg: koyu sekme çubuğunda okunsun diye gece temasında açık su mavisi.
fs.writeFileSync(
  path.join(PUB, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>path{fill:${F.vann}}@media (prefers-color-scheme:dark){path{fill:${F.nattVann}}}</style>${merke(64, F.vann, 0.96).replace(/ fill="[^"]+"/, '')}</svg>\n`,
);
fs.writeFileSync(path.join(PUB, 'favicon-32.png'), await ikon(32, { andel: 0.96 }));
fs.writeFileSync(path.join(PUB, 'favicon-192.png'), await ikon(192));
fs.writeFileSync(path.join(PUB, 'favicon-512.png'), await ikon(512));
fs.writeFileSync(path.join(PUB, 'favicon-maskable-512.png'), await ikon(512, { bakgrunn: F.papir, andel: 0.56 }));
fs.writeFileSync(path.join(PUB, 'apple-touch-icon.png'), await ikon(180, { bakgrunn: F.papir, andel: 0.66 }));
fs.writeFileSync(path.join(PUB, 'favicon.ico'), ico([[16, await ikon(16, { andel: 0.96 })], [32, await ikon(32, { andel: 0.96 })], [48, await ikon(48)]]));

// --- Yayıncı logosu: tam 600×60, kâğıt zemin, logo sola hizalı ---------------------------------------------------
{
  const { b, h, innhold } = ordmerke(100, VARIANTER.lys, 0);
  const olcek = 50 / h;
  const s = svg(600, 60, `<g transform="translate(4 5) scale(${olcek.toFixed(4)})">${innhold}</g>`, F.papir);
  fs.writeFileSync(path.join(PUB, 'logo-600x60.png'), await sharp(Buffer.from(s), { density: 288 }).resize(600, 60).png({ compressionLevel: 9 }).toBuffer());
  console.log(`logo-600x60.png (logo ${Math.round(b * olcek)}×50 px)`);
}
console.log('public/: favicon.svg/.ico, favicon-32/192/512, favicon-maskable-512, apple-touch-icon · brand/logo/ · brand/sosyal/');
