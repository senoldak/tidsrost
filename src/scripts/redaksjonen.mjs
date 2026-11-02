// Redaksjonen: piksel yayın odası. Örnekten (docs/superpowers/ornekler/redaksjonen-oyun.html) taşındı; sayılar ve başlıklar
// sunucunun yazdığı #redaksjonen-data JSON'undan (src/lib/redaksjonen.mjs), figürlerin hareketi temsilîdir.
const S = 34, O = { x: 760, y: 160 };
const iso = (x, y, z = 0) => [O.x + (x - y) * S * 0.866, O.y + (x + y) * S * 0.5 - z * S];
const pts = (a) => a.map((p) => p.join(',')).join(' ');
const svg = document.getElementById('rom'), NS = 'http://www.w3.org/2000/svg';
// CSP (style-src 'self'): style özniteliği yazılmaz, CSSOM ile verilir.
const el = (tag, at = {}, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) { if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } parent.appendChild(e); return e; };
const INK = '#16191c';
function kutu(x, y, w, d, h, [ust, sol, sag], g = svg, z0 = 0, cizgi = 1.5) {
  const A = iso(x, y + d, z0), B = iso(x + w, y + d, z0), C = iso(x + w, y, z0);
  const At = iso(x, y + d, z0 + h), Bt = iso(x + w, y + d, z0 + h), Ct = iso(x + w, y, z0 + h), Dt = iso(x, y, z0 + h);
  el('polygon', { points: pts([A, B, Bt, At]), fill: sol, stroke: INK, 'stroke-width': cizgi }, g);
  el('polygon', { points: pts([B, C, Ct, Bt]), fill: sag, stroke: INK, 'stroke-width': cizgi }, g);
  el('polygon', { points: pts([Dt, Ct, Bt, At]), fill: ust, stroke: INK, 'stroke-width': cizgi }, g);
}
const ting = [];
const legg = (dybde, tegn) => ting.push([dybde, tegn]);

// ---------- Kat ----------
const W = 36, D = 24, VH = 3.4;
const zemin = el('g'), verden = el('g'), gangere = el('g'), skilt = el('g'), bobler = el('g');
const ROM = [
  { navn: 'FAKTASJEKK', x0: 15, x1: 19.5 }, { navn: 'SPRÅK', x0: 19.5, x1: 24 },
  { navn: 'JUSS', x0: 24, x1: 28.5 }, { navn: 'GRAFIKK', x0: 28.5, x1: 33 },
];
const iRom = (x, y) => (x >= 15 && x < 33 && y < 5) || (x < 5.5 && y < 5) || (x >= 15 && x < 24 && y >= 15) || (x >= 26 && x < 35 && y >= 16);
for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) {
  const h = iRom(x + 0.5, y + 0.5);
  el('polygon', { points: pts([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]), fill: h ? ((x + y) % 2 ? '#dfe7ef' : '#d6e0ea') : (x + y) % 2 ? '#f1f5ec' : '#e6ecdf', stroke: h ? '#c9d4df' : '#dcded8' }, zemin);
}
el('polygon', { points: pts([iso(0, 0), iso(W, 0), iso(W, 0, VH), iso(0, 0, VH)]), fill: '#e6eef6', stroke: INK, 'stroke-width': 2 }, zemin);
el('polygon', { points: pts([iso(0, 0), iso(0, D), iso(0, D, VH), iso(0, 0, VH)]), fill: '#d5e1ee', stroke: INK, 'stroke-width': 2 }, zemin);
function vindu(a, b, venstre = false) {
  const p = (t, z) => (venstre ? iso(0, t, z) : iso(t, 0, z));
  el('polygon', { points: pts([p(a, 1.3), p(b, 1.3), p(b, 2.8), p(a, 2.8)]), fill: '#0d3557', stroke: INK, 'stroke-width': 2 }, zemin);
  el('polygon', { points: pts([p(a, 1.3), p(a + (b - a) * 0.4, 2.3), p(a + (b - a) * 0.7, 1.85), p(b, 2.15), p(b, 1.3)]), fill: '#24557f' }, zemin);
}
vindu(17, 21); vindu(26, 30); vindu(9.6, 12.8, true); vindu(17.2, 20.6, true);
el('polygon', { points: pts([iso(0, 21.2), iso(0, 22.8), iso(0, 22.8, 2.2), iso(0, 21.2, 2.2)]), fill: '#a0643c', stroke: INK, 'stroke-width': 2 }, zemin);
// Duvara düz yerleşen 2B çizim (arka duvar: skewY 30, sol duvar: skewY -30)
function paVegg(t, z, venstre = false) { const [px, py] = venstre ? iso(0, t, z) : iso(t, 0, z); return el('g', { transform: `translate(${px},${py}) skewY(${venstre ? -30 : 30})` }, zemin); }
function veggskilt(tekst, t, z, venstre = false) {
  const g = paVegg(t, z, venstre);
  el('rect', { x: 0, y: -16, width: tekst.length * 10 + 16, height: 24, fill: '#fdfdfb', stroke: INK, 'stroke-width': 2 }, g);
  el('text', { x: 8, y: 1, class: 'px', 'font-size': 10, fill: '#0d3557' }, g).textContent = tekst;
}
// Bayraklar ve logo
function norge(t, z) {
  const g = paVegg(t, z);
  el('rect', { x: 0, y: 0, width: 88, height: 64, fill: '#ba0c2f', stroke: INK, 'stroke-width': 2 }, g);
  el('rect', { x: 24, y: 0, width: 16, height: 64, fill: '#fff' }, g); el('rect', { x: 0, y: 24, width: 88, height: 16, fill: '#fff' }, g);
  el('rect', { x: 28, y: 0, width: 8, height: 64, fill: '#00205b' }, g); el('rect', { x: 0, y: 28, width: 88, height: 8, fill: '#00205b' }, g);
  el('rect', { x: 0, y: 0, width: 88, height: 64, fill: 'none', stroke: INK, 'stroke-width': 2 }, g);
}
function tyrkia(t, z, venstre = false) {
  const g = paVegg(t, z, venstre);
  el('rect', { x: 0, y: 0, width: 96, height: 64, fill: '#e30a17', stroke: INK, 'stroke-width': 2 }, g);
  el('circle', { cx: 34, cy: 32, r: 16, fill: '#fff' }, g); el('circle', { cx: 38, cy: 32, r: 12.8, fill: '#e30a17' }, g);
  const st = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 8, a = -Math.PI / 2 + (i * Math.PI) / 5; st.push([52 + r * Math.cos(a) + 2, 32 + r * Math.sin(a)]); }
  el('polygon', { points: st.map((p) => p.join(',')).join(' '), fill: '#fff', transform: 'rotate(-90 54 32)' }, g);
}
function logo(t, z) {
  const g = paVegg(t, z);
  el('rect', { x: 0, y: 0, width: 200, height: 58, fill: '#fdfdfb', stroke: INK, 'stroke-width': 3 }, g);
  const tx = el('text', { x: 100, y: 41, 'text-anchor': 'middle', 'font-family': 'Archivo, sans-serif', 'font-weight': 800, 'font-size': 38, fill: INK, 'shape-rendering': 'geometricPrecision' }, g);
  tx.innerHTML = 'tidsr<tspan fill="#1f5f99">ø</tspan>st';
}
logo(6.4, 3.15); norge(14.4, 3.1); tyrkia(13.6, 3.1, true);
// Duvar saatleri: Oslo ve İstanbul, gerçek saat
function klokke(t, z, by, sone) {
  const g = paVegg(t, z);
  el('rect', { x: 0, y: 0, width: 74, height: 40, fill: '#16191c', stroke: INK, 'stroke-width': 2 }, g);
  const tid = el('text', { x: 37, y: 22, 'text-anchor': 'middle', class: 'px', 'font-size': 12, fill: '#3fe07a' }, g);
  el('text', { x: 37, y: 35, 'text-anchor': 'middle', class: 'px', 'font-size': 6, fill: '#fdfdfb' }, g).textContent = by;
  const oppdater = () => { tid.textContent = new Intl.DateTimeFormat('nb-NO', { timeZone: sone, hour: '2-digit', minute: '2-digit' }).format(new Date()); };
  oppdater(); setInterval(oppdater, 10000);
}
klokke(1.0, 3.32, 'OSLO', 'Europe/Oslo'); klokke(3.6, 3.32, 'ISTANBUL', 'Europe/Istanbul');
veggskilt('NYHETSDESKEN', 4.4, 2.6, true);
veggskilt('SKRIVEBORDET', 22.5, 3.2);
function gulvskilt(tekst, x, y) { const [px, py] = iso(x, y); el('text', { x: px, y: py, 'text-anchor': 'middle', class: 'px', 'font-size': 8, fill: '#8a96a3' }, zemin).textContent = tekst; }

// Ara duvarlar
const VEGG = ['#eef2f6', '#c9d4df', '#b9c6d3'];
function veggX(y, x0, x1, dor = []) {
  for (let x = x0; x < x1 - 1e-6; x += 0.5) { const xe = Math.min(x1, x + 0.5); if (dor.some(([a, b]) => x >= a - 1e-6 && xe <= b + 1e-6)) continue; legg(xe + y + 0.12, () => kutu(x, y, xe - x, 0.12, 1.4, VEGG, verden, 0, 1)); }
}
function veggY(x, y0, y1, dor = []) {
  for (let y = y0; y < y1 - 1e-6; y += 0.5) { const ye = Math.min(y1, y + 0.5); if (dor.some(([a, b]) => y >= a - 1e-6 && ye <= b + 1e-6)) continue; legg(x + 0.12 + ye, () => kutu(x, y, 0.12, ye - y, 1.4, VEGG, verden, 0, 1)); }
}
for (const r of ROM) { veggY(r.x0, 0, 5); veggX(5, r.x0, r.x1, [[r.x0 + 2.5, r.x0 + 3.5]]); gulvskilt(r.navn, r.x0 + 2.2, 4.7); }
veggY(33, 0, 5);
// Sunucu odası
veggX(5, 0, 5.5, [[3.5, 4.5]]); veggY(5.5, 0, 5); gulvskilt('SERVERROM', 2.6, 4.7);
for (const [x, y] of [[0.5, 0.6], [1.7, 0.6], [2.9, 0.6], [0.5, 2.6], [1.7, 2.6]]) legg(x + 0.9 + y + 0.8, () => {
  kutu(x, y, 0.9, 0.8, 2.0, ['#2d3135', '#16191c', '#24282c'], verden);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) { const [px, py] = iso(x + 0.15 + k * 0.28, y + 0.8, 0.3 + i * 0.28); el('rect', { class: 'led', style: `animation-delay:${(Math.random() * 1.1).toFixed(2)}s`, x: px - 2, y: py - 3, width: 4, height: 3, fill: ['#3fe07a', '#3fe07a', '#7fb2e5', '#f6d23a'][(i + k) % 4] }, verden); }
});
// Yazar odası ve toplantı odası
veggX(15, 15, 24, [[18.5, 19.5]]); veggY(15, 15, 24); veggY(24, 15, 24); gulvskilt('FORFATTERROMMET', 19.5, 23.6);
veggX(16, 26, 35, [[29.5, 30.5]]); veggY(26, 16, 24); veggY(35, 16, 24); gulvskilt('MØTEROM', 30.5, 23.6);

// ---------- Mobilya ----------
function plante(x, y) { legg(x + y + 0.6, () => { kutu(x, y, 0.5, 0.5, 0.45, ['#a0643c', '#8a5532', '#7a4a2b'], verden); const [px, py] = iso(x + 0.25, y + 0.25, 0.45); for (const [dx, dy, r] of [[0, -16, 11], [-8, -9, 9], [8, -9, 9], [0, -26, 7]]) el('circle', { cx: px + dx, cy: py + dy, r, fill: '#3f7a4a', stroke: INK, 'stroke-width': 1.2 }, verden); }); }
function hylle(x, y, w) { legg(x + w + y + 0.4, () => { kutu(x, y, w, 0.4, 1.8, ['#c9a27a', '#a0643c', '#8a5532'], verden); for (let i = 0; i < 3; i++) for (let k = 0; k < w * 4; k++) { const [px, py] = iso(x + 0.1 + k * 0.25, y + 0.4, 0.3 + i * 0.55); el('rect', { x: px - 2, y: py - 12, width: 5, height: 12, fill: ['#c8281e', '#1f5f99', '#f6d23a', '#5a6168', '#0d3557'][(k + i * 2) % 5], stroke: INK, 'stroke-width': 0.8 }, verden); } }); }
hylle(6.2, 0.1, 3); hylle(15.4, 15.2, 2.5); hylle(33.4, 0.2, 2.2);
for (const [x, y] of [[0.4, 6.0], [13.8, 9.5], [14.3, 23.3], [35.2, 6.0], [35.3, 15.2], [24.6, 23.3], [5.9, 5.6], [25.1, 9.8]]) plante(x, y);
// Su sebili + kahve (mola köşesi)
const MOLA = [12.2, 3.0];
legg(11.6 + 1.0 + 0.6, () => { kutu(11.0, 0.6, 0.6, 0.6, 1.0, ['#fdfdfb', '#e6e6e0', '#dcded8'], verden); kutu(11.1, 0.7, 0.4, 0.4, 0.6, ['#7fb2e5', '#5c95cc', '#4f86bd'], verden, 1.0); });
legg(13.2 + 1.0 + 0.6, () => { kutu(12.4, 0.6, 1.0, 0.8, 0.9, ['#5a6168', '#3d4247', '#2d3135'], verden); kutu(12.6, 0.75, 0.45, 0.4, 0.45, ['#c8281e', '#9e1f17', '#8a1a14'], verden, 0.9); });
// Toplantı masası
legg(33 + 21, () => kutu(28, 18.5, 5, 2, 0.5, ['#c9a27a', '#a0643c', '#8a5532'], verden));
for (const x of [28.4, 29.6, 30.8, 32.0]) for (const y of [17.9, 20.6]) legg(x + y + 0.5, () => kutu(x, y, 0.5, 0.45, 0.3, ['#2d3135', INK, INK], verden));
// Çöp kutusu
const KURV = [10.3, 22.1];
legg(10.8 + 22.3, () => kutu(10.0, 21.8, 0.5, 0.5, 0.5, ['#5a6168', '#3d4247', '#2d3135'], verden));

// ---------- Piksel insan ----------
const P = 3;
function sprite(u, ki, gang) {
  const Wd = 14, H = 28, g = Array.from({ length: H }, () => Array(Wd).fill(null));
  const set = (r, c, v) => { if (r >= 0 && r < H && c >= 0 && c < Wd) g[r][c] = v; };
  const fill = (r0, r1, c0, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c, v); };
  const o = 2;
  if (gang === 1) { fill(o + 19, o + 24, 2, 5, 'P'); fill(o + 19, o + 23, 8, 11, 'P'); fill(o + 25, o + 25, 1, 5, 'B'); fill(o + 24, o + 24, 8, 12, 'B'); }
  else if (gang === 2) { fill(o + 19, o + 23, 2, 5, 'P'); fill(o + 19, o + 24, 8, 11, 'P'); fill(o + 24, o + 24, 1, 5, 'B'); fill(o + 25, o + 25, 8, 12, 'B'); }
  else { fill(o + 19, o + 24, 3, 6, 'P'); fill(o + 19, o + 24, 7, 10, 'P'); fill(o + 25, o + 25, 2, 6, 'B'); fill(o + 25, o + 25, 7, 11, 'B'); }
  fill(o + 10, o + 18, 2, 11, 'T');
  const arm = gang ? (gang === 1 ? [1, -1] : [-1, 1]) : [0, 0];
  fill(o + 11 + arm[0], o + 17 + arm[0], 0, 1, 'T'); fill(o + 11 + arm[1], o + 17 + arm[1], 12, 13, 'T');
  fill(o + 18 + arm[0], o + 18 + arm[0], 0, 1, 'S'); fill(o + 18 + arm[1], o + 18 + arm[1], 12, 13, 'S');
  fill(o + 11, o + 17, 2, 2, 't'); fill(o + 11, o + 17, 11, 11, 't');
  if (u.ceket) { fill(o + 10, o + 18, 2, 4, 'J'); fill(o + 10, o + 18, 9, 11, 'J'); fill(o + 11 + arm[0], o + 17 + arm[0], 0, 1, 'J'); fill(o + 11 + arm[1], o + 17 + arm[1], 12, 13, 'J'); }
  fill(o + 10, o + 10, 5, 8, 'C');
  fill(o + 9, o + 9, 5, 8, 'S');
  fill(o + 3, o + 7, 2, 11, 'S'); fill(o + 8, o + 8, 3, 10, 'S'); fill(o + 2, o + 2, 3, 10, 'S');
  set(o + 5, 4, 'E'); set(o + 5, 9, 'E'); set(o + 4, 4, 'b'); set(o + 4, 9, 'b');
  set(o + 7, 6, 'M'); set(o + 7, 7, 'M');
  const sac = u.sac;
  if (sac !== 'kel') { fill(o + 0, o + 0, 4, 9, 'H'); fill(o + 1, o + 2, 2, 11, 'H'); set(o + 3, 2, 'H'); set(o + 3, 11, 'H'); }
  else { set(o + 3, 2, 'H'); set(o + 4, 2, 'H'); set(o + 3, 11, 'H'); set(o + 4, 11, 'H'); }
  if (sac === 'uzun') { fill(o + 1, o + 13, 1, 1, 'H'); fill(o + 1, o + 13, 12, 12, 'H'); fill(o + 3, o + 12, 2, 2, 'H'); fill(o + 3, o + 12, 11, 11, 'H'); }
  if (sac === 'topuz') { fill(o - 2, o - 1, 5, 8, 'H'); set(o + 3, 3, 'H'); set(o + 3, 10, 'H'); }
  if (sac === 'kivircik') { fill(o - 1, o - 1, 3, 10, 'H'); fill(o + 0, o + 4, 1, 1, 'H'); fill(o + 0, o + 4, 12, 12, 'H'); fill(o + 0, o + 0, 2, 11, 'H'); set(o + 3, 3, 'H'); set(o + 3, 10, 'H'); }
  if (sac === 'kakul') fill(o + 3, o + 3, 3, 7, 'H');
  if (sac === 'atkuyrugu') fill(o + 3, o + 9, 12, 13, 'H');
  if (u.sakal) { fill(o + 6, o + 8, 2, 2, 'H'); fill(o + 6, o + 8, 11, 11, 'H'); fill(o + 8, o + 8, 3, 10, 'H'); fill(o + 9, o + 9, 4, 9, 'H'); set(o + 7, 5, 'H'); set(o + 7, 8, 'H'); }
  if (u.gozluk) { fill(o + 5, o + 5, 3, 5, 'G'); fill(o + 5, o + 5, 8, 10, 'G'); set(o + 5, 6, 'G'); set(o + 5, 7, 'G'); set(o + 5, 4, 'E'); set(o + 5, 9, 'E'); }
  if (ki) { for (let i = 0; i < 4; i++) { set(o + 10 + i, 5 + (i >> 1), 'L'); set(o + 10 + i, 8 - (i >> 1), 'L'); } fill(o + 14, o + 16, 5, 8, 'K'); set(o + 15, 6, 'k'); set(o + 15, 7, 'k'); }
  return g;
}
function tegnFigur(u, ki, gang, parent) {
  const renk = { H: u.sacRenk, S: u.ten, E: INK, b: INK, M: '#9e4b3f', T: u.ust, t: u.ustGolge ?? u.ust, J: u.ceket ?? u.ust,
    C: u.yaka ?? '#fdfdfb', P: u.alt ?? '#2d3135', B: INK, G: INK, L: '#c8281e', K: '#fdfdfb', k: '#c8281e' };
  const grid = sprite(u, ki, gang), H = grid.length, Wd = grid[0].length;
  const f = el('g', {}, parent);
  const dolu = (r, c) => r >= 0 && r < H && c >= 0 && c < Wd && grid[r][c];
  for (let r = -1; r <= H; r++) for (let c = -1; c <= Wd; c++)
    if (!dolu(r, c) && (dolu(r - 1, c) || dolu(r + 1, c) || dolu(r, c - 1) || dolu(r, c + 1))) el('rect', { x: c * P, y: r * P, width: P, height: P, fill: INK }, f);
  for (let r = 0; r < H; r++) for (let c = 0; c < Wd; c++) if (grid[r][c]) el('rect', { x: c * P, y: r * P, width: P, height: P, fill: renk[grid[r][c]] }, f);
  const blunk = el('g', { class: 'blunk', style: `animation-delay:${(Math.random() * 4).toFixed(2)}s` }, f);
  for (const c of [4, 9]) el('rect', { x: c * P, y: 7 * P, width: P, height: P, fill: u.ten }, blunk);
  return f;
}
const SW = 14 * P, SH = 28 * P;

// ---------- Ekip ----------
const HALL = 6.6;
const aapen = (x, y) => ({ x, y, ut: [[x + 0.75, y + 1.35], [x + 2.25, y + 1.35], [x + 2.25, HALL]] });
const rom = (r) => { const x = r.x0 + 0.8; return { x, y: 1.8, ut: [[x + 0.75, 3.15], [r.x0 + 3, 3.15], [r.x0 + 3, HALL]] }; };
const DORF = 19.0; // yazar odası kapısı
const forf = (x, y) => ({ x, y, ut: [[x + 0.75, y + 1.35], [DORF, y + 1.35], [DORF, 14.4], [DORF, HALL]] });
const NYHET = [
  { id: 'speider', navn: 'Sigrid', rolle: 'Speider', ...aapen(1.5, 19), u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f2cfb0', ust: '#1f5f99', ustGolge: '#174a78' },
    jobb: 'Leser offentlige kilder og nyhetsstrømmer hele døgnet og legger nye saker på bordet.', rep: ['Ny sak fra SSB!', 'Sjekker politiloggen …', 'Tre nye saker.'] },
  { id: 'vekter', navn: 'Vidar', rolle: 'Vekter', ...aapen(6.0, 19), u: { sac: 'kisa', sakal: true, sacRenk: '#6b4226', ten: '#e3b48f', ust: '#a0643c', ustGolge: '#86512f' },
    jobb: 'Gir hver sak en nyhetsverdi fra 0 til 100. Saker under grensen havner i papirkurven.', rep: ['Nyhetsverdi 82. Inn!', 'For tynt. Papirkurven.', 'Den har vi alt.'] },
  { id: 'skriver', navn: 'Ingrid', rolle: 'Skriver', ...aapen(1.5, 14), u: { sac: 'topuz', sacRenk: '#b5482a', ten: '#f5d4ba', ust: '#c8281e', ustGolge: '#a11f17', gozluk: true },
    jobb: 'Skriver saken på bokmål ut fra kildene og lager tittel og ingress.', rep: ['Skriver ingress …', 'Tittelen sitter!'] },
  { id: 'kontroll', navn: 'Kari', rolle: 'Kontrollør', ...aapen(6.0, 14), u: { sac: 'kivircik', sacRenk: '#1f1611', ten: '#8d5a3b', ust: '#5a6168', ustGolge: '#474d53' },
    jobb: 'Sammenligner teksten med kildene, sjekker sitater og ser etter for stor likhet med originalen.', rep: ['Sitatet stemmer.', 'For likt kilden. Skriv om!'] },
  { id: 'leser', navn: 'Leif', rolle: 'Leser', ...aapen(10.5, 14), u: { sac: 'kel', sakal: true, sacRenk: '#b8b8b0', ten: '#efc9a8', ust: '#24557f', ustGolge: '#1c4466', gozluk: true },
    jobb: 'Leser den ferdige saken én gang til og vurderer språk og vinkling før publisering.', rep: ['Godkjent.', 'Leser en gang til …', 'Zzz …'] },
  { id: 'tegner', navn: 'Tor', rolle: 'Tegner', ...aapen(1.5, 9), u: { sac: 'kakul', sacRenk: '#16191c', ten: '#d2a079', ust: '#f6d23a', ustGolge: '#d8b52a', alt: '#1f5f99' },
    jobb: 'Lager forsidebildet med tittel og ingress i tidsrøsts egen stil.', rep: ['Tegner forsiden …', 'Mer blått!', 'Bare én video til …'] },
  { id: 'deler', navn: 'Dina', rolle: 'Deler', ...aapen(6.0, 9), u: { sac: 'atkuyrugu', sacRenk: '#2a1c14', ten: '#a8714e', ust: '#0d3557', ustGolge: '#0a2944' },
    jobb: 'Publiserer saken og deler den på Facebook og Instagram.', rep: ['Publisert!', 'Delt på Facebook.'] },
];
const SKRIV = [
  { id: 'faktasjekk', navn: 'Fredrik', rolle: 'Faktasjekker', ...rom(ROM[0]), u: { sac: 'kisa', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#24557f', gozluk: true },
    jobb: 'Sjekker hvert tall og hvert sitat mot kildene.', rep: ['Dette tallet mangler kilde!', 'Alle tall stemmer.'] },
  { id: 'sprak', navn: 'Silje', rolle: 'Språkvakt', ...rom(ROM[1]), u: { sac: 'atkuyrugu', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#a0643c', ustGolge: '#86512f' },
    jobb: 'Leter etter setninger som høres ut som KI, og sender dem tilbake.', rep: ['Det der høres ut som KI!', 'Bedre nå.'] },
  { id: 'jurist', navn: 'Jonas', rolle: 'Jurist', ...rom(ROM[2]), u: { sac: 'kisa', sacRenk: '#16191c', ten: '#d2a079', ust: '#fdfdfb', ceket: '#16191c', gozluk: true },
    jobb: 'Ser etter juridisk risiko før noe går videre.', rep: ['Juridisk risiko? Nei.', 'Den setningen må ut.'] },
  { id: 'grafikk', navn: 'Grete', rolle: 'Grafikk', ...rom(ROM[3]), u: { sac: 'topuz', sacRenk: '#16191c', ten: '#8d5a3b', ust: '#f6d23a', ustGolge: '#d8b52a' },
    jobb: 'Lager grafene i tidsrøsts stil.', rep: ['Tegner grafen …', 'Aksen må starte på null.'] },
  { id: 'redaktor', navn: 'Astrid', rolle: 'Redaktør', ...aapen(16, 8.5), u: { sac: 'kisa', sacRenk: '#8a8a82', ten: '#f0cdb2', ust: '#0d3557', ceket: '#0d3557' },
    jobb: 'Velger tema og vinkel for de lange sakene.', rep: ['Dagens tema er valgt.', 'Hvem er leseren?'] },
  { id: 'research', navn: 'Bjørn', rolle: 'Researcher', ...aapen(20.5, 8.5), u: { sac: 'kivircik', sacRenk: '#a0643c', ten: '#f2cfb0', ust: '#5a6168', sakal: true },
    jobb: 'Henter tall og dokumenter fra offentlige kilder og lagrer bevis for hvert tall.', rep: ['Henter tall fra SSB …', 'Kilde lagret.'] },
  { id: 'skribent', navn: 'Elin', rolle: 'Skribent', ...aapen(25, 8.5), u: { sac: 'uzun', sacRenk: '#3b2a1f', ten: '#c98e66', ust: '#c8281e', ustGolge: '#a11f17' },
    jobb: 'Skriver utkastet ut fra researchen.', rep: ['Første utkast er klart!', 'Skriver …'] },
  { id: 'desk', navn: 'Henrik', rolle: 'Desk', ...aapen(29.5, 8.5), u: { sac: 'kel', sacRenk: '#3b2a1f', ten: '#e3b48f', ust: '#1f5f99', ceket: '#2d3135' },
    jobb: 'Strammer inn teksten, titler og mellomtitler.', rep: ['Strammer inn.', 'Kortere tittel!'] },
  { id: 'nyhetsred', navn: 'Marte', rolle: 'Nyhetsredaktør', ...aapen(29.5, 12.5), u: { sac: 'uzun', sacRenk: '#6b4226', ten: '#f0cdb2', ust: '#0d3557', ceket: '#c8281e' },
    jobb: 'Samler alt og sender teksten til Şenol for endelig godkjenning.', rep: ['Klar for godkjenning.', 'Sender til Şenol.'] },
];
// Yazar odası: Şenol yazar; KI yalnız çevirir ve dil düzeltmesi yapar
const SENOL = { id: 'senol', navn: 'Şenol Dak', rolle: 'Journalist', menneske: true, ...forf(16.2, 18.5), bred: 2.2,
  u: { sac: 'kisa', sacRenk: '#2b211b', ten: '#e6bc96', ust: '#fdfdfb', ceket: '#16191c' },
  jobb: 'Skriver Forklart og Analyse selv, og godkjenner hver lange sak på telefonen før den publiseres.', rep: ['Ny Forklart på vei!', 'Kaffe, noen?', 'Bra jobbet!'] };
const FORF = [
  { id: 'oversetter', navn: 'Oskar', rolle: 'Oversetter', ...forf(20.8, 18.5), u: { sac: 'kakul', sacRenk: '#6b4226', ten: '#f2cfb0', ust: '#3f7a4a', ustGolge: '#336540' },
    jobb: 'Oversetter Şenols tekster til bokmål. Innholdet er Şenols eget.', rep: ['Oversetter …', 'Hva heter dette på bokmål?'] },
  { id: 'sprakvask', navn: 'Liv', rolle: 'Språkvasker', ...forf(20.8, 21.6), u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#a0643c', gozluk: true },
    jobb: 'Retter språket i Şenols tekster uten å endre innholdet.', rep: ['Kommafeil rettet.', 'Språkvask ferdig.'] },
];
// IT ekibi: sunucuları ve kotaları izleyen gerçek bekçilerin karşılığı
const IT = [
  { id: 'drift1', navn: 'Ola', rolle: 'Driftsvakt', ...aapen(6.6, 2.4), u: { sac: 'kisa', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#3d4247', ustGolge: '#2d3135', sakal: true },
    jobb: 'Holder serverne og robotene i gang, og får varsel når noe stopper.', rep: ['Alle systemer oppe.', 'Hvem trakk ut kabelen?'] },
  { id: 'drift2', navn: 'Nils', rolle: 'Drift', ...aapen(9.4, 2.4), u: { sac: 'kivircik', sacRenk: '#16191c', ten: '#a8714e', ust: '#1f5f99', gozluk: true },
    jobb: 'Følger med på kvoter og kostnader, så alt holder seg gratis.', rep: ['Kvoten ser fin ut.', 'Restarter …'] },
];
const ALLE = [...NYHET, ...SKRIV, SENOL, ...FORF, ...IT];
const by = Object.fromEntries(ALLE.map((a) => [a.id, a]));

// ---------- Gerçek veri (window.REDAKSJON; gerçek sayfada sunucu tarafında) ----------
const R = JSON.parse(document.getElementById('redaksjonen-data')?.textContent ?? '{}');
const tall = (n) => new Intl.NumberFormat('nb-NO').format(n);
const kort35 = (t) => (t.length > 38 ? t.slice(0, 36).replace(/\s+\S*$/, '') + ' …' : t);
// Paneller ve şerit sunucuda çizilir (src/pages/redaksjonen.astro).
// Boş muhabbet: olgu iddia eden satırlar gerçek veriden; yoksa nötr.
const varsa = (kosul, tekst) => (kosul ? [tekst] : []);
by.speider.rep = ['Leser kildene …', 'Ny sak!', ...varsa(R.dag?.iDag, `${tall(R.dag?.funnet ?? 0)} kildesaker i dag.`)];
by.vekter.rep = ['Vurderer nyhetsverdien …', ...varsa(R.uke, `${tall(R.uke?.vurdert ?? 0)} vurdert på ${R.uke?.dager} dager.`)];
by.kontroll.rep = ['Sammenligner med kilden …', 'Sjekker sitatene …'];
by.deler.rep = ['Deler på Facebook …', ...varsa(R.dag?.iDag, `${tall(R.dag?.publisert ?? 0)} publisert i dag.`)];
by.faktasjekk.rep = ['Sjekker hvert tall …', ...varsa(R.sisteKjede, `${tall(R.sisteKjede?.kontrollert ?? 0)} påstander sjekket.`)];
by.research.rep = ['Henter tall fra offentlige kilder …', ...varsa(R.sisteKjede, `${tall(R.sisteKjede?.hentet ?? 0)} tall hentet på nytt.`)];
// Figür kartında gerçek sayılar (son yedi gün).
const ukeTall = {
  speider: () => R.uke && `Siste ${R.uke.dager} dager: ${tall(R.uke.funnet)} kildesaker funnet.`,
  vekter: () => R.uke && `Siste ${R.uke.dager} dager: ${tall(R.uke.vurdert)} vurdert, ${tall(R.uke.avvist?.['lav-nyhetsverdi'] ?? 0)} i papirkurven for lav nyhetsverdi.`,
  kontroll: () => R.uke && `Siste ${R.uke.dager} dager: ${tall((R.uke.avvist?.standard ?? 0) + (R.uke.avvist?.['faktasjekk-stopp'] ?? 0))} saker stoppet i kontrollen.`,
  deler: () => R.uke && `Siste ${R.uke.dager} dager: ${tall(R.uke.publisert)} saker publisert.`,
  faktasjekk: () => R.sisteKjede && `Siste lange sak: ${tall(R.sisteKjede.kontrollert)} påstander sjekket mot kilden.`,
};

// ---------- İstasyonlar ----------
function stasjon(a) {
  const bred = a.bred ?? 1.5;
  legg(a.x + bred + a.y + 0.9, () => {
    const g = el('g', {}, verden);
    kutu(a.x + 0.45, a.y - 0.75, 0.6, 0.5, 0.35, ['#2d3135', INK, INK], g);
    kutu(a.x + 0.45, a.y - 0.8, 0.6, 0.12, 1.1, ['#3d4247', '#2d3135', '#2d3135'], g, 0.35);
    const [px, py] = iso(a.x + 0.75, a.y - 0.25);
    a.sitter = el('g', { transform: `translate(${px - SW / 2},${py - SH})` }, g);
    tegnFigur(a.u, !a.menneske, 0, el('g', { class: 'sitter', style: `animation-delay:${(Math.random() * 2.4).toFixed(2)}s` }, a.sitter));
    kutu(a.x, a.y, bred, 0.9, 0.55, a.menneske ? ['#8a5532', '#6b4226', '#5a371f'] : ['#c9a27a', '#a0643c', '#8a5532'], g);
    kutu(a.x + 1.0, a.y + 0.15, 0.12, 0.6, 0.45, ['#16191c', '#24557f', '#0d3557'], g, 0.55);
    kutu(a.x + 0.2, a.y + 0.4, 0.4, 0.3, 0.03, ['#fdfdfb', '#e6e6e0', '#dcded8'], g, 0.55);
    if (a.menneske) { kutu(a.x + 1.5, a.y + 0.4, 0.3, 0.18, 0.04, ['#1f5f99', INK, INK], g, 0.55); a.telefon = iso(a.x + 1.65, a.y + 0.5, 0.65); kutu(a.x + 1.4, a.y + 0.05, 0.2, 0.2, 0.2, ['#fdfdfb', '#e6e6e0', '#dcded8'], g, 0.55); }
    const navn = a.menneske ? a.navn : `${a.navn} (KI)`;
    const hx = px, hy = py - SH - 6;
    const tg = el('g', { class: 'tag', tabindex: 0, role: 'button', 'aria-label': `${navn}, ${a.rolle}` }, skilt);
    const w = Math.max(navn.length, a.rolle.length) * 7 + 12;
    el('rect', { x: hx - w / 2, y: hy - 28, width: w, height: 26, fill: '#fdfdfb', stroke: INK, 'stroke-width': 2 }, tg);
    el('text', { x: hx, y: hy - 17, 'text-anchor': 'middle', class: 'px', 'font-size': 7.5, fill: a.menneske ? '#c8281e' : '#1f5f99' }, tg).textContent = navn;
    el('text', { x: hx, y: hy - 6, 'text-anchor': 'middle', class: 'px', 'font-size': 6.5, fill: '#5a6168' }, tg).textContent = a.rolle;
    a.hode = [hx, hy - 30];
    tg.addEventListener('click', () => visKort(a));
    tg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visKort(a); } });
  });
}
ALLE.forEach(stasjon);
ting.sort((p, q) => p[0] - q[0]).forEach(([, tegn]) => tegn());
svg.appendChild(gangere); svg.appendChild(skilt); svg.appendChild(bobler);

const kort = document.getElementById('kort');
function visKort(a) {
  const p = (t, sterk) => { const e = document.createElement('p'); if (sterk) { const b = document.createElement('strong'); b.textContent = t; e.append(b); } else e.textContent = t; return e; };
  const h = document.createElement('h2'); h.textContent = a.menneske ? a.navn : `${a.navn} (KI)`;
  const rolle = document.createElement('p'); const b = document.createElement('strong'); b.textContent = a.rolle; rolle.append(b, a.menneske ? ' · menneske' : ' · KI-agent');
  const tall_ = ukeTall[a.id]?.();
  kort.replaceChildren(h, rolle, p(a.jobb), ...(tall_ ? [p(tall_, true)] : []));
  if (a.rep[0]) snakk(a, a.rep[0]);
}

// ---------- Konuşma ----------
function snakk(a, tekst, ms = 2200) {
  const [hx, hy] = a.gaar ? a.gaar.hode() : a.hode;
  const g = el('g', {}, bobler);
  const w = tekst.length * 5.6 + 14;
  const bx = Math.min(1810 - w, Math.max(5, hx - 10)), by_ = hy - 26;
  el('rect', { x: bx, y: by_, width: w, height: 20, fill: '#fdfdfb', stroke: INK, 'stroke-width': 1.5 }, g);
  el('polygon', { points: `${hx - 4},${by_ + 20} ${hx + 6},${by_ + 20} ${hx - 2},${by_ + 28}`, fill: '#fdfdfb', stroke: INK, 'stroke-width': 1.5 }, g);
  el('text', { x: bx + 7, y: by_ + 13.5, class: 'px', 'font-size': 6.5, fill: INK }, g).textContent = tekst;
  setTimeout(() => g.remove(), ms);
}
const rolig = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!rolig) setInterval(() => {
  const k = ALLE.filter((a) => a.rep.length && !a.gaar);
  const a = k[Math.floor(Math.random() * k.length)];
  snakk(a, a.rep[Math.floor(Math.random() * a.rep.length)]);
}, 1300);

// ---------- Yürüme ----------
const vent = (ms) => new Promise((r) => setTimeout(r, ms));
async function gaaRute(a, rute, last, fart = 1, slukker = false) {
  a.sitter.setAttribute('visibility', 'hidden');
  const g = el('g', {}, gangere);
  const ramme = [0, 1, 2].map((k) => { const f = tegnFigur(a.u, !a.menneske, k, g); f.setAttribute('visibility', 'hidden'); return f; });
  if (slukker) { el('rect', { x: SW - 2, y: 15 * P, width: 10, height: 22, fill: '#c8281e', stroke: INK, 'stroke-width': 1.5 }, g); el('rect', { x: SW + 1, y: 15 * P - 5, width: 4, height: 5, fill: INK }, g); }
  if (last) el('rect', { x: SW - 4, y: 18 * P, width: 12, height: 15, fill: '#fdfdfb', stroke: INK, 'stroke-width': 1.5 }, g);
  let pos = rute[0];
  a.gaar = { hode: () => { const [px, py] = iso(...pos); return [px, py - SH - 4]; } };
  for (let i = 1; i < rute.length; i++) {
    const fra = rute[i - 1], til = rute[i];
    const varighet = Math.hypot(til[0] - fra[0], til[1] - fra[1]) * 300 * fart + 1;
    const t0 = performance.now();
    await new Promise((ferdig) => {
      function steg(now) {
        const s = Math.min(1, (now - t0) / varighet);
        pos = [fra[0] + (til[0] - fra[0]) * s, fra[1] + (til[1] - fra[1]) * s];
        const [px, py] = iso(...pos);
        g.setAttribute('transform', `translate(${px - SW / 2},${py - SH})`);
        const k = 1 + (Math.floor(now / 140) % 2);
        ramme.forEach((f, j) => f.setAttribute('visibility', j === k ? 'visible' : 'hidden'));
        if (s < 1) requestAnimationFrame(steg); else ferdig();
      }
      requestAnimationFrame(steg);
    });
  }
  ramme.forEach((f, j) => f.setAttribute('visibility', j === 0 ? 'visible' : 'hidden'));
  return () => { g.remove(); a.gaar = null; a.sitter.setAttribute('visibility', 'visible'); };
}
const rute = (fra, til) => [...fra.ut, ...[...til.ut].reverse()];
async function ledig(...a) { while (a.some((x) => x.opptatt)) await vent(250); a.forEach((x) => (x.opptatt = true)); }
const fri = (...a) => a.forEach((x) => (x.opptatt = false));
async function lever(fra, til, tekst, svar) {
  await ledig(fra, til);
  const r = rute(fra, til);
  let ferdig = await gaaRute(fra, r, true);
  snakk(fra, tekst, 1600); await vent(900);
  if (svar) snakk(til, svar, 1600);
  await vent(900);
  ferdig();
  ferdig = await gaaRute(fra, [...r].reverse(), false);
  ferdig();
  fri(fra, til);
}

// Yazı işleri zinciri: son zincir yazısının gerçek kaydı (geri göndermeler, kontrol edilen iddia, yeniden çekilen rakam).
const KJEDE = ['redaktor', 'research', 'skribent', 'faktasjekk', 'grafikk', 'desk', 'sprak', 'jurist', 'nyhetsred'];
const REPLIKK = {
  redaktor: ['Nytt tema til deg!', 'Jeg henter tallene.'], research: ['Her er kildene.', 'Takk!'], skribent: ['Utkast klart!', 'Sjekker hvert tall …'],
  faktasjekk: ['Tallene stemmer.', 'Lager grafen.'], grafikk: ['Graf ferdig.', 'Strammer inn.'], desk: ['Teksten er strammet.', 'Leser etter KI-språk …'],
  sprak: ['Språket er ok.', 'Ser etter juridisk risiko …'], jurist: ['Ingen juridisk risiko.', 'Da sender vi.'],
};
async function kjede() {
  const k = R.sisteKjede;
  while (true) {
    // Geri gönderme: hedef masadan sonraki masa geri yollar (hedef → kaç kez).
    const igjen = Object.fromEntries((k?.runder ?? []).filter((r) => r.figur && KJEDE.includes(r.figur)).map((r) => [r.figur, r.antall]));
    for (let i = 0; i < KJEDE.length - 1; i++) {
      const fra = KJEDE[i], til = KJEDE[i + 1];
      let [tekst, svar] = REPLIKK[fra];
      if (fra === 'skribent' && k) svar = `Sjekker ${tall(k.kontrollert)} påstander …`;
      if (fra === 'faktasjekk' && k) tekst = `Alle ${tall(k.kontrollert)} stemmer.`;
      await lever(by[fra], by[til], tekst, svar);
      for (let n = 1; n <= (igjen[fra] ?? 0); n++) {
        await lever(by[til], by[fra], `Tilbake til deg, runde ${n}.`, 'Fikser det!');
        await lever(by[fra], by[til], 'Ny versjon!', 'Takk.');
      }
    }
    await ledig(by.nyhetsred, by.senol);
    if (k) { snakk(by.nyhetsred, `Henter ${tall(k.hentet)} tall på nytt …`, 1800); await vent(2000); }
    const r = rute(by.nyhetsred, by.senol);
    let ferdig = await gaaRute(by.nyhetsred, r, true);
    snakk(by.nyhetsred, 'Ny tekst til godkjenning!', 1600);
    await vent(500); ring(); await vent(1600);
    snakk(by.senol, 'Godkjent!', 1800); await vent(1300);
    ferdig();
    ferdig = await gaaRute(by.nyhetsred, [...r].reverse(), false); ferdig();
    fri(by.nyhetsred, by.senol);
    if (k) snakk(by.nyhetsred, `Publisert: ${kort35(k.tittel)}`, 2400);
    await vent(2500);
  }
}
function ring() {
  const [px, py] = by.senol.telefon;
  const g = el('g', {}, bobler);
  for (let i = 0; i < 3; i++) el('circle', { cx: px, cy: py, r: 6 + i * 6, fill: 'none', stroke: '#c8281e', 'stroke-width': 2, opacity: 0.8 - i * 0.25 }, g);
  setTimeout(() => g.remove(), 1500);
}
// Yazar odası: Şenol yazar, Oskar çevirir, Liv dili düzeltir
async function forfatter() {
  while (true) {
    await vent(4000);
    await lever(by.senol, by.oversetter, R.sisteForfatter ? `Ny Forklart: ${kort35(R.sisteForfatter.tittel)}` : 'Ny Forklart. Oversett, takk!', 'Oversetter …');
    await vent(2500);
    await lever(by.oversetter, by.sprakvask, 'Oversatt.', 'Språkvasker …');
    await vent(2500);
    await lever(by.sprakvask, by.senol, 'Ferdig. Innholdet er ditt.', 'Takk!');
    await vent(6000);
  }
}
// Mola: su sebili ve kahve
const PRAT = ['Bare én kopp til …', 'Har du sett været i dag?', 'Fem minutters pause!', 'Vann er viktig.', 'Hvem tok den siste kaffen?', 'God helg snart!'];
async function pauser() {
  while (true) {
    await vent(3500 + Math.random() * 3000);
    const kand = [...NYHET, ...SKRIV, ...FORF].filter((a) => !a.opptatt && a.id !== 'speider' && a.id !== 'vekter');
    if (!kand.length) continue;
    const a = kand[Math.floor(Math.random() * kand.length)];
    a.opptatt = true;
    const dx = Math.random() * 1.6, dy = Math.random() * 1.6;
    const r = [...a.ut, [MOLA[0] + dx, HALL], [MOLA[0] + dx, MOLA[1] + dy]];
    let ferdig = await gaaRute(a, r, false);
    snakk(a, PRAT[Math.floor(Math.random() * PRAT.length)], 2000);
    await vent(2600);
    ferdig();
    ferdig = await gaaRute(a, [...r].reverse(), false); ferdig();
    a.opptatt = false;
  }
}

// Haber masası: kâğıt masadan masaya uçar
function flyPapir(fra, til, ms, kast = false) {
  return new Promise((ferdig) => {
    const g = el('g', {}, gangere);
    el('rect', { x: -6, y: -8, width: 12, height: 15, fill: '#fdfdfb', stroke: INK, 'stroke-width': 1.5 }, g);
    for (let i = 0; i < 3; i++) el('rect', { x: -3, y: -4 + i * 4, width: i === 2 ? 4 : 7, height: 1.5, fill: '#5a6168' }, g);
    const t0 = performance.now();
    function steg(now) {
      const s = Math.min(1, (now - t0) / ms);
      const [px, py] = iso(fra[0] + (til[0] - fra[0]) * s, fra[1] + (til[1] - fra[1]) * s, 0.9 + Math.sin(s * Math.PI) * 1.3);
      g.setAttribute('transform', `translate(${px},${py}) rotate(${kast ? s * 540 : 0})`);
      if (s < 1) requestAnimationFrame(steg); else { g.remove(); ferdig(); }
    }
    requestAnimationFrame(steg);
  });
}
const bord = (a) => [a.x + 0.4, a.y + 0.5];
// Kağıtlar gerçek haberler; çöpe gitme oranı ve gerekçesi botun son yedi gününden (kayıt yoksa yarı yarıya).
const KURV_REPLIKK = {
  'lav-nyhetsverdi': 'For tynt. Papirkurven.', 'allerede-publisert': 'Den har vi alt.', 'en-kilde': 'Bare én kilde. Vi venter.',
  'for-lite-kildemateriale': 'For lite å bygge på.', varsomhet: 'Krever varsomhet. Nei.', 'faktasjekk-stopp': 'Tallet stemmer ikke. Stopp!',
  standard: 'Bryter reglene. Ut!', 'borte-fra-kilden': 'Kilden har fjernet den.', 'dekket-av-farevarsler': 'Ligger alt på farevarsel-siden.',
};
const KONTROLL_STOPP = ['standard', 'faktasjekk-stopp', 'varsomhet'];
function trekkGrunn() {
  const l = (R.avvisninger ?? []).filter((a) => KURV_REPLIKK[a.kode]);
  const sum = l.reduce((x, a) => x + a.antall, 0);
  let r = Math.random() * sum;
  for (const a of l) if ((r -= a.antall) < 0) return a.kode;
  return 'lav-nyhetsverdi';
}
const kurvAndel = R.uke?.vurdert ? Object.values(R.uke.avvist ?? {}).reduce((a, b) => a + b, 0) / R.uke.vurdert : 0.5;
let sakNr = 0;
async function nyhetsflyt() {
  while (true) {
    await flyPapir([0.2, 22.0], bord(by.speider), 900);
    snakk(by.speider, 'Ny sak!', 1000);
    await flyPapir(bord(by.speider), bord(by.vekter), 900);
    if (Math.random() < kurvAndel) {
      const grunn = trekkGrunn();
      if (!KONTROLL_STOPP.includes(grunn)) { snakk(by.vekter, KURV_REPLIKK[grunn], 1400); await flyPapir(bord(by.vekter), KURV, 700, true); continue; }
      snakk(by.vekter, 'Inn!', 1000);
      await flyPapir(bord(by.vekter), bord(by.skriver), 950); await vent(350);
      await flyPapir(bord(by.skriver), bord(by.kontroll), 950);
      snakk(by.kontroll, KURV_REPLIKK[grunn], 1400); await flyPapir(bord(by.kontroll), KURV, 900, true); continue;
    }
    const sak = (R.sisteSaker ?? [])[sakNr++ % Math.max(1, (R.sisteSaker ?? []).length)];
    snakk(by.vekter, sak?.nyhetsverdi ? `Nyhetsverdi ${sak.nyhetsverdi}. Inn!` : 'Inn!', 1300);
    for (const [a, b] of [['vekter', 'skriver'], ['skriver', 'kontroll'], ['kontroll', 'leser'], ['leser', 'tegner'], ['tegner', 'deler']]) { await flyPapir(bord(by[a]), bord(by[b]), 950); await vent(350); }
    snakk(by.deler, sak ? `Publisert: ${kort35(sak.tittel)}` : 'Publisert og delt!', 2200);
    await vent(900);
  }
}

// ---------- Kaos ----------
const pynt = el('g'); svg.insertBefore(pynt, gangere);
const effekt = el('g'); svg.insertBefore(effekt, skilt);
let kaosPaagar = false;
const tilfeldig = (liste) => liste[Math.floor(Math.random() * liste.length)];
const ropere = () => ALLE.filter((a) => !a.gaar && !a.menneske);
function rop(n, tekster) { for (let i = 0; i < n; i++) setTimeout(() => snakk(tilfeldig(ropere()), tilfeldig(tekster), 1500), i * 350); }
async function hent(...folk) { for (const a of folk) while (a.opptatt) await vent(200); folk.forEach((a) => (a.opptatt = true)); }
// Sunucu odasına koşu
const SERVERDOR = [4.0, 5.6];
const tilServer = (a, stå) => [...a.ut, [SERVERDOR[0], HALL], SERVERDOR, [SERVERDOR[0], 4.25], stå];

function rom_flamme() {
  const g = el('g', {}, effekt);
  let t0 = performance.now(), aktiv = true, styrke = 1;
  const [bx, by_] = iso(2.15, 3.0, 2.0);
  function steg(now) {
    if (!aktiv) return g.remove();
    g.innerHTML = '';
    const t = (now - t0) / 1000;
    if (styrke > 0) for (let i = 0; i < 6; i++) {
      const h = (10 + 8 * Math.abs(Math.sin(t * 9 + i))) * styrke;
      el('polygon', { points: `${bx - 14 + i * 5},${by_} ${bx - 11 + i * 5},${by_ - h} ${bx - 8 + i * 5},${by_}`, fill: i % 2 ? '#f6d23a' : '#e8630a' }, g);
    }
    for (let i = 0; i < 7; i++) {
      const s = ((t * 0.6 + i / 7) % 1);
      el('circle', { cx: bx + Math.sin(i * 2 + t) * 10 - 4, cy: by_ - 18 - s * 90, r: 5 + s * 12, fill: '#6b6f75', opacity: (1 - s) * 0.6 * Math.max(0.3, styrke) }, g);
    }
    requestAnimationFrame(steg);
  }
  requestAnimationFrame(steg);
  return { demp: (v) => (styrke = v), stopp: () => (aktiv = false) };
}
function alarmlys() {
  const [px, py] = iso(5.5, 2.5, 2.6);
  const g = el('g', {}, effekt);
  const lys = el('circle', { cx: px, cy: py, r: 9, fill: '#ff2a1a', stroke: INK, 'stroke-width': 2 }, g);
  const glod = el('rect', { x: 0, y: 0, width: 1820, height: 1200, fill: '#ff2a1a', opacity: 0 }, g);
  let på = true;
  const id = setInterval(() => { på = !på; lys.setAttribute('fill', på ? '#ff2a1a' : '#5a1a14'); glod.setAttribute('opacity', på ? 0.07 : 0); }, 300);
  return () => { clearInterval(id); g.remove(); };
}
function sprut(fra, til) {
  const g = el('g', {}, effekt);
  const t0 = performance.now();
  const id = setInterval(() => {
    const s = ((performance.now() - t0) / 400) % 1;
    const [ax, ay] = iso(...fra, 0.9), [bx, by_] = iso(...til, 1.9);
    el('circle', { cx: ax + (bx - ax) * s, cy: ay + (by_ - ay) * s, r: 4 + s * 6, fill: '#fdfdfb', opacity: 0.85 }, g);
    if (g.childNodes.length > 30) g.firstChild.remove();
  }, 60);
  return () => { clearInterval(id); g.remove(); };
}
async function serverbrann() {
  const flamme = rom_flamme(), alarm = alarmlys();
  snakk(by.drift1, 'ALARM! Det brenner i serverrommet!', 1800);
  rop(5, ['Det brenner!', 'Hva skjedde?!', 'Er sakene mine lagret?', 'Ring IT!', 'Ikke panikk!']);
  await hent(by.drift1, by.drift2);
  const r1 = tilServer(by.drift1, [2.2, 4.25]), r2 = tilServer(by.drift2, [3.4, 4.25]);
  const [f1, f2] = await Promise.all([gaaRute(by.drift1, r1, false, 0.45, true), gaaRute(by.drift2, r2, false, 0.45)]);
  snakk(by.drift1, 'Slukker!', 1400);
  const stopp = sprut([2.2, 4.25], [2.15, 3.0]);
  for (const v of [0.7, 0.4, 0.15, 0]) { flamme.demp(v); await vent(700); }
  stopp();
  snakk(by.drift1, 'Slokket!', 1400); await vent(900);
  snakk(by.drift2, 'Trekker ut kabelen …', 1400); await vent(1300);
  snakk(by.drift2, 'Starter på nytt …', 1400); await vent(1500);
  flamme.stopp(); alarm();
  snakk(by.drift2, 'Alt oppe igjen!', 1600);
  rop(3, ['Puh!', 'Takk, IT!', 'Helter!']);
  await vent(1200);
  f1(); f2();
  const [g1, g2] = await Promise.all([gaaRute(by.drift1, [...r1].reverse(), false), gaaRute(by.drift2, [...r2].reverse(), false)]);
  g1(); g2(); fri(by.drift1, by.drift2);
}
async function strombrudd() {
  const mork = el('rect', { x: 0, y: 0, width: 1820, height: 1200, fill: '#0b1220', opacity: 0.6 }, effekt);
  rop(5, ['Strømbrudd!', 'Hvem slo av lyset?', 'Jeg ser ingenting!', 'Lagret du?']);
  await hent(by.drift2);
  const r = tilServer(by.drift2, [3.4, 4.25]);
  const f = await gaaRute(by.drift2, r, false, 0.5);
  snakk(by.drift2, 'Starter aggregatet …', 1500); await vent(1500);
  for (const o of [0.2, 0.6, 0.1, 0.5, 0]) { mork.setAttribute('opacity', o); await vent(180); }
  mork.remove();
  snakk(by.drift2, 'Lyset er tilbake!', 1600);
  rop(2, ['Endelig!', 'Hurra!']);
  await vent(900); f();
  (await gaaRute(by.drift2, [...r].reverse(), false))(); fri(by.drift2);
}
async function ekstra() {
  const g = el('g', {}, effekt);
  const [px, py] = iso(18, 0, 3.9);
  const r = el('rect', { x: px - 170, y: py - 26, width: 340, height: 40, fill: '#c8281e', stroke: INK, 'stroke-width': 3 }, g);
  el('text', { x: px, y: py, 'text-anchor': 'middle', class: 'px', 'font-size': 14, fill: '#fff' }, g).textContent = 'EKSTRA · SISTE NYTT';
  const id = setInterval(() => r.setAttribute('fill', r.getAttribute('fill') === '#c8281e' ? '#16191c' : '#c8281e'), 350);
  snakk(by.speider, 'Stor sak!!', 1500); await vent(500);
  snakk(by.vekter, 'Nyhetsverdi 97!', 1500);
  rop(5, ['!!', 'Alle mann!', 'Stopp pressen!', 'Hva skjer?']);
  for (const [a, b] of [['speider', 'vekter'], ['vekter', 'skriver'], ['skriver', 'kontroll'], ['kontroll', 'leser'], ['leser', 'tegner'], ['tegner', 'deler']]) await flyPapir(bord(by[a]), bord(by[b]), 380);
  snakk(by.deler, 'Publisert på rekordtid!', 1800);
  await vent(1800); clearInterval(id); g.remove();
}
async function kaffekrise() {
  const [px, py] = iso(12.9, 1.0, 1.9);
  const tom = el('g', {}, effekt);
  el('rect', { x: px - 18, y: py - 12, width: 36, height: 16, fill: '#c8281e', stroke: INK, 'stroke-width': 2 }, tom);
  el('text', { x: px, y: py, 'text-anchor': 'middle', class: 'px', 'font-size': 8, fill: '#fff' }, tom).textContent = 'TOM';
  const folk = [...NYHET, ...SKRIV].filter((a) => !a.opptatt).sort(() => Math.random() - 0.5).slice(0, 4);
  await hent(...folk);
  const turer = await Promise.all(folk.map((a, i) => gaaRute(a, [...a.ut, [MOLA[0] + i * 0.5, HALL], [MOLA[0] + i * 0.5, MOLA[1] + (i % 2) * 0.9]], false, 0.6)));
  rop(0, []);
  folk.forEach((a, i) => setTimeout(() => snakk(a, tilfeldig(['Kaffen er tom!!', 'Nei, nei, nei!', 'Hvem drakk den siste?', 'Jeg klarer ikke uten kaffe.']), 1600), i * 300));
  await vent(1200);
  await hent(by.drift1);
  const r = [...by.drift1.ut, [MOLA[0] + 2.2, HALL], [MOLA[0] + 2.2, 2.2]];
  const f = await gaaRute(by.drift1, r, false, 0.6);
  snakk(by.drift1, 'Fikser …', 1300); await vent(1500);
  tom.remove(); snakk(by.drift1, 'Kaffe igjen!', 1500);
  folk.forEach((a, i) => setTimeout(() => snakk(a, 'Takk!!', 1200), 300 + i * 250));
  await vent(1600); f(); turer.forEach((t) => t());
  await Promise.all([...folk.map(async (a, i) => (await gaaRute(a, [...[...a.ut, [MOLA[0] + i * 0.5, HALL], [MOLA[0] + i * 0.5, MOLA[1] + (i % 2) * 0.9]]].reverse(), false))()), (async () => (await gaaRute(by.drift1, [...r].reverse(), false))())()]);
  fri(...folk, by.drift1);
}
const KAOS = { serverbrann, strombrudd, ekstra, kaffekrise };
async function kaos(navn) { if (kaosPaagar || !Object.hasOwn(KAOS, navn)) return; kaosPaagar = true; try { await KAOS[navn](); } finally { kaosPaagar = false; } }

// ---------- Mevsim ve bayram süsleri ----------
let flaggermus = null, sno = null;
function vimpel(farger, z = 3.25) {
  for (let t = 0.4; t < 35.5; t += 0.75) { const f = farger[Math.round(t / 0.75) % farger.length]; el('polygon', { points: pts([iso(t, 0.02, z), iso(t + 0.6, 0.02, z), iso(t + 0.3, 0.02, z - 0.4)]), fill: f, stroke: INK, 'stroke-width': 1 }, pynt); }
  for (let t = 0.4; t < 23.5; t += 0.75) { const f = farger[Math.round(t / 0.75) % farger.length]; el('polygon', { points: pts([iso(0.02, t, z), iso(0.02, t + 0.6, z), iso(0.02, t + 0.3, z - 0.4)]), fill: f, stroke: INK, 'stroke-width': 1 }, pynt); }
}
function paBord(fn) { for (const a of ALLE) { const [px, py] = iso(a.x + 0.25, a.y + 0.75, 0.55); fn(px, py, a); } }
function gresskar(x, y) {
  const [px, py] = iso(x, y);
  el('ellipse', { cx: px, cy: py - 8, rx: 12, ry: 9, fill: '#e8630a', stroke: INK, 'stroke-width': 1.5 }, pynt);
  el('rect', { x: px - 2, y: py - 21, width: 4, height: 5, fill: '#3f7a4a', stroke: INK, 'stroke-width': 1 }, pynt);
  el('polygon', { points: `${px - 7},${py - 10} ${px - 3},${py - 10} ${px - 5},${py - 14}`, fill: '#f6d23a' }, pynt);
  el('polygon', { points: `${px + 3},${py - 10} ${px + 7},${py - 10} ${px + 5},${py - 14}`, fill: '#f6d23a' }, pynt);
  el('rect', { x: px - 5, y: py - 6, width: 10, height: 2, fill: '#f6d23a' }, pynt);
}
function juletre(x, y) {
  const [px, py] = iso(x, y);
  el('rect', { x: px - 4, y: py - 10, width: 8, height: 10, fill: '#6b4226', stroke: INK }, pynt);
  for (let i = 0; i < 4; i++) { const w = 40 - i * 9, top = py - 10 - i * 18; el('polygon', { points: `${px - w / 2},${top} ${px + w / 2},${top} ${px},${top - 26}`, fill: '#2f6b3b', stroke: INK, 'stroke-width': 1.5 }, pynt); }
  for (let i = 0; i < 14; i++) el('circle', { class: 'led', cx: px + Math.sin(i * 2.3) * (18 - (i % 4) * 4), cy: py - 18 - i * 5, r: 2.5, fill: ['#c8281e', '#f6d23a', '#7fb2e5'][i % 3] }, pynt);
  el('polygon', { points: `${px},${py - 98} ${px + 4},${py - 90} ${px - 4},${py - 90}`, fill: '#f6d23a', stroke: INK }, pynt);
}
function lykt(t) {
  const [px, py] = iso(t, 0.02, 3.0);
  el('line', { x1: px, y1: py - 12, x2: px, y2: py, stroke: INK, 'stroke-width': 1.5 }, pynt);
  el('rect', { x: px - 6, y: py, width: 12, height: 16, fill: '#f6d23a', stroke: '#a0643c', 'stroke-width': 2 }, pynt);
  el('circle', { class: 'led', cx: px, cy: py + 8, r: 3, fill: '#e8630a' }, pynt);
}
function smaaFlagg(tegn) { paBord((px, py) => { el('line', { x1: px, y1: py, x2: px, y2: py - 22, stroke: INK, 'stroke-width': 1.5 }, pynt); tegn(px + 1, py - 22); }); }
const miniNorge = (x, y) => { el('rect', { x, y, width: 15, height: 11, fill: '#ba0c2f', stroke: INK, 'stroke-width': 0.8 }, pynt); el('rect', { x: x + 4, y, width: 3, height: 11, fill: '#fff' }, pynt); el('rect', { x, y: y + 4, width: 15, height: 3, fill: '#fff' }, pynt); el('rect', { x: x + 5, y, width: 1, height: 11, fill: '#00205b' }, pynt); el('rect', { x, y: y + 5, width: 15, height: 1, fill: '#00205b' }, pynt); };
const miniTyrkia = (x, y) => { el('rect', { x, y, width: 15, height: 11, fill: '#e30a17', stroke: INK, 'stroke-width': 0.8 }, pynt); el('circle', { cx: x + 6, cy: y + 5.5, r: 3, fill: '#fff' }, pynt); el('circle', { cx: x + 6.8, cy: y + 5.5, r: 2.4, fill: '#e30a17' }, pynt); el('rect', { x: x + 9, y: y + 4.5, width: 2, height: 2, fill: '#fff' }, pynt); };
function fly(antall, tegn, fart) {
  const g = el('g', {}, pynt); let aktiv = true;
  const t0 = performance.now();
  function steg(now) { if (!aktiv) return g.remove(); g.innerHTML = ''; const t = (now - t0) / 1000; for (let i = 0; i < antall; i++) tegn(g, t, i); requestAnimationFrame(steg); }
  requestAnimationFrame(steg);
  return () => (aktiv = false);
}
const TEMAER = {
  ingen: { navn: 'Vanlig dag', prat: [] },
  halloween: { navn: 'Halloween', prat: ['Knask eller knep!', 'Bøø!', 'Hvem tok gresskaret mitt?'], tegn() {
    vimpel(['#e8630a', '#16191c']);
    for (const [x, y] of [[3.6, 11.2], [8.4, 16.4], [13.5, 7.2], [23.2, 11], [33.6, 13.8], [18.5, 23.3], [11.2, 20.4]]) gresskar(x, y);
    const [cx, cy] = iso(0, 0, 3.4); for (let i = 0; i < 6; i++) el('line', { x1: cx, y1: cy, x2: cx + Math.cos(i * 0.3 + 0.2) * 60, y2: cy + Math.sin(i * 0.3 + 0.2) * 60, stroke: '#5a6168', 'stroke-width': 1 }, pynt);
    flaggermus = fly(5, (g, t, i) => { const x = 200 + ((t * 60 + i * 300) % 1400), y = 120 + Math.sin(t * 3 + i) * 30 + i * 18, v = Math.sin(t * 14 + i) * 6;
      el('polygon', { points: `${x - 12},${y - v} ${x},${y + 4} ${x + 12},${y - v} ${x + 4},${y} ${x},${y - 3} ${x - 4},${y}`, fill: INK }, g); });
  } },
  jul: { navn: 'Jul', prat: ['God jul!', 'Hvem stjal pepperkaken?', 'Snart juleferie!'], tegn() {
    vimpel(['#c8281e', '#2f6b3b', '#f6d23a']);
    juletre(13.6, 7.6); juletre(34.6, 15.8); juletre(24.8, 23.4);
    sno = fly(60, (g, t, i) => { const x = (i * 97) % 1820, y = ((t * 40 + i * 53) % 1200); el('circle', { cx: x + Math.sin(t + i) * 8, cy: y, r: 2 + (i % 3), fill: '#fff', opacity: 0.9 }, g); });
  } },
  syttende: { navn: '17. mai', prat: ['Hipp hipp hurra!', 'Gratulerer med dagen!', 'Is og pølser!'], tegn() { vimpel(['#ba0c2f', '#fff', '#00205b']); smaaFlagg(miniNorge); } },
  republikk: { navn: '29 Ekim', prat: ['Cumhuriyet Bayramımız kutlu olsun!', 'Gratulerer, Tyrkia!'], tegn() { vimpel(['#e30a17', '#fff']); smaaFlagg(miniTyrkia); } },
  id: { navn: 'Ramazan Bayramı', prat: ['İyi bayramlar!', 'Eid mubarak!', 'Hvem vil ha bayram-godteri?'], tegn() {
    for (let t = 1; t < 35; t += 2.2) lykt(t);
    paBord((px, py) => { el('ellipse', { cx: px, cy: py - 4, rx: 7, ry: 4, fill: '#fdfdfb', stroke: INK }, pynt); for (let i = 0; i < 3; i++) el('circle', { cx: px - 3 + i * 3, cy: py - 6, r: 1.8, fill: ['#c8281e', '#f6d23a', '#3f7a4a'][i] }, pynt); });
  } },
};
let aktivtTema = 'ingen';
function settTema(navn) {
  if (!Object.hasOwn(TEMAER, navn)) return;
  pynt.innerHTML = ''; if (flaggermus) flaggermus(); if (sno) sno(); flaggermus = sno = null;
  aktivtTema = navn; TEMAER[navn].tegn?.();
  if (TEMAER[navn].prat.length) setTimeout(() => rop(4, TEMAER[navn].prat), 600);
}
// Takvime göre: Ramazan Bayramı Umm al-Qura takviminden (Diyanet bir gün sapabilir)
function temaForDato(d = new Date()) {
  const m = d.getMonth() + 1, g = d.getDate();
  const islam = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' }).formatToParts(d);
  const im = +islam.find((p) => p.type === 'month').value, ig = +islam.find((p) => p.type === 'day').value;
  if (im === 10 && ig <= 3) return 'id';
  if (m === 10 && g >= 28 && g <= 30) return 'republikk';
  if ((m === 10 && g === 31) || (m === 11 && g === 1)) return 'halloween';
  if (m === 5 && g >= 15 && g <= 17) return 'syttende';
  if (m === 12) return 'jul';
  return 'ingen';
}
// Temalı konuşmalar arada bir
setInterval(() => { const p = TEMAER[aktivtTema].prat; if (p.length && !rolig) snakk(tilfeldig(ropere()), tilfeldig(p), 1800); }, 4200);
settTema(temaForDato());

// Düğmeler (yalnız örnekte)
// Sitenin tema düğmesi ve <html> de data-tema taşır: düğmeler yalnız sahnenin şeridinden ve kendi öznitelikleriyle.
document.querySelectorAll('.rd .knapper [data-rd-kaos]').forEach((b) => b.addEventListener('click', () => kaos(b.dataset.rdKaos)));
document.querySelectorAll('.rd .knapper [data-rd-tema]').forEach((b) => b.addEventListener('click', () => settTema(b.dataset.rdTema)));
if (!rolig) (async () => { while (true) { await vent(30000 + Math.random() * 25000); await kaos(tilfeldig(Object.keys(KAOS))); } })();

// ---------- Kaptein Ø: Şenol'un kahraman hali (özgün kahraman: fiyort mavisi pelerin, sarı daire içinde ø) ----------
function tegnHelt(parent) {
  const g = el('g', {}, parent);
  // Pelerin (figürün arkasında)
  const kappe = el('polygon', { points: `${4},${30} ${SW - 4},${30} ${SW + 14},${SH - 2} ${-14},${SH - 2}`, fill: '#0d3557', stroke: INK, 'stroke-width': 2 }, g);
  tegnFigur(by.senol.u, false, 0, g);
  // Göğüs arması
  el('circle', { cx: SW / 2, cy: 17 * P, r: 9, fill: '#f6d23a', stroke: INK, 'stroke-width': 2 }, g);
  el('text', { x: SW / 2, y: 17 * P + 5, 'text-anchor': 'middle', 'font-family': 'Archivo, sans-serif', 'font-weight': 800, 'font-size': 14, fill: '#1f5f99' }, g).textContent = 'ø';
  return { g, kappe };
}
async function kaptein() {
  const a = by.senol;
  await hent(a);
  snakk(a, 'Dette er en jobb for … KAPTEIN Ø!', 1800);
  await vent(1400);
  a.sitter.setAttribute('visibility', 'hidden');
  const [sx, sy] = iso(a.x + 0.75, a.y - 0.25);
  const lag = el('g', {}, bobler);
  // Dönüşüm: parıltı
  const glimt = el('g', {}, lag);
  for (let i = 0; i < 10; i++) el('rect', { x: sx - 2 + Math.cos(i) * 34, y: sy - SH / 2 + Math.sin(i) * 44, width: 5, height: 5, fill: i % 2 ? '#f6d23a' : '#fff', stroke: INK, 'stroke-width': 0.8 }, glimt);
  const { g, kappe } = tegnHelt(lag);
  g.setAttribute('transform', `translate(${sx - SW / 2},${sy - SH})`);
  rop(4, ['Hæ?!', 'Er det … Şenol?', 'Han flyr!', 'Kaptein Ø!']);
  await vent(900); glimt.remove();
  // Uçuş: yukarı, sayfanın dışına
  const t0 = performance.now(), varighet = 2200;
  const spor = el('g', {}, lag);
  await new Promise((ferdig) => {
    function steg(now) {
      const s = Math.min(1, (now - t0) / varighet), e = s * s;
      const x = sx - SW / 2 + e * 900, y = sy - SH - e * 1500;
      g.setAttribute('transform', `translate(${x},${y}) rotate(${-25 * Math.min(1, s * 3)} ${SW / 2} ${SH / 2})`);
      kappe.setAttribute('points', `4,30 ${SW - 4},30 ${SW + 22 + Math.sin(now / 60) * 6},${SH + 10} ${-22 + Math.sin(now / 70) * 6},${SH + 14}`);
      if (Math.random() < 0.5) { const l = el('rect', { x: x + SW / 2 - 30, y: y + SH, width: 3, height: 26, fill: '#7fb2e5', opacity: 0.7 }, spor); setTimeout(() => l.remove(), 400); }
      if (s < 1) requestAnimationFrame(steg); else ferdig();
    }
    requestAnimationFrame(steg);
  });
  rop(4, ['Hvor ble han av?!', 'Han fløy ut av siden!', 'Hvem godkjenner nå?']);
  await vent(3500);
  // Geri dönüş
  const t1 = performance.now();
  await new Promise((ferdig) => {
    function steg(now) {
      const s = Math.min(1, (now - t1) / 1800), e = 1 - (1 - s) * (1 - s);
      const x = sx - SW / 2 - 700 * (1 - e), y = sy - SH - 1200 * (1 - e);
      g.setAttribute('transform', `translate(${x},${y}) rotate(${20 * (1 - e)} ${SW / 2} ${SH / 2})`);
      if (s < 1) requestAnimationFrame(steg); else ferdig();
    }
    requestAnimationFrame(steg);
  });
  snakk(a, 'Saken er løst.', 1800);
  await vent(1200);
  lag.remove(); a.sitter.setAttribute('visibility', 'visible');
  rop(3, ['Helt!', 'Wow.', 'Tilbake til jobben, folkens.']);
  fri(a);
}
KAOS.kaptein = kaptein;

if (!rolig) { kjede(); nyhetsflyt(); forfatter(); pauser(); }
