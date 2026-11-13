// Liste kapağı (1200×675): Morgen-/Ettermiddags-/Kveldsoversikt ve Dagens oppsummering. Fjord dili (fjord.mjs):
// koyu fjord mavisi zemin, eş yükselti dokusu, büyük beyaz başlık, altında haber başlıkları; maddeler arasında ince
// çizgi, kırmızı imleç, altta kırmızı çizgi + logo. Kapak kuralı sürer: tarih, kaynak, kategori çizilmez.
// Başlık kesilmez ("…" yok): sığmayan madde kapağa girmez, "+N saker til" satırına eklenir.
import { fontlariDenetle, konturlar, tekst, R } from './fjord.mjs';

const W = 1200;
const H = 675;
const PAD = 64;
const CIZGI = '#3a6a94';

/** @returns {Promise<{ png: Buffer, ogeler: string[], kalan: number }>} */
export async function listeKart({ tittel, basliklar, toplam = basliklar.length, tohum = tittel }) {
  await fontlariDenetle();
  const { default: sharp } = await import('sharp');
  const katmanlar = [];
  let svg = `<rect width="${W}" height="${H}" fill="${R.fjord}"/>`;
  svg += konturlar({ cx: W * 0.86, cy: H * 0.08, rx: 470, ry: 290, adet: 14, tohum, kalin: 0.9 });

  const baslik = await tekst(tittel, { font: 'TidsrostTittel', boy: 80, renk: R.hvit, aralik: -6 });
  katmanlar.push({ input: baslik.input, left: PAD - 2, top: 44 });

  const logo = await tekst('tidsrøst', { font: 'TidsrostTung', boy: 34, renk: R.hvit });
  const logoY = 627 - logo.h;
  katmanlar.push({ input: logo.input, left: PAD, top: logoY });
  svg += `<rect x="${PAD}" y="${logoY - 26}" width="72" height="7" fill="${R.rod}"/>`;

  const listeUst = 44 + baslik.h + 30;
  const listeAlt = logoY - 26 - 34;
  const genislik = W - 2 * PAD - 30;
  const ara = 16;
  const daha = (n) => tekst(`+${n} ${n === 1 ? 'sak' : 'saker'} til`, { font: 'TidsrostSemi', boy: 26, renk: R.lys });

  // Maddeler sırayla denenir; sonraki madde (ve gerekirse "+N" satırı) sığmıyorsa liste orada biter.
  const ogeler = [];
  let y = listeUst;
  for (const b of basliklar) {
    const t = await tekst(b, { font: 'TidsrostSemi', boy: 32, renk: R.hvit, gen: genislik, aralik: 4 });
    if (t.h > 90) continue; // üç satıra taşan başlık kapağa girmez
    const kalanSonra = toplam - ogeler.length - 1;
    const dahaH = kalanSonra > 0 ? 14 + (await daha(kalanSonra)).h : 0;
    if (y + ara + t.h + ara + dahaH > listeAlt) break;
    svg += `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="1.5" fill="${CIZGI}"/>`;
    svg += `<rect x="${PAD}" y="${y + ara + 12}" width="10" height="10" fill="${R.rod}"/>`;
    katmanlar.push({ input: t.input, left: PAD + 30, top: y + ara });
    y += ara + t.h + ara;
    ogeler.push(b);
  }
  if (ogeler.length) svg += `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="1.5" fill="${CIZGI}"/>`;
  const kalan = toplam - ogeler.length;
  if (kalan > 0) {
    const d = await daha(kalan);
    katmanlar.push({ input: d.input, left: PAD + 30, top: y + 14 });
  }

  const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`))
    .composite(katmanlar)
    .png()
    .toBuffer();
  return { png, ogeler, kalan };
}
