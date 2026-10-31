// Baş-omuz portresi (statik SVG, ink konturlu). sprite() redaksjonen-oyun.html'den birebir.
const INK = '#16191c';

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

// u: görünüm parametreleri, ki: true ise kırmızı KI yaka kartı, P: piksel boyutu.
export function portrett(u, ki, P = 3) {
  const g = sprite(u, ki, 0).slice(0, 16); // baş + omuz
  const H = g.length, W = g[0].length;
  const renk = { H: u.sacRenk, S: u.ten, E: INK, b: INK, M: '#9e4b3f', T: u.ust, t: u.ustGolge ?? u.ust, J: u.ceket ?? u.ust, C: u.yaka ?? '#fdfdfb', P: '#2d3135', B: INK, G: INK, L: '#c8281e', K: '#fdfdfb', k: '#c8281e' };
  const dolu = (r, c) => r >= 0 && r < H && c >= 0 && c < W && g[r][c];
  let s = '';
  for (let r = -1; r <= H; r++) for (let c = -1; c <= W; c++) if (!dolu(r, c) && r < H && (dolu(r - 1, c) || dolu(r + 1, c) || dolu(r, c - 1) || dolu(r, c + 1))) s += `<rect x="${(c + 1) * P}" y="${(r + 1) * P}" width="${P}" height="${P}" fill="${INK}"/>`;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g[r][c]) s += `<rect x="${(c + 1) * P}" y="${(r + 1) * P}" width="${P}" height="${P}" fill="${renk[g[r][c]]}"/>`;
  return `<svg viewBox="0 0 ${(W + 2) * P} ${(H + 1) * P}" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
}
