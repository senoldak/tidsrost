// Fjord görsel dili (sahibin kararı, 2026-10-18): koyu fjord mavisi düz zemin, büyük beyaz kalın başlık, kırmızı vurgu
// (Norveç bayrağı: mavi, beyaz, kırmızı; sarı yok), açık mavi eş yükselti dokusu. Okur kitlesi yaşlı: punto büyük.
// Üç biçim: site kapağı 1200×675, Instagram/Facebook postu 1080×1350, story 1080×1920.
// Kapak kuralı (2026-10-14) sürer: kaynak, kategori ve tarih çizilmez; yalnız başlık ve imza.
// Dönüş { svg, katmanlar } → bilde.mjs kapakCiz ile PNG olur.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');

const R = { fjord: '#0d3557', doku: '#24557f', rod: '#c8281e', lys: '#d6e4f0', hvit: '#ffffff' };

// Archivo'dan türetilmiş sabit kesimler (fonts/README.md, OFL):
// TidsrostTittel 900/78, TidsrostTung 800/100, TidsrostSemi 600/100, TidsrostBrod 450/100.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function tekst(s, { font, boy, renk, gen, aralik = 0 }) {
  const { default: sharp } = await import('sharp');
  // Dar kesimde boşluk çok ince kalıyor; kelime arasına kıl boşluğu eklenir (satır sonu düz boşlukta kırılır).
  const ic = font === 'TidsrostTittel' ? esc(s).replace(/ /g, '  ') : esc(s);
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${renk}">${ic}</span>`,
      font: `${font} ${boy}`,
      fontfile: path.join(FONT_DIR, `${font}.ttf`),
      rgba: true,
      dpi: 72,
      ...(gen ? { width: Math.round(gen), wrap: 'word' } : {}),
      ...(aralik ? { spacing: aralik } : {}),
    },
  }).png().toBuffer({ resolveWithObject: true });
  return { input: data, w: info.width, h: info.height };
}

// Yazı tipi bekçisi: sharp/Pango yazı tipi dosyasını yükleyemezse hata vermeden başka bir yazı tipine düşer ve kapak
// sessizce bozulur. Her kesimle bilinen bir metin çizilir; genişlik, yükseklik ve mürekkep (alfa toplamı) beklenen
// parmak iziyle karşılaştırılır. Örnek: yedek yazı tipi 950×100 / 12.859, TidsrostTittel 972×115 / 40.217.
export const FONT_IZI = {
  TidsrostTittel: { w: 972, h: 115, murekkep: 40217 },
  TidsrostTung: { w: 1138, h: 114, murekkep: 40174 },
  TidsrostSemi: { w: 1054, h: 112, murekkep: 31796 },
  TidsrostBrod: { w: 1031, h: 110, murekkep: 26192 },
};
export async function fontIzi(font) {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp({ text: { text: 'Hamburgefonstiv ÆØÅ', font: `${font} 100`, fontfile: path.join(FONT_DIR, `${font}.ttf`), rgba: true, dpi: 72 } })
    .raw().toBuffer({ resolveWithObject: true });
  let a = 0;
  for (let i = 3; i < data.length; i += 4) a += data[i];
  return { w: info.width, h: info.height, murekkep: Math.round(a / 255) };
}
let fontlarTamam = null;
export function fontlariDenetle() {
  fontlarTamam ??= (async () => {
    for (const [font, bek] of Object.entries(FONT_IZI)) {
      const iz = await fontIzi(font);
      const uyar = Math.abs(iz.w - bek.w) / bek.w > 0.04 || Math.abs(iz.h - bek.h) > 8 || Math.abs(iz.murekkep - bek.murekkep) / bek.murekkep > 0.15;
      if (uyar) throw new Error(`::error::Yazı tipi ${font} yüklenmedi ya da başka yazı tipine düşüldü (ölçülen ${JSON.stringify(iz)}, beklenen ${JSON.stringify(bek)})`);
    }
  })();
  return fontlarTamam;
}

// Tohumlu kapalı eş yükselti eğrileri: aynı haber hep aynı deseni alır, haberden habere değişir.
function tohumla(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
export function konturlar({ cx, cy, rx, ry, adet, tohum, kalin = 1, renk = R.doku }) {
  const r = tohumla(tohum);
  const faz = Array.from({ length: 4 }, () => r() * 6.283);
  const g = [0.16, 0.1, 0.06, 0.04].map((x) => x * (0.7 + r() * 0.6));
  let o = '';
  for (let i = 0; i < adet; i++) {
    const k = 1 - i / adet;
    const p = [];
    for (let a = 0; a <= 120; a++) {
      const t = (a / 120) * 6.283;
      const d = 1 + g[0] * Math.sin(2 * t + faz[0] + i * 0.15) + g[1] * Math.sin(3 * t + faz[1]) + g[2] * Math.sin(5 * t + faz[2] - i * 0.2) + g[3] * Math.sin(7 * t + faz[3]);
      p.push(`${(cx + Math.cos(t) * rx * k * d).toFixed(1)},${(cy + Math.sin(t) * ry * k * d).toFixed(1)}`);
    }
    o += `<polygon points="${p.join(' ')}" fill="none" stroke="${renk}" stroke-width="${(i % 5 === 0 ? 3 : 1.4) * kalin}"/>`;
  }
  return o;
}

// "Zelenskyj: Vil …" → kırmızı kutuda üst satır; "… – …" → ana başlık + alt başlık.
export function bol(tittel) {
  let kicker = null;
  let ana = String(tittel ?? '').trim();
  let alt = null;
  const k = ana.match(/^([^:]{2,32}):\s+(.+)$/);
  if (k) { kicker = k[1]; ana = k[2][0].toUpperCase() + k[2].slice(1); }
  const d = ana.match(/^(.{12,}?)\s+[–—-]\s+(.{8,})$/);
  if (d) { ana = d[1]; alt = d[2][0].toUpperCase() + d[2].slice(1); }
  return { kicker, ana, alt };
}

export const BICIM = {
  kapak: { W: 1200, H: 675, pad: 64, ust: 48, alt: 627, ana: [92, 80, 68], altB: 38, kick: 32, ing: 0, logo: 34, cta: null, kontur: { cx: 0.8, cy: 0.18, rx: 560, ry: 330, adet: 16, kalin: 0.9 }, metinBosluk: 36 },
  post: { W: 1080, H: 1350, pad: 80, ust: 80, alt: 1270, ana: [128, 112, 96], altB: 48, kick: 40, ing: 0, logo: 46, cta: null, kontur: { cx: 0.78, cy: 0.2, rx: 640, ry: 400, adet: 18, kalin: 1 }, metinBosluk: 64 },
  // Story'de üstte ~270, altta ~340 px Instagram arayüzünün altında kalır; içerik aradaki güvenli alanda.
  story: { W: 1080, H: 1920, pad: 80, ust: 270, alt: 1580, ana: [136, 120, 104], altB: 52, kick: 44, ing: 46, logo: 48, cta: 'Les mer på tidsrost.com', kontur: { cx: 0.78, cy: 0.3, rx: 660, ry: 560, adet: 18, kalin: 1 }, metinBosluk: 64 },
  // Reels: altta açıklama (~420 px), sağda beğen/yorum sütunu (~140 px) arayüzün altında kalır.
  reels: { W: 1080, H: 1920, pad: 80, sag: 150, ust: 250, alt: 1480, ana: [128, 112, 96], altB: 50, kick: 44, ing: 44, logo: 48, cta: null, kontur: { cx: 0.78, cy: 0.3, rx: 660, ry: 560, adet: 18, kalin: 1 }, metinBosluk: 64 },
};

const puntoSec = (s, [buyuk, orta, kucuk]) => (s.length > 70 ? kucuk : s.length > 45 ? orta : buyuk);

// Palet: haber = koyu fjord zemin; imzalı yazının "ters" varyantı = açık buz mavisi zemin, fjord mavisi başlık.
const PALET = {
  fjord: { bg: R.fjord, doku: R.doku, baslik: R.hvit, ikincil: R.lys, logo: R.hvit, imza: R.hvit },
  ters: { bg: '#e6eef6', doku: '#c4d6e6', baslik: R.fjord, ikincil: '#2c4f71', logo: R.fjord, imza: R.rod },
};

/**
 * @param {{ tittel: string, ingress?: string, tohum?: string, omslag?: Buffer, forfatter?: string, sjanger?: string }} m
 *   omslag: haberin harita/grafik kapağı (1200×675); post ve story'de üstte durur.
 *   forfatter: imzalı yazı (ör. Şenol Dak, Forklart). Sahibin seçimi 2026-10-18: "ters Fjord" — açık buz mavisi
 *   zemin, fjord mavisi başlık, sol üstte kırmızı tür etiketi, başlığın altında kırmızı yazar adı. Aynı aile, ama
 *   akışta haberle karışmaz.
 * @param {'kapak'|'post'|'story'|'reels'} bicim
 * Dönüşteki canli (reels.mjs için): zemin SVG'si ve rolü belli parçalar (metin katmanları ve kırmızı kutular) ayrı ayrı.
 */
export async function fjordKart(m, bicim = 'kapak') {
  await fontlariDenetle();
  const b = BICIM[bicim];
  const { W, H, pad, alt } = b;
  let { ust } = b;
  const ic = W - pad - (b.sag ?? pad);
  const { kicker, ana, alt: altBaslik } = bol(m.tittel);
  const imzali = Boolean(m.forfatter);
  const P = imzali ? PALET.ters : PALET.fjord;
  const tur = (m.sjanger === 'forklart' ? 'Forklart' : m.sjanger === 'analyse' ? 'Analyse' : 'Kommentar').toLocaleUpperCase('nb-NO');
  const katmanlar = [];
  const parcalar = [];
  let svg = `<rect width="${W}" height="${H}" fill="${P.bg}"/>`;
  let zemin = svg;
  const katman = (rol, k) => { katmanlar.push(k); parcalar.push({ rol, ...k }); };
  const kutu = (rol, x, y, w, h, fill) => {
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    parcalar.push({ rol, rect: { x, y, w, h, fill } });
  };

  let sinirUst = ust + (bicim === 'kapak' ? 0 : 40);
  if (imzali) {
    const etiket = await tekst(tur, { font: 'TidsrostTung', boy: b.kick, renk: R.hvit });
    const px = Math.round(etiket.h * 0.32);
    const py = Math.round(etiket.h * 0.18);
    const ey = ust + py;
    kutu('etiket', pad, ey - py, etiket.w + 2 * px, etiket.h + 2 * py, R.rod);
    katman('etiket', { input: etiket.input, left: pad + px, top: ey });
    sinirUst = Math.max(sinirUst, ey + etiket.h + py + 40);
  }
  if (m.omslag && bicim !== 'kapak') {
    const { default: sharp } = await import('sharp');
    const oh = Math.round((ic * 675) / 1200);
    const top = Math.max(ust, sinirUst - 40);
    katman('omslag', { input: await sharp(m.omslag).resize(ic, oh).png().toBuffer(), left: pad, top });
    sinirUst = top + oh + 56;
  }

  // Alt bant: kırmızı çizgi + logo; story'de sağda yönlendirme.
  const logo = await tekst('tidsrøst', { font: 'TidsrostTung', boy: b.logo, renk: P.logo });
  const logoY = alt - logo.h;
  katman('logo', { input: logo.input, left: pad, top: logoY });
  kutu('logo', pad, logoY - 26, 72, 7, R.rod);
  if (b.cta) {
    const c = await tekst(b.cta, { font: 'TidsrostSemi', boy: 40, renk: P.ikincil });
    katman('cta', { input: c.input, left: W - pad - c.w, top: alt - c.h });
  }
  const metinAlt = logoY - 26 - b.metinBosluk;

  const kick = kicker ? await tekst(kicker.toLocaleUpperCase('nb-NO'), { font: 'TidsrostTung', boy: b.kick, renk: R.hvit }) : null;
  const kickAra = 40;
  const altT = altBaslik ? await tekst(altBaslik, { font: 'TidsrostSemi', boy: b.altB, renk: P.ikincil, gen: ic, aralik: 6 }) : null;
  const ingT = !altBaslik && b.ing && m.ingress ? await tekst(m.ingress, { font: 'TidsrostBrod', boy: b.ing, renk: P.ikincil, gen: ic, aralik: 10 }) : null;
  // İmzalı yazıda yazar adı başlığın altında, kırmızı.
  const imzaT = imzali ? await tekst(m.forfatter, { font: 'TidsrostTung', boy: b.altB, renk: P.imza }) : null;

  // Metin sığmazsa ana başlık puntosu küçülür (en büyük üçüncü basamağın %80'ine kadar).
  let punto = puntoSec(ana, b.ana);
  let anaT;
  let yuk;
  for (;;) {
    anaT = await tekst(ana, { font: 'TidsrostTittel', boy: punto, renk: P.baslik, gen: ic, aralik: -Math.round(punto * 0.08) });
    yuk = (kick ? kick.h + kickAra : 0) + anaT.h + (altT ? 28 + altT.h : 0) + (ingT ? 36 + ingT.h : 0) + (imzaT ? 36 + imzaT.h : 0);
    if (metinAlt - yuk >= sinirUst || punto <= b.ana[2] * 0.8) break;
    punto -= 6;
  }

  let y = metinAlt - yuk;
  if (!m.omslag || bicim === 'kapak') {
    const k = b.kontur;
    const doku = konturlar({ cx: W * k.cx, cy: Math.min(H * k.cy, y - 40), rx: k.rx, ry: k.ry, adet: k.adet, tohum: m.tohum ?? m.tittel, kalin: k.kalin, renk: P.doku });
    svg += doku;
    zemin += doku;
  }
  if (kick) {
    const px = Math.round(kick.h * 0.32);
    const py = Math.round(kick.h * 0.18);
    kutu('kick', pad, y - py, kick.w + 2 * px, kick.h + 2 * py, R.rod);
    katman('kick', { input: kick.input, left: pad + px, top: y });
    y += kick.h + kickAra;
  }
  katman('ana', { input: anaT.input, left: pad, top: y });
  y += anaT.h;
  if (altT) { y += 28; katman('alt', { input: altT.input, left: pad, top: y }); y += altT.h; }
  if (ingT) { y += 36; katman('ing', { input: ingT.input, left: pad, top: y }); y += ingT.h; }
  if (imzaT) { y += 36; katman('imza', { input: imzaT.input, left: pad, top: y }); }

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`,
    katmanlar,
    canli: { W, H, zemin, parcalar },
  };
}

// Veri kapakları (bilde.mjs kursgraf, tallkort) aynı renkleri, yazı tiplerini ve dokuyu kullanır.
export const fjordAraclari = { R, tekst, konturlar };
