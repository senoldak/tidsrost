// Liste kapağı: Morgen-/Ettermiddags-/Kveldsoversikt ve Dagens oppsummering. Fjord dili (fjord.mjs):
// koyu fjord mavisi zemin, eş yükselti dokusu, büyük beyaz başlık, altında haber başlıkları; maddeler arasında ince
// çizgi, kırmızı imleç, altta kırmızı çizgi + logo. Kapak kuralı sürer: tarih, kaynak, kategori çizilmez.
// Başlık kesilmez ("…" yok): sığmayan madde kapağa girmez, "+N saker til" satırına eklenir.
// İki biçim: kapak 1200×675 (site, Telegram) ve dikey 1080×1350 (LinkedIn akışında daha çok yer kaplar).
import { fontlariDenetle, konturlar, tekst, R } from './fjord.mjs';

const CIZGI = '#3a6a94';
export const BICIMLER = {
  kapak: { W: 1200, H: 675, pad: 64, ust: 44, baslik: 80, madde: 32, maddeH: 90, ara: 16, logo: 34, logoAlt: 627, daha: 26, kontur: { rx: 470, ry: 290, adet: 14 } },
  dikey: { W: 1080, H: 1350, pad: 80, ust: 110, baslik: 96, madde: 42, maddeH: 160, ara: 26, logo: 46, logoAlt: 1260, daha: 32, kontur: { rx: 560, ry: 400, adet: 16 } },
};

/** @returns {Promise<{ png: Buffer, ogeler: string[], kalan: number }>} */
export async function listeKart({ tittel, basliklar, toplam = basliklar.length, tohum = tittel, bicim = 'kapak' }) {
  const b = BICIMLER[bicim];
  const { W, H, pad: PAD } = b;
  await fontlariDenetle();
  const { default: sharp } = await import('sharp');
  const katmanlar = [];
  let svg = `<rect width="${W}" height="${H}" fill="${R.fjord}"/>`;
  svg += konturlar({ cx: W * 0.86, cy: H * 0.08, ...b.kontur, tohum, kalin: 0.9 });

  const baslik = await tekst(tittel, { font: 'TidsrostTittel', boy: b.baslik, renk: R.hvit, aralik: -Math.round(b.baslik * 0.075), gen: W - 2 * PAD });
  katmanlar.push({ input: baslik.input, left: PAD - 2, top: b.ust });

  const logo = await tekst('tidsrøst', { font: 'TidsrostTung', boy: b.logo, renk: R.hvit });
  const logoY = b.logoAlt - logo.h;
  katmanlar.push({ input: logo.input, left: PAD, top: logoY });
  svg += `<rect x="${PAD}" y="${logoY - 26}" width="72" height="7" fill="${R.rod}"/>`;

  const listeUst = b.ust + baslik.h + 30;
  const listeAlt = logoY - 26 - 34;
  const genislik = W - 2 * PAD - 30;
  const ara = b.ara;
  const daha = (n) => tekst(`+${n} ${n === 1 ? 'sak' : 'saker'} til`, { font: 'TidsrostSemi', boy: b.daha, renk: R.lys });
  const imlec = Math.round(b.madde * 0.3);

  // Maddeler sırayla denenir; sonraki madde (ve gerekirse "+N" satırı) sığmıyorsa liste orada biter.
  const ogeler = [];
  let y = listeUst;
  for (const m of basliklar) {
    const t = await tekst(m, { font: 'TidsrostSemi', boy: b.madde, renk: R.hvit, gen: genislik, aralik: 4 });
    if (t.h > b.maddeH) continue; // çok satıra taşan başlık kapağa girmez
    const kalanSonra = toplam - ogeler.length - 1;
    const dahaH = kalanSonra > 0 ? 14 + (await daha(kalanSonra)).h : 0;
    if (y + ara + t.h + ara + dahaH > listeAlt) break;
    svg += `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="1.5" fill="${CIZGI}"/>`;
    svg += `<rect x="${PAD}" y="${y + ara + Math.round(b.madde * 0.38)}" width="${imlec}" height="${imlec}" fill="${R.rod}"/>`;
    katmanlar.push({ input: t.input, left: PAD + 30, top: y + ara });
    y += ara + t.h + ara;
    ogeler.push(m);
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
