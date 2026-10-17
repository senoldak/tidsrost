// Haber kapakları: görseli bot kendi verisinden çizer (harita, grafik, kart), dışarıdan fotoğraf alınmaz.
// Böylece telif ya da atıf derdi olmaz; sadece harita altlığı ve sınırlar için kaynak yazılır.
// Her fonksiyon 1200×675 (16:9) SVG döner; skrivSak bunu sharp ile PNG'ye çevirir.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentJson, sleep } from './lib.mjs';
import { fjordKart } from './fjord.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HER, 'fonts');

const B = 1200;
const H = 675;

// Typografi tilpasset Kartverket N50-pafta og tidsrøst DESIGN.md
const FONT_SANS = "'Archivo Variable', 'Archivo', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif";
const FONT_SERIF = "'Source Serif 4 Variable', 'Source Serif 4', Georgia, 'Times New Roman', serif";

const FARGE = {
  bg: '#fdfdfb',         // Kartpapir (map paper)
  tekst: '#16191c',      // Trykksverte (survey ink)
  tekst2: '#2f353a',     // Sekundær sverte
  dempet: '#5a6168',     // Dempet grå
  linje: '#16191c',      // 1px ink rule
  delestrek: '#dcded8',  // Delestrek
  aksent: '#1f5f99',     // Havblå (water blue)
  hav: '#edf3f8',        // Havflate (cartographic maritime tint)
  havDyp: '#e2edf5',     // Dypere hav
  landNorge: '#fdfdfb',  // Fastlands-Norge og Svalbard
  landNabo: '#f4efe6',   // Naboland (Sverige, Finland, Grønland osv.)
  innsjo: '#edf3f8',     // Innsjøer
  kyst: '#628fae',       // Kystlinje
  grense: '#b5aca0',     // Riksgrenser
  rutenett: '#c2d5e3',   // Enlem/boylam şebekesi (graticule)
  ramme: '#16191c',      // Ytterramme (neatline)
};

// Uyarı seviyelerinin resmi renkleri (MET / NVE / Varsom).
export const VARSELFARGE = {
  gul: {
    fyll: '#f2c400',
    fyllOpacity: 0.36,
    strek: '#8c6e00',
    hatch: '#b89400',
    badge: '#f2c400',
    tekst: '#16191c',
  },
  oransje: {
    fyll: '#f08a00',
    fyllOpacity: 0.40,
    strek: '#a34800',
    hatch: '#c76600',
    badge: '#f08a00',
    tekst: '#ffffff',
  },
  rod: {
    fyll: '#d9261c',
    fyllOpacity: 0.46,
    strek: '#8c120a',
    hatch: '#b31810',
    badge: '#d9261c',
    tekst: '#ffffff',
  },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

// ── Kartprojeksjon & Geometri ──────────────────────────────────────────

// Lambert eşit alan izdüşümü (Norveç merkezli 15°Ø, 64°N); km cinsinden x/y (y aşağı doğru).
const RAD = Math.PI / 180;
const LON0 = 15 * RAD;
const LAT0 = 64 * RAD;
function proj([lon, lat]) {
  const l = lon * RAD - LON0;
  const f = lat * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(f) + Math.cos(LAT0) * Math.cos(f) * Math.cos(l)));
  return [
    6371 * k * Math.cos(f) * Math.sin(l),
    -6371 * k * (Math.cos(LAT0) * Math.sin(f) - Math.sin(LAT0) * Math.cos(f) * Math.cos(l)),
  ];
}

const STEDER = [
  { navn: 'Oslo', lon: 10.75, lat: 59.91, stor: true },
  { navn: 'Bergen', lon: 5.32, lat: 60.39, stor: true },
  { navn: 'Trondheim', lon: 10.39, lat: 63.43, stor: true },
  { navn: 'Stavanger', lon: 5.73, lat: 58.97, stor: true },
  { navn: 'Kristiansand', lon: 8.00, lat: 58.15, stor: true },
  { navn: 'Tromsø', lon: 18.96, lat: 69.65, stor: true },
  { navn: 'Bodø', lon: 14.41, lat: 67.28, stor: true },
  { navn: 'Ålesund', lon: 6.15, lat: 62.47, stor: true },
  { navn: 'Alta', lon: 23.27, lat: 69.97, stor: true },
  { navn: 'Longyearbyen', lon: 15.65, lat: 78.22, stor: true },
  { navn: 'Drammen', lon: 10.20, lat: 59.74 },
  { navn: 'Fredrikstad', lon: 10.93, lat: 59.22 },
  { navn: 'Skien', lon: 9.61, lat: 59.21 },
  { navn: 'Haugesund', lon: 5.27, lat: 59.41 },
  { navn: 'Lillehammer', lon: 10.47, lat: 61.11 },
  { navn: 'Hamar', lon: 11.07, lat: 60.80 },
  { navn: 'Førde', lon: 5.85, lat: 61.45 },
  { navn: 'Molde', lon: 7.16, lat: 62.74 },
  { navn: 'Kristiansund', lon: 7.73, lat: 63.11 },
  { navn: 'Røros', lon: 11.38, lat: 62.57 },
  { navn: 'Steinkjer', lon: 11.50, lat: 64.01 },
  { navn: 'Namsos', lon: 11.50, lat: 64.47 },
  { navn: 'Brønnøysund', lon: 12.21, lat: 65.47 },
  { navn: 'Sandnessjøen', lon: 12.63, lat: 66.02 },
  { navn: 'Mo i Rana', lon: 14.14, lat: 66.31 },
  { navn: 'Svolvær', lon: 14.57, lat: 68.23 },
  { navn: 'Narvik', lon: 17.43, lat: 68.44 },
  { navn: 'Harstad', lon: 16.54, lat: 68.80 },
  { navn: 'Finnsnes', lon: 17.98, lat: 69.23 },
  { navn: 'Hammerfest', lon: 23.68, lat: 70.66 },
  { navn: 'Honningsvåg', lon: 25.97, lat: 70.98 },
  { navn: 'Vadsø', lon: 29.75, lat: 70.07 },
  { navn: 'Vardø', lon: 31.11, lat: 70.37 },
  { navn: 'Kirkenes', lon: 30.05, lat: 69.73 },
  { navn: 'Karasjok', lon: 25.51, lat: 69.47 },
  { navn: 'Kautokeino', lon: 23.04, lat: 69.01 },
  { navn: 'Jan Mayen', lon: -8.50, lat: 70.98 },
  { navn: 'Ny-Ålesund', lon: 11.93, lat: 78.92 },
  { navn: 'Stockholm', lon: 18.06, lat: 59.33, naboland: true },
  { navn: 'Göteborg', lon: 11.97, lat: 57.71, naboland: true },
  { navn: 'København', lon: 12.57, lat: 55.68, naboland: true },
  { navn: 'Helsinki', lon: 24.94, lat: 60.17, naboland: true },
  { navn: 'Rovaniemi', lon: 25.72, lat: 66.50, naboland: true },
  { navn: 'Tórshavn', lon: -6.77, lat: 62.01, naboland: true },
  { navn: 'Reykjavík', lon: -21.94, lat: 64.15, naboland: true },
  { navn: 'Murmansk', lon: 33.08, lat: 68.97, naboland: true },
];

const HAV = [
  { navn: 'N O R S K E H A V E T', lon: 3.5, lat: 66.5 },
  { navn: 'B A R E N T S H A V E T', lon: 33.0, lat: 73.5 },
  { navn: 'G R Ø N L A N D S H A V E T', lon: -8.0, lat: 75.0 },
  { navn: 'N O R D S J Ø E N', lon: 3.0, lat: 57.5 },
  { navn: 'S K A G E R R A K', lon: 9.3, lat: 58.0 },
];

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

function stiEnkel(punkter, tilSkjerm) {
  let d = '';
  let forrige;
  let n = 0;
  for (const p of punkter) {
    const [x, y] = tilSkjerm(proj(p));
    if (forrige && Math.abs(x - forrige[0]) < 1 && Math.abs(y - forrige[1]) < 1) continue;
    d += `${n ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    forrige = [x, y];
    n++;
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

// ── Varselkart (Kartverket N50 pafta estetiğinde tehlike haritası) ─────
// omrade: [lon, lat] halkaları; niva: 'gul' | 'oransje' | 'rod'; tittel: "Gult farevarsel"; undertittel: "Snø · Sør-Norge"
// klippTilLand: kara uyarılarında alan Norveç kıyı çizgisine kırpılır.
export async function varselkart({ omrade, niva, tittel, undertittel, kilde, klippTilLand = false }) {
  const kart = await lesNordkart();
  const farge = VARSELFARGE[niva] ?? VARSELFARGE.gul;
  const punkter = omrade.flat().map(proj);
  if (!punkter.length) throw new Error('varselkart: tomt område');

  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of punkter) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }

  // Områdets utstrekning
  const omradeW = x1 - x0;
  const omradeH = y1 - y0;

  // Sikre behagelig kartramme rundt varselet (minst 45% margin)
  const margX = Math.max(omradeW * 0.45, 120);
  const margY = Math.max(omradeH * 0.45, 90);
  let minX = x0 - margX;
  let maxX = x1 + margX;
  let minY = y0 - margY;
  let maxY = y1 + margY;

  // Minste synlige bredde er 580 km slik at lokale varsler får regional kontekst
  let w = Math.max(maxX - minX, 580);
  let h = Math.max(maxY - minY, 320);

  // Tilpass 16:9 proporsjon
  if (w / h > B / H) h = (w * H) / B;
  else w = (h * B) / H;

  // Sentrer direkte over varselområdet
  let cx = (x0 + x1) / 2;
  let cy = (y0 + y1) / 2;

  const skala = B / w;
  const tilSkjerm = ([x, y]) => [(x - (cx - w / 2)) * skala, (y - (cy - h / 2)) * skala];

  // 1. Havflate
  const havBakgrunn = `<rect width="${B}" height="${H}" fill="${FARGE.hav}"/>`;

  // 2. Enlem / Boylam şebekesi (Graticule)
  const latStep = w < 850 ? 2 : 4;
  const lonStep = w < 850 ? 3 : 5;
  const ruteLinjer = [];
  for (let lat = 52; lat <= 82; lat += latStep) {
    const pts = [];
    for (let lon = -30; lon <= 45; lon += 0.8) pts.push([lon, lat]);
    ruteLinjer.push(`<path d="${stiEnkel(pts, tilSkjerm)}" fill="none" stroke="${FARGE.rutenett}" stroke-width="0.7" stroke-dasharray="3 4"/>`);
  }
  for (let lon = -25; lon <= 40; lon += lonStep) {
    const pts = [];
    for (let lat = 50; lat <= 82; lat += 0.6) pts.push([lon, lat]);
    ruteLinjer.push(`<path d="${stiEnkel(pts, tilSkjerm)}" fill="none" stroke="${FARGE.rutenett}" stroke-width="0.7" stroke-dasharray="3 4"/>`);
  }
  const rutenettSvg = `<g opacity="0.85">${ruteLinjer.join('')}</g>`;

  // 3. Havnavn
  const havnavnSvg = HAV.map((h) => {
    const [sx, sy] = tilSkjerm(proj([h.lon, h.lat]));
    if (sx < 60 || sx > B - 60 || sy < 60 || sy > H - 60) return '';
    return `<text x="${sx.toFixed(0)}" y="${sy.toFixed(0)}" text-anchor="middle" font-family="${FONT_SERIF}" font-size="16" font-style="italic" letter-spacing="0.28em" fill="${FARGE.aksent}" fill-opacity="0.45">${esc(h.navn)}</text>`;
  }).filter(Boolean).join('');

  // 4. Landmasser (Norge i papirhvitt, naboland i varm pergament)
  const landSvg = kart.land
    .map((l) => {
      const isNor = l.kode === 'NOR';
      return `<path d="${sti(l.ringer, tilSkjerm)}" fill="${isNor ? FARGE.landNorge : FARGE.landNabo}" stroke="${isNor ? FARGE.kyst : FARGE.grense}" stroke-width="${isNor ? '1.1' : '0.8'}" stroke-linejoin="round"/>`;
    })
    .join('');

  // 5. Innsjøer
  const innsjoSvg = (kart.innsjoer ?? [])
    .map((ring) => `<path d="${sti([ring], tilSkjerm)}" fill="${FARGE.innsjo}" stroke="${FARGE.kyst}" stroke-width="0.7"/>`)
    .join('');

  // 6. Varselområde med kartografisk skravering
  const norgeRinger = kart.land.find((l) => l.kode === 'NOR')?.ringer ?? [];
  const klipp = klippTilLand ? `<clipPath id="norge-kyst"><path d="${sti(norgeRinger, tilSkjerm)}"/></clipPath>` : '';
  const hatchDef = `<pattern id="varsel-hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="10" stroke="${farge.hatch}" stroke-width="2" opacity="0.32" /></pattern>`;

  const varselSti = sti(omrade, tilSkjerm);
  const varselSvg = `${klipp}
<g ${klippTilLand ? 'clip-path="url(#norge-kyst)"' : ''}>
  <path d="${varselSti}" fill="${farge.fyll}" fill-opacity="${farge.fyllOpacity}"/>
  <path d="${varselSti}" fill="url(#varsel-hatch)"/>
  <path d="${varselSti}" fill="none" stroke="${farge.strek}" stroke-width="2.6" stroke-linejoin="round"/>
</g>`;

  // 7. Beregn plassering av kartusj (unngå kollisjon med varselet)
  const varselSkjerm = punkter.map(tilSkjerm);
  const vx0 = Math.min(...varselSkjerm.map((p) => p[0]));
  const vy1 = Math.max(...varselSkjerm.map((p) => p[1]));

  const cartW = 460;
  const cartH = 154;
  const nedeTilVenstreOptatt = vx0 < 480 && vy1 > H - 200;
  const cartX = 26;
  const cartY = nedeTilVenstreOptatt ? 26 : H - 180;

  // 8. Stedsnavn (byer som faller i utsnittet med kartografisk glorie)
  const stederSvg = STEDER.map((s) => {
    const [sx, sy] = tilSkjerm(proj([s.lon, s.lat]));
    if (sx < 30 || sx > B - 30 || sy < 30 || sy > H - 30) return '';
    if (sx >= cartX - 10 && sx <= cartX + cartW + 10 && sy >= cartY - 10 && sy <= cartY + cartH + 10) return '';
    if (sx >= B - 210 && sy <= 245) return '';

    const fontSize = s.stor ? 12 : 10.5;
    const circleR = s.stor ? 3.2 : 2.4;
    return `<g>
<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${circleR}" fill="${FARGE.tekst}" stroke="${FARGE.bg}" stroke-width="1.2"/>
<text x="${(sx + 5).toFixed(1)}" y="${(sy + 4).toFixed(1)}" font-family="${FONT_SANS}" font-size="${fontSize}" font-weight="${s.stor ? '700' : '600'}" letter-spacing="0.05em" fill="${FARGE.tekst}" stroke="${FARGE.bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill">${esc(s.navn.toUpperCase())}</text>
</g>`;
  }).filter(Boolean).join('');

  // 9. Oversiktskart (Nordisk oversikt i øverste høyre hjørne)
  const ih = 210;
  const iw = 168;
  const ix = B - iw - 24;
  const iy = 24;

  const nMinX = -1050;
  const nMaxX = 850;
  const nMinY = -1950;
  const nMaxY = 1100;
  const ow = nMaxX - nMinX;
  const oh = nMaxY - nMinY;
  const os = Math.min(iw / ow, ih / oh);
  const tilOversikt = ([x, y]) => [
    ix + iw / 2 + (x - (nMinX + nMaxX) / 2) * os,
    iy + ih / 2 + (y - (nMinY + nMaxY) / 2) * os,
  ];

  const overLand = kart.land
    .map((l) => `<path d="${sti(l.ringer, tilOversikt)}" fill="${l.kode === 'NOR' ? '#fdfdfb' : '#eae5dc'}" stroke="${FARGE.grense}" stroke-width="0.5"/>`)
    .join('');
  const overVarsel = `<path d="${sti(omrade, tilOversikt)}" fill="${farge.badge}" stroke="${farge.strek}" stroke-width="1.2"/>`;
  const [rx, ry] = tilOversikt([cx - w / 2, cy - h / 2]);
  const rw = (w * os).toFixed(1);
  const rh = (h * os).toFixed(1);

  const oversiktskartSvg = `<g>
<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#f4f7f9" stroke="${FARGE.ramme}" stroke-width="1.5"/>
<g clip-path="url(#oversikt-klipp)">
  <clipPath id="oversikt-klipp"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath>
  ${overLand}
  ${overVarsel}
  <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw}" height="${rh}" fill="none" stroke="${FARGE.tekst}" stroke-width="1.4"/>
</g>
<rect x="${ix}" y="${iy}" width="${iw}" height="18" fill="${FARGE.bg}" stroke="${FARGE.delestrek}" stroke-width="0.8"/>
<text x="${ix + 8}" y="${iy + 13}" font-family="${FONT_SANS}" font-size="9" font-weight="700" letter-spacing="0.12em" fill="${FARGE.dempet}">NOREG / NORDEN</text>
</g>`;

  // 10. Kartusj / Tittelblokk (N50 kartpafta lejantı)
  const erNve = String(kilde).includes('NVE');
  const institusjon = erNve ? 'NVE / VARSOM · FAREVARSEL' : 'METEOROLOGISK INSTITUTT · FAREVARSEL';
  const underLinjer = brytLinjer(undertittel, 30, 2);

  const kartusjSvg = `<g>
<rect x="${cartX}" y="${cartY}" width="${cartW}" height="${cartH}" fill="${FARGE.bg}" stroke="${FARGE.ramme}" stroke-width="1.5"/>
<rect x="${cartX + 3}" y="${cartY + 3}" width="${cartW - 6}" height="${cartH - 6}" fill="none" stroke="${FARGE.delestrek}" stroke-width="1"/>
<rect x="${cartX}" y="${cartY}" width="9" height="${cartH}" fill="${farge.badge}"/>
<text x="${cartX + 24}" y="${cartY + 28}" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" letter-spacing="0.14em" fill="${FARGE.dempet}">${esc(institusjon)}</text>
<line x1="${cartX + 24}" y1="${cartY + 36}" x2="${cartX + cartW - 20}" y2="${cartY + 36}" stroke="${FARGE.delestrek}" stroke-width="1"/>
<rect x="${cartX + 24}" y="${cartY + 49}" width="18" height="18" fill="${farge.badge}" stroke="${farge.strek}" stroke-width="1.2"/>
<text x="${cartX + 50}" y="${cartY + 65}" font-family="${FONT_SERIF}" font-size="24" font-weight="700" fill="${FARGE.tekst}">${esc(tittel)}</text>
${underLinjer.map((l, i) => `<text x="${cartX + 24}" y="${cartY + 96 + i * 22}" font-family="${FONT_SANS}" font-size="17" font-weight="600" fill="${FARGE.tekst2}">${esc(l)}</text>`).join('')}
<line x1="${cartX + 24}" y1="${cartY + cartH - 24}" x2="${cartX + cartW - 20}" y2="${cartY + cartH - 24}" stroke="${FARGE.delestrek}" stroke-width="0.8"/>
<text x="${cartX + 24}" y="${cartY + cartH - 10}" font-family="${FONT_SANS}" font-size="10" font-weight="500" fill="${FARGE.dempet}">tidsrøst · ${esc(kilde)}</text>
</g>`;

  // 11. Kartografisk ytterramme (Neatline)
  const neatlineSvg = `<g>
<rect x="10" y="10" width="${B - 20}" height="${H - 20}" fill="none" stroke="${FARGE.ramme}" stroke-width="1.5"/>
<rect x="14" y="14" width="${B - 28}" height="${H - 28}" fill="none" stroke="${FARGE.delestrek}" stroke-width="0.8"/>
</g>`;

  return svg(`<defs>${hatchDef}</defs>${havBakgrunn}${rutenettSvg}${havnavnSvg}${landSvg}${innsjoSvg}${varselSvg}${stederSvg}${oversiktskartSvg}${kartusjSvg}${neatlineSvg}`);
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
    const steg = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].find((t) => (hi - lo) / t <= 4) ?? 10;
    const ticks = [];
    for (let v = Math.ceil(lo / steg) * steg; v <= hi; v += steg) ticks.push(v);
    const desimaler = steg < 0.1 ? 2 : steg < 1 ? 1 : 0;
    const rutenett = ticks
      .map((v) => `<line x1="${gx0}" y1="${py(v).toFixed(1)}" x2="${gx1}" y2="${py(v).toFixed(1)}" stroke="${FARGE.delestrek}" stroke-width="1" stroke-dasharray="4 6"/>
<text x="${x0 + pw}" y="${(py(v) + 7).toFixed(1)}" text-anchor="end" font-family="${FONT_SANS}" font-size="20" fill="${FARGE.dempet}">${tall(v, desimaler)}</text>`)
      .join('');
    return `<g>
<text x="${x0}" y="${top}" font-family="${FONT_SANS}" font-size="28" font-weight="600" fill="${FARGE.dempet}">${esc(s.navn)}</text>
<text x="${x0}" y="${top + 62}" font-family="${FONT_SERIF}" font-size="60" font-weight="700" fill="${FARGE.tekst}">${tall(siste.verdi)} kr</text>
${rutenett}
<line x1="${gx0}" y1="${gy1}" x2="${gx1}" y2="${gy1}" stroke="${FARGE.linje}" stroke-width="2"/>
<path d="${flate}" fill="${FARGE.aksent}" fill-opacity="0.1"/>
<path d="${linje}" fill="none" stroke="${FARGE.aksent}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${px(s.punkter.length - 1)}" cy="${py(siste.verdi)}" r="6" fill="${FARGE.aksent}"/>
<text x="${gx0}" y="${bunn}" font-family="${FONT_SANS}" font-size="22" fill="${FARGE.dempet}">${kortDato(første.dato)}</text>
<text x="${gx1}" y="${bunn}" text-anchor="end" font-family="${FONT_SANS}" font-size="22" fill="${FARGE.dempet}">${kortDato(siste.dato)}</text>
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
<text x="96" y="200" font-family="${FONT_SANS}" font-size="36" font-weight="600" fill="${FARGE.dempet}">${esc(overlinje)}</text>
<text x="88" y="420" font-family="${FONT_SERIF}" font-size="220" font-weight="700" fill="${FARGE.tekst}">${esc(verdi)}</text>
<text x="96" y="530" font-family="${FONT_SANS}" font-size="36" font-weight="600" fill="${FARGE.tekst}">${esc(underlinje)}</text>`);
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
<text x="88" y="110" font-family="${FONT_SANS}" font-size="28" font-weight="700" letter-spacing="4" fill="#ffffff" fill-opacity="0.75">${esc(kategori.toUpperCase())}</text>
${linjer.map((l, i) => `<text x="84" y="${(y0 + i * str * 1.15).toFixed(0)}" font-family="${FONT_SERIF}" font-size="${str}" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('')}
${underlinje ? `<text x="88" y="${(y0 + (linjer.length - 1) * str * 1.15 + 70).toFixed(0)}" font-family="${FONT_SANS}" font-size="30" fill="#ffffff" fill-opacity="0.8">${esc(brytLinjer(underlinje, 50, 1)[0])}</text>` : ''}
<text x="88" y="${H - 64}" font-family="${FONT_SERIF}" font-size="34" fill="#ffffff" fill-opacity="0.85">tidsrøst</text>`);
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

// ── Pango Metin Katmanı ve Taşma Koruması ──────────────────────────────

export async function yazi(metin, {
  aile = 'SourceSerif4',
  boyut = 32,
  kalinlik = 400,
  renk = '#16191c',
  genislik,
  aralik = 0,
  satirAraligi,
  buyukHarf = false,
} = {}) {
  let sharp;
  ({ default: sharp } = await import('sharp'));
  const icerik = esc(buyukHarf ? String(metin).toLocaleUpperCase('nb-NO') : metin);
  const harf = aralik ? ` letter_spacing="${Math.round(aralik * boyut * 1024)}"` : '';
  const markup = `<span foreground="${renk}" font_weight="${kalinlik}"${harf}>${icerik}</span>`;
  const fontFile = path.join(FONT_DIR, `${aile}.ttf`);
  const fontName = aile === 'SourceSerif4' ? 'Source Serif 4' : 'Archivo';

  const { data, info } = await sharp({
    text: {
      text: markup,
      font: `${fontName} ${boyut}`,
      fontfile: fontFile,
      rgba: true,
      dpi: 72,
      ...(genislik ? { width: Math.round(genislik), wrap: 'word' } : {}),
      ...(satirAraligi ? { spacing: Math.round(satirAraligi) } : {}),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  return { input: data, genislik: info.width, yukseklik: info.height };
}

export async function sigdir({ input, left, top, genislik, yukseklik }) {
  let sharp;
  ({ default: sharp } = await import('sharp'));
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const enFazlaG = B - 40 - x;
  const enFazlaY = H - y;
  if (genislik <= enFazlaG && yukseklik <= enFazlaY) return { input, left: x, top: y };
  const kucuk = await sharp(input)
    .resize({ width: enFazlaG, height: enFazlaY, fit: 'inside' })
    .png()
    .toBuffer();
  return { input: kucuk, left: x, top: y };
}

// ── Kategori Sembolleri (Symbol.astro ile uyumlu geometrik vektör şekilleri) ──

export const KATEGORI_SEMBOL = {
  innenriks: '<path d="M6 1.2 11.2 10.4H.8Z" fill="currentColor"/>',
  utenriks: '<circle cx="6" cy="6" r="4.1" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  okonomi: '<rect x="1.6" y="1.6" width="8.8" height="8.8" fill="currentColor"/>',
  økonomi: '<rect x="1.6" y="1.6" width="8.8" height="8.8" fill="currentColor"/>',
  sport: '<path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  kultur: '<circle cx="6" cy="6" r="4.4" fill="currentColor"/>',
  teknologi: '<rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.7"/>',
};

export const KATEGORI_NAVN = {
  innenriks: 'Innenriks',
  utenriks: 'Utenriks',
  okonomi: 'Økonomi',
  økonomi: 'Økonomi',
  sport: 'Sport',
  kultur: 'Kultur',
  teknologi: 'Teknologi',
};

export function formatDato(dato) {
  if (!dato) return '';
  const d = typeof dato === 'string' || typeof dato === 'number' ? new Date(dato) : dato;
  if (isNaN(d.getTime())) return String(dato);
  return d.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Kapak Çizici (SVG taban üzerine katmanları birleştirerek PNG üretir) ──────

export async function kapakCiz(uretici) {
  let sharp;
  ({ default: sharp } = await import('sharp'));
  const veri = typeof uretici === 'function' ? await uretici() : await uretici;
  const svgMetin = typeof veri === 'string' ? veri : veri.svg;
  const katmanlar = (typeof veri === 'object' && Array.isArray(veri?.katmanlar)) ? veri.katmanlar : [];

  const hazirKatmanlar = katmanlar.map((k) => ({
    input: k.input,
    left: Math.round(k.left),
    top: Math.round(k.top),
  }));

  let resim = sharp(Buffer.from(svgMetin));
  if (hazirKatmanlar.length > 0) {
    resim = resim.composite(hazirKatmanlar);
  }
  return resim.png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}

// ── Standart Haber Kapağı: Fjord dili (bkz. fjord.mjs) ─────────────────────
// Sahibin kararları: kapakta kaynak, kategori/tarih etiketi ve veri kutusu yok (2026-10-14); görsel dil Fjord (2026-10-18).
// kategori, dato, rakam, kilde parametreleri geriye dönük uyum için kabul edilir ama çizilmez.

export async function sakKapagi({ tittel, ingress, forfatter, sjanger }) {
  return fjordKart({ tittel, ingress, forfatter, sjanger }, 'kapak');
}


