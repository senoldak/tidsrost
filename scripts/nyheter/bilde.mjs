// Haber kapakları: görseli bot kendi verisinden çizer (harita, grafik, kart), dışarıdan fotoğraf alınmaz.
// Böylece telif ya da atıf derdi olmaz; sadece harita altlığı ve sınırlar için kaynak yazılır.
// Her fonksiyon 1200×675 (16:9) SVG döner; skrivSak bunu sharp ile PNG'ye çevirir.
import { readFile } from 'node:fs/promises';
import { hentJson, sleep } from './lib.mjs';

const B = 1200;
const H = 675;
const FONT_SERIF = "Georgia, 'DejaVu Serif', serif";
const FONT_SANS = "'Segoe UI', 'DejaVu Sans', Arial, sans-serif";

const FARGE = {
  bg: '#f7f6f4',
  tekst: '#1c1917',
  dempet: '#6b6560',
  linje: '#d6d3d1',
  aksent: '#1d4f91',
  hav: '#d9e4ec',
  land: '#ebe7df',
  norge: '#f8f6f1',
  grense: '#b6ada0',
};

// Uyarı seviyelerinin renkleri (MET/NVE ile aynı anlam).
export const VARSELFARGE = {
  gul: { fyll: '#f7d23e', strek: '#a8860a' },
  oransje: { fyll: '#f39a1d', strek: '#a85a00' },
  rod: { fyll: '#d7262e', strek: '#8c0f15' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tall = (n, d = 2) => n.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });

// Metni yaklaşık karakter genişliğine göre satırlara böler.
function brytLinjer(tekst, maksTegn, maksLinjer) {
  const linjer = [];
  let linje = '';
  for (const ord of String(tekst).split(/\s+/)) {
    if (linje && (linje + ' ' + ord).length > maksTegn) {
      linjer.push(linje);
      linje = ord;
    } else linje = linje ? `${linje} ${ord}` : ord;
  }
  if (linje) linjer.push(linje);
  if (linjer.length > maksLinjer) {
    linjer.length = maksLinjer;
    linjer[maksLinjer - 1] = linjer[maksLinjer - 1].replace(/\s*\S*$/, '') + ' …';
  }
  return linjer;
}

const svg = (innhold) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">${innhold}</svg>`;

// ── Harita ─────────────────────────────────────────────────────────────

// Lambert eşit alan izdüşümü, Norveç ortasında; km cinsinden x/y (y aşağı doğru).
const RAD = Math.PI / 180;
const LON0 = 15 * RAD;
const LAT0 = 64 * RAD;
function proj([lon, lat]) {
  const l = lon * RAD - LON0;
  const f = lat * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(f) + Math.cos(LAT0) * Math.cos(f) * Math.cos(l)));
  return [6371 * k * Math.cos(f) * Math.sin(l), -6371 * k * (Math.cos(LAT0) * Math.sin(f) - Math.sin(LAT0) * Math.cos(f) * Math.cos(l))];
}

let nordkart;
async function lesNordkart() {
  nordkart ??= JSON.parse(await readFile(new URL('./kart/nordkart.json', import.meta.url), 'utf8'));
  return nordkart;
}

// Halkalar → SVG path; ekranda yarım pikselden yakın noktalar atlanır.
function sti(ringer, tilSkjerm) {
  let d = '';
  for (const ring of ringer) {
    let forrige;
    let del = '';
    let n = 0;
    for (const p of ring) {
      const [x, y] = tilSkjerm(proj(p));
      if (forrige && Math.abs(x - forrige[0]) < 0.5 && Math.abs(y - forrige[1]) < 0.5) continue;
      del += `${n ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      forrige = [x, y];
      n++;
    }
    if (n >= 3) d += `${del}Z`;
  }
  return d;
}

// GeoJSON geometrisini dış halkalar listesine çevirir (delikler küçük ölçekte önemsiz).
export function ringerFra(geometri) {
  if (!geometri) return [];
  if (geometri.type === 'Polygon') return [geometri.coordinates[0]];
  if (geometri.type === 'MultiPolygon') return geometri.coordinates.map((p) => p[0]);
  if (geometri.type === 'GeometryCollection') return geometri.geometries.flatMap(ringerFra);
  return [];
}

// Uyarı bölgesinin haritası: bölge vurgulanır, köşede seviye ve olay yazılır.
// omrade: [lon, lat] halkaları; niva: 'gul' | 'oransje' | 'rod'; tittel: "Gult farevarsel"; undertittel: "Snø"
// klippTilLand: kara uyarılarında (sel, heyelan, kar) alan Norveç kıyı çizgisine kırpılır;
// kommune sınırları denize de uzandığı için aksi hâlde alan denize taşar.
export async function varselkart({ omrade, niva, tittel, undertittel, kilde, klippTilLand = false }) {
  const kart = await lesNordkart();
  const farge = VARSELFARGE[niva] ?? VARSELFARGE.gul;
  const punkter = omrade.flat().map(proj);
  if (!punkter.length) throw new Error('varselkart: tomt område');
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of punkter) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];

  // Görünüm: bölge + kenar payı, en az ~700 km genişlik, 16:9'a tamamlanır.
  // Sol alttaki etiket kutusu bölgeyi örtmesin diye görünüm biraz sola ve aşağı kaydırılır.
  let w = Math.max((x1 - x0) * 2, 700);
  let h = Math.max((y1 - y0) * 1.5, 300);
  if (w / h > B / H) h = (w * H) / B;
  else w = (h * B) / H;
  const cx = (x0 + x1) / 2 - w * 0.14;
  const cy = (y0 + y1) / 2 + h * 0.08;
  const skala = B / w;
  const tilSkjerm = ([x, y]) => [(x - (cx - w / 2)) * skala, (y - (cy - h / 2)) * skala];

  const land = kart.land
    .map((l) => `<path d="${sti(l.ringer, tilSkjerm)}" fill="${l.kode === 'NOR' ? FARGE.norge : FARGE.land}" stroke="${FARGE.grense}" stroke-width="1.2" stroke-linejoin="round"/>`)
    .join('');
  const norge = kart.land.find((l) => l.kode === 'NOR').ringer;
  const klipp = klippTilLand ? `<clipPath id="norge"><path d="${sti(norge, tilSkjerm)}"/></clipPath>` : '';
  const varsel = `${klipp}<path d="${sti(omrade, tilSkjerm)}"${klippTilLand ? ' clip-path="url(#norge)"' : ''} fill="${farge.fyll}" fill-opacity="0.8" stroke="${farge.strek}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // Yakın plan haritalarda sağ üstte bütün Norveç ve bakılan bölge gösterilir.
  let innfelt = '';
  if (w < 1600) {
    const np = norge.flat().map(proj);
    const [a0, b0] = [Math.min(...np.map((p) => p[0])), Math.min(...np.map((p) => p[1]))];
    const [a1, b1] = [Math.max(...np.map((p) => p[0])), Math.max(...np.map((p) => p[1]))];
    const ih = 230;
    const s = ih / (b1 - b0);
    const iw = (a1 - a0) * s;
    const ix = B - iw - 36;
    const iy = 28;
    const tilInnfelt = ([x, y]) => [ix + (x - a0) * s, iy + (y - b0) * s];
    const [rx, ry] = tilInnfelt([cx - w / 2, cy - h / 2]);
    innfelt = `<clipPath id="innfelt"><rect x="${ix - 14}" y="${iy - 14}" width="${iw + 28}" height="${ih + 28}" rx="10"/></clipPath>
<rect x="${ix - 14}" y="${iy - 14}" width="${iw + 28}" height="${ih + 28}" rx="10" fill="#ffffff" stroke="${FARGE.linje}"/>
<g clip-path="url(#innfelt)">
<path d="${sti(norge, tilInnfelt)}" fill="${FARGE.land}" stroke="${FARGE.grense}" stroke-width="0.6"/>
<path d="${sti(omrade, tilInnfelt)}" fill="${farge.fyll}" stroke="${farge.strek}" stroke-width="0.8"/>
<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${(w * s).toFixed(1)}" height="${(h * s).toFixed(1)}" fill="none" stroke="${FARGE.tekst}" stroke-width="1.5"/>
</g>`;
  }

  // Sol alt etiket kutusu: renk karesi + seviye, altında olay, en altta kaynak.
  const under = brytLinjer(undertittel, 26, 2);
  const boksH = 190 + (under.length - 1) * 48;
  const t = H - 32 - boksH;
  const etikett = `<g>
<rect x="32" y="${t}" width="620" height="${boksH}" rx="12" fill="#ffffff" fill-opacity="0.94" stroke="${FARGE.linje}"/>
<rect x="56" y="${t + 26}" width="44" height="44" rx="6" fill="${farge.fyll}" stroke="${farge.strek}" stroke-width="2"/>
<text x="116" y="${t + 64}" font-family="${FONT_SANS}" font-size="46" font-weight="700" fill="${FARGE.tekst}">${esc(tittel)}</text>
${under.map((l, i) => `<text x="56" y="${t + 122 + i * 48}" font-family="${FONT_SANS}" font-size="40" fill="${FARGE.tekst}">${esc(l)}</text>`).join('')}
<text x="56" y="${t + boksH - 22}" font-family="${FONT_SANS}" font-size="22" fill="${FARGE.dempet}">${esc(kilde)}</text>
</g>`;

  return svg(`<rect width="${B}" height="${H}" fill="${FARGE.hav}"/>${land}${varsel}${innfelt}${etikett}`);
}

// Kartverket'ten kommune sınırları (CC BY 4.0, "© Kartverket"); NVE uyarıları kommune listesiyle gelir.
export async function kommuneOmrader(kommunenumre) {
  const ringer = [];
  for (const nr of [...new Set(kommunenumre)]) {
    if (!/^\d{4}$/.test(nr)) continue;
    const data = await hentJson(`https://ws.geonorge.no/kommuneinfo/v1/kommuner/${nr}/omrade?utkoordsys=4258`);
    ringer.push(...ringerFra(data.omrade));
    await sleep(150);
  }
  return ringer;
}

// ── Kur grafiği ────────────────────────────────────────────────────────

const MND = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
const kortDato = (iso) => `${Number(iso.slice(8, 10))}. ${MND[Number(iso.slice(5, 7)) - 1]}`;

// Yan yana küçük grafikler: her para birimi kendi ölçeğinde (ör. euro ve dolar).
// serier: [{ navn: '1 euro', punkter: [{ dato: '2026-10-09', verdi: 10.72 }] }]
export function kursgraf({ serier, tittel }) {
  const pad = 48;
  const gap = 40;
  const pw = (B - pad * 2 - gap * (serier.length - 1)) / serier.length;
  const top = 150;
  const bunn = H - 70;
  const paneler = serier.map((s, i) => {
    const x0 = pad + i * (pw + gap);
    const verdier = s.punkter.map((p) => p.verdi);
    let [lo, hi] = [Math.min(...verdier), Math.max(...verdier)];
    const marg = Math.max((hi - lo) * 0.15, hi * 0.002);
    lo -= marg;
    hi += marg;
    const gx0 = x0 + 4;
    const gx1 = x0 + pw - 72;
    const gy0 = top + 120;
    const gy1 = bunn - 40;
    const px = (j) => gx0 + ((gx1 - gx0) * j) / Math.max(1, s.punkter.length - 1);
    const py = (v) => gy1 - ((v - lo) / (hi - lo)) * (gy1 - gy0);
    const linje = s.punkter.map((p, j) => `${j ? 'L' : 'M'}${px(j).toFixed(1)} ${py(p.verdi).toFixed(1)}`).join('');
    const flate = `${linje}L${gx1} ${gy1}L${gx0} ${gy1}Z`;
    const siste = s.punkter.at(-1);
    const første = s.punkter[0];
    // Y ekseni değerleri: küçük oynamalar abartılı görünmesin diye ölçek açıkça yazılır.
    const steg = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].find((t) => (hi - lo) / t <= 4) ?? 10;
    const ticks = [];
    for (let v = Math.ceil(lo / steg) * steg; v <= hi; v += steg) ticks.push(v);
    const desimaler = steg < 0.1 ? 2 : steg < 1 ? 1 : 0;
    const rutenett = ticks
      .map((v) => `<line x1="${gx0}" y1="${py(v).toFixed(1)}" x2="${gx1}" y2="${py(v).toFixed(1)}" stroke="${FARGE.linje}" stroke-width="1" stroke-dasharray="4 6"/>
<text x="${x0 + pw}" y="${(py(v) + 7).toFixed(1)}" text-anchor="end" font-family="${FONT_SANS}" font-size="20" fill="${FARGE.dempet}">${tall(v, desimaler)}</text>`)
      .join('');
    return `<g>
<text x="${x0}" y="${top}" font-family="${FONT_SANS}" font-size="30" fill="${FARGE.dempet}">${esc(s.navn)}</text>
<text x="${x0}" y="${top + 62}" font-family="${FONT_SERIF}" font-size="60" font-weight="700" fill="${FARGE.tekst}">${tall(siste.verdi)} kr</text>
${rutenett}
<line x1="${gx0}" y1="${gy1}" x2="${gx1}" y2="${gy1}" stroke="${FARGE.linje}" stroke-width="2"/>
<path d="${flate}" fill="${FARGE.aksent}" fill-opacity="0.1"/>
<path d="${linje}" fill="none" stroke="${FARGE.aksent}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${px(s.punkter.length - 1)}" cy="${py(siste.verdi)}" r="7" fill="${FARGE.aksent}"/>
<text x="${gx0}" y="${bunn}" font-family="${FONT_SANS}" font-size="24" fill="${FARGE.dempet}">${kortDato(første.dato)}</text>
<text x="${gx1}" y="${bunn}" text-anchor="end" font-family="${FONT_SANS}" font-size="24" fill="${FARGE.dempet}">${kortDato(siste.dato)}</text>
</g>`;
  });
  return svg(`<rect width="${B}" height="${H}" fill="${FARGE.bg}"/>
<text x="${pad}" y="74" font-family="${FONT_SERIF}" font-size="44" font-weight="700" fill="${FARGE.tekst}">${esc(tittel)}</text>
<line x1="${pad}" y1="100" x2="${B - pad}" y2="100" stroke="${FARGE.linje}" stroke-width="2"/>
${paneler.join('')}`);
}

// ── Büyük rakam kartı (ör. politika faizi) ─────────────────────────────

export function tallkort({ overlinje, tall: verdi, underlinje }) {
  return svg(`<rect width="${B}" height="${H}" fill="${FARGE.bg}"/>
<rect x="0" y="0" width="16" height="${H}" fill="${FARGE.aksent}"/>
<text x="96" y="200" font-family="${FONT_SANS}" font-size="40" fill="${FARGE.dempet}">${esc(overlinje)}</text>
<text x="88" y="420" font-family="${FONT_SERIF}" font-size="220" font-weight="700" fill="${FARGE.tekst}">${esc(verdi)}</text>
<text x="96" y="530" font-family="${FONT_SANS}" font-size="40" fill="${FARGE.tekst}">${esc(underlinje)}</text>`);
}

// ── Genel kart (fotoğrafı ve verisi olmayan haberler) ──────────────────

// Tipografik kapak: kategori, büyük harflerle kaynak (ör. "Finansdepartementet"), altta site adı.
export function kildekort({ kategori, avsender, underlinje }) {
  const linjer = brytLinjer(avsender, 22, 3);
  const str = linjer.length > 2 ? 64 : 80;
  const y0 = H / 2 - ((linjer.length - 1) * str * 1.15) / 2 + str * 0.35;
  return svg(`<rect width="${B}" height="${H}" fill="${FARGE.aksent}"/>
<circle cx="${B - 60}" cy="-40" r="380" fill="#ffffff" fill-opacity="0.05"/>
<circle cx="${B - 60}" cy="-40" r="250" fill="#ffffff" fill-opacity="0.05"/>
<text x="88" y="110" font-family="${FONT_SANS}" font-size="30" font-weight="700" letter-spacing="4" fill="#ffffff" fill-opacity="0.75">${esc(kategori.toUpperCase())}</text>
${linjer.map((l, i) => `<text x="84" y="${(y0 + i * str * 1.15).toFixed(0)}" font-family="${FONT_SERIF}" font-size="${str}" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('')}
${underlinje ? `<text x="88" y="${(y0 + (linjer.length - 1) * str * 1.15 + 70).toFixed(0)}" font-family="${FONT_SANS}" font-size="32" fill="#ffffff" fill-opacity="0.8">${esc(brytLinjer(underlinje, 50, 1)[0])}</text>` : ''}
<text x="88" y="${H - 64}" font-family="${FONT_SERIF}" font-size="36" fill="#ffffff" fill-opacity="0.85">tidsrøst</text>`);
}

// ── PNG'ye çevirme ─────────────────────────────────────────────────────

// sharp yoksa (npm ci yapılmamışsa) null döner; haber görselsiz yazılır.
export async function tilPng(svgTekst) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.warn('  sharp bulunamadı, kapak resmi atlanıyor');
    return null;
  }
  return sharp(Buffer.from(svgTekst)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}
