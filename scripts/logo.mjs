// Yayıncı logosu (schema.org publisher.logo): sitenin kendi yazı logosundan türetilir, yeni bir logo değildir.
// Başlıktaki logoyla aynı: "tidsrøst", Archivo 800, ø su mavisi (src/styles/global.css .logo ve --water).
// Google, haber yayıncısı logosu için dikdörtgen ve en az 600×60 px ister; çıktı tam 600×60 PNG'dir.
// Yeniden üretmek için: node scripts/logo.mjs  →  public/logo-600x60.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HER = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.join(HER, 'nyheter/fonts/Archivo.ttf');
const UT = path.join(HER, '../public/logo-600x60.png');
const [B, H] = [600, 60];
const MUREKKEP = '#16191c'; // --ink
const SU = '#1f5f99'; // --water
const KAGIT = '#fdfdfb'; // --paper

const markup = `<span foreground="${MUREKKEP}" font_weight="800" letter_spacing="-1400">tidsr<span foreground="${SU}">ø</span>st</span>`;
const { data, info } = await sharp({ text: { text: markup, font: 'Archivo 64', fontfile: FONT, rgba: true, dpi: 72 } })
  .png()
  .toBuffer({ resolveWithObject: true });
// Yazı, yüksekliğe sığacak biçimde küçültülüp sola hizalanır (logo alanının solundan başlar).
const yazi = info.height > H - 8 ? await sharp(data).resize({ height: H - 8 }).png().toBuffer() : data;
const meta = await sharp(yazi).metadata();
await sharp({ create: { width: B, height: H, channels: 4, background: KAGIT } })
  .composite([{ input: yazi, left: 4, top: Math.round((H - meta.height) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(UT);
console.log(`${UT} (${B}×${H}, yazı ${meta.width}×${meta.height})`);
