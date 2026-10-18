// Haberin Fjord story kartından 8 saniyelik Reels videosu (1080×1920, 30 kare/sn, H.264 + sessiz AAC) üretir.
// Ücretsiz: kareler sharp ile çizilir, ffmpeg ile birleşir (GitHub ubuntu-latest'te kurulu; yerelde FFMPEG ile yol verilir).
// Hareket: zemin dokusu yavaşça yakınlaşır, parçalar sırayla aşağıdan süzülerek belirir; son 3 saniye sabit (döngüde okunur).
// Kullanım: node scripts/sosial/reels.mjs [haber-id] [--cikis dosya.mp4]
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fjordKart } from '../nyheter/fjord.mjs';
import { DIZIN, sakerOku } from './saker.mjs';

const FPS = 30;
const SURE = 8;
// Rolün belirme anı (sn). Logo baştan görünür; başlık erken gelir ki akışta kaydıran okur ilk saniyede yakalasın.
const GIRIS = { logo: 0, omslag: 0.15, etiket: 0.3, kick: 0.45, ana: 0.7, alt: 1.5, ing: 1.5, imza: 1.9, cta: 2.3 };
const GECIS = 0.55;
const KAYMA = 48;

const yumusak = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

async function boyut(input) {
  const { default: sharp } = await import('sharp');
  const { width, height } = await sharp(input).metadata();
  return { w: width, h: height };
}

/** Kare kare SVG üretir: zemin + her parça kendi anında saydamlık ve kaymayla. */
async function kareUretici(kart) {
  const { W, H, zemin, parcalar } = kart.canli;
  const hazir = await Promise.all(parcalar.map(async (p) => {
    if (p.rect) return { ...p };
    const { w, h } = await boyut(p.input);
    return { ...p, w, h, uri: `data:image/png;base64,${Buffer.from(p.input).toString('base64')}` };
  }));
  return (t) => {
    // Zemin %4 yakınlaşır (alt-sol köşe sabit kalacak şekilde merkezden).
    const z = 1 + 0.04 * (t / SURE);
    let o = `<g transform="translate(${(W * (1 - z)) / 2} ${(H * (1 - z)) / 2}) scale(${z})">${zemin}</g>`;
    for (const p of hazir) {
      const a = yumusak((t - (GIRIS[p.rol] ?? 0)) / GECIS);
      if (a <= 0) continue;
      const dy = (1 - a) * KAYMA;
      if (p.rect) {
        const { x, y, w, h, fill } = p.rect;
        // Kırmızı kutular soldan açılır.
        o += `<rect x="${x}" y="${y}" width="${(w * a).toFixed(1)}" height="${h}" fill="${fill}"/>`;
      } else {
        o += `<image href="${p.uri}" x="${p.left}" y="${(p.top + dy).toFixed(1)}" width="${p.w}" height="${p.h}" opacity="${a.toFixed(3)}"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o}</svg>`;
  };
}

/**
 * @param {{ id: string, tittel: string, ingress?: string, forfatter?: string, sjanger?: string, gorselKapak?: boolean }} s
 * @param {string} cikis mp4 yolu
 */
export async function reelsCiz(s, cikis) {
  const { default: sharp } = await import('sharp');
  const omslag = s.gorselKapak ? await readFile(path.join(DIZIN, s.id, 'cover.png')) : undefined;
  const kart = await fjordKart({ tittel: s.tittel, ingress: s.ingress, tohum: s.id, omslag, forfatter: s.forfatter, sjanger: s.sjanger }, 'reels');
  const kare = await kareUretici(kart);
  const { W, H } = kart.canli;

  const ff = spawn(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', cikis,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const bitti = new Promise((ok, red) => {
    ff.on('error', red);
    ff.on('close', (kod) => (kod === 0 ? ok() : red(new Error(`ffmpeg çıkış kodu ${kod}`))));
  });

  for (let i = 0; i < FPS * SURE; i++) {
    const buf = await sharp(Buffer.from(kare(i / FPS))).removeAlpha().raw().toBuffer();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await bitti;
  return cikis;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const ci = arg.indexOf('--cikis');
  const cikis = ci >= 0 ? arg[ci + 1] : null;
  const id = arg.find((a, i) => !a.startsWith('--') && i !== ci + 1);
  const saker = (await sakerOku()).filter((s) => !s.taslak && s.tittel).sort((a, b) => b.dato - a.dato);
  const s = id ? saker.find((x) => x.id === id) : saker[0];
  if (!s) throw new Error(`Haber bulunamadı: ${id}`);
  const yol = cikis ?? `${s.id.replace(/\//g, '-')}-reels.mp4`;
  const t0 = Date.now();
  await reelsCiz(s, yol);
  console.log(`reels: ${yol} (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
}
