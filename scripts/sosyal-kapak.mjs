// Sosyal kapak görselleri ve varsayılan paylaşım görseli (BRAND.md §9, §11), Fjord dilinde: koyu fiyort zemin, açık mavi
// eş yükselti dokusu (fjord.mjs ile aynı), kısa kırmızı çizgi, beyaz logo (brand/logo/tidsrost-ordmerke-hvit.svg, logo
// tek kaynaktan gelir; önce node scripts/merke.mjs) ve altında slogan ("Hør tidens røst.").
//   brand/sosyal/  x-kapak-1500x500.png, facebook-kapak-1640x624.png, linkedin-kapak-1128x191.png (logo ortada: profil
//                  fotoğrafından ve mobil kırpmadan uzak)
//   public/        og-default.png (1200×630, kapaksız haberlerin paylaşım görseli; logo solda)
// Kullanım: node scripts/sosyal-kapak.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'fontkitten';
import sharp from 'sharp';
import { konturlar } from './nyheter/fjord.mjs';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = { fjord: '#0d3557', doku: '#24557f', rod: '#c8281e', lys: '#d6e4f0' };
const SLOGAN = 'Hør tidens røst.'; // src/lib/site.ts SITE.slogan ile aynı

// Logo: SVG'nin içi; viewBox'ta yazının çevresinde boşluk var, gerçek yazı kutusu ölçülerek kırpılır.
const logoSvg = fs.readFileSync(path.join(KOK, 'brand/logo/tidsrost-ordmerke-hvit.svg'), 'utf8');
const [, , lw] = logoSvg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const { info: k } = await sharp(Buffer.from(logoSvg), { density: 288 }).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const tam = await sharp(Buffer.from(logoSvg), { density: 288 }).metadata();
const s = tam.width / lw;
const kutu = { x: -k.trimOffsetLeft / s, y: -k.trimOffsetTop / s, w: k.width / s, h: k.height / s };
const ic = logoSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
/** Logo; (x, y) yazının sol üstü, w genişlik. Yüksekliği döner. */
function logo(x, y, w) {
  const h = (w * kutu.h) / kutu.w;
  return { svg: `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="${kutu.x} ${kutu.y} ${kutu.w} ${kutu.h}">${ic}</svg>`, h };
}

const metinFont = create(fs.readFileSync(path.join(KOK, 'scripts/nyheter/fonts/Archivo.ttf'))).getVariation({ wght: 500, wdth: 100 });
function yazi(t, x, taban, boy, renk) {
  const o = boy / metinFont.unitsPerEm;
  let cx = x;
  let p = '';
  for (const g of metinFont.glyphsForString(t)) {
    const d = g.path.toSVG();
    if (d) p += `<path transform="translate(${cx.toFixed(2)} ${taban.toFixed(2)}) scale(${o} ${-o})" d="${d}"/>`;
    cx += g.advanceWidth * o;
  }
  return { svg: `<g fill="${renk}">${p}</g>`, w: cx - x };
}

function gorsel(G, Y, { logoG, sloganBoy, kontur, solX }) {
  const lgH = (logoG * kutu.h) / kutu.w;
  const cizgiH = Math.max(4, lgH * 0.07);
  const sloganW = yazi(SLOGAN, 0, 0, sloganBoy, R.lys).w;
  const blok = cizgiH + lgH * 0.42 + lgH + sloganBoy * 1.7;
  const x = solX ?? (G - Math.max(logoG, sloganW)) / 2;
  let y = (Y - blok) / 2;
  let svg = `<rect width="${G}" height="${Y}" fill="${R.fjord}"/>`;
  svg += konturlar({ ...kontur, tohum: `tidsrøst-${G}x${Y}`, renk: R.doku });
  svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(lgH * 0.75).toFixed(1)}" height="${cizgiH.toFixed(1)}" fill="${R.rod}"/>`;
  y += cizgiH + lgH * 0.42;
  svg += logo(x, y, logoG).svg;
  svg += yazi(SLOGAN, x, y + lgH + sloganBoy * 1.45, sloganBoy, R.lys).svg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">${svg}</svg>`;
}

const ISLER = {
  'brand/sosyal/x-kapak-1500x500.png': [1500, 500, { logoG: 470, sloganBoy: 34, kontur: { cx: 1260, cy: 120, rx: 600, ry: 300, adet: 16, kalin: 0.9 } }],
  'brand/sosyal/facebook-kapak-1640x624.png': [1640, 624, { logoG: 540, sloganBoy: 40, kontur: { cx: 1380, cy: 140, rx: 660, ry: 360, adet: 16, kalin: 0.9 } }],
  'brand/sosyal/linkedin-kapak-1128x191.png': [1128, 191, { logoG: 230, sloganBoy: 17, kontur: { cx: 950, cy: 40, rx: 360, ry: 150, adet: 12, kalin: 0.6 } }],
  'public/og-default.png': [1200, 630, { logoG: 560, sloganBoy: 40, solX: 96, kontur: { cx: 960, cy: 140, rx: 560, ry: 330, adet: 16, kalin: 0.9 } }],
};
for (const [dosya, [G, Y, o]] of Object.entries(ISLER)) {
  await sharp(Buffer.from(gorsel(G, Y, o))).png({ compressionLevel: 9 }).toFile(path.join(KOK, dosya));
  console.log(dosya);
}
