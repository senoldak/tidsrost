import type { APIRoute } from 'astro';

// Başlıktaki eş yükselti eğrileri. Her derlemede o günün tarihinden türetilir:
// aynı gün hep aynı arazi, ertesi gün yeni bir "pafta".
const W = 1440;
const H = 200;
const STEP = 10;
const LEVELS = 13;

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function terrain(seed: number) {
  const r = rng(seed);
  const hills = Array.from({ length: 7 }, () => ({
    x: r() * W,
    y: -40 + r() * (H + 80),
    sx: 110 + r() * 260,
    sy: 70 + r() * 120,
    a: (r() < 0.25 ? -0.6 : 1) * (0.45 + r() * 0.6),
  }));
  const phase = r() * Math.PI * 2;
  return (x: number, y: number) =>
    hills.reduce((h, k) => h + k.a * Math.exp(-(((x - k.x) / k.sx) ** 2) - ((y - k.y) / k.sy) ** 2), 0) +
    0.12 * Math.sin(x / 140 + phase) * Math.cos(y / 90);
}

// Marching squares: her seviye için çizgi parçaları, sonra uç uca eklenip tek yola dönüştürülür.
function contour(field: number[][], level: number) {
  const segs: [string, string][] = [];
  const pt = (x: number, y: number) => `${Math.round(x)} ${Math.round(y)}`;
  const lerp = (a: number, b: number) => (level - a) / (b - a);
  for (let j = 0; j < field.length - 1; j++) {
    for (let i = 0; i < field[0].length - 1; i++) {
      const tl = field[j][i], tr = field[j][i + 1], br = field[j + 1][i + 1], bl = field[j + 1][i];
      const x = i * STEP, y = j * STEP;
      const e = {
        t: pt(x + lerp(tl, tr) * STEP, y),
        r: pt(x + STEP, y + lerp(tr, br) * STEP),
        b: pt(x + lerp(bl, br) * STEP, y + STEP),
        l: pt(x, y + lerp(tl, bl) * STEP),
      };
      const c = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      const pairs: Record<number, (keyof typeof e)[][]> = {
        1: [['l', 'b']], 2: [['b', 'r']], 3: [['l', 'r']], 4: [['t', 'r']], 5: [['t', 'l'], ['b', 'r']],
        6: [['t', 'b']], 7: [['t', 'l']], 8: [['t', 'l']], 9: [['t', 'b']], 10: [['t', 'r'], ['l', 'b']],
        11: [['t', 'r']], 12: [['l', 'r']], 13: [['b', 'r']], 14: [['l', 'b']],
      };
      for (const [a, b] of pairs[c] ?? []) segs.push([e[a], e[b]]);
    }
  }
  // Parçaları birleştir.
  const byEnd = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    byEnd.set(a, [...(byEnd.get(a) ?? []), k]);
    byEnd.set(b, [...(byEnd.get(b) ?? []), k]);
  });
  const used = new Set<number>();
  const paths: string[] = [];
  const next = (p: string) => (byEnd.get(p) ?? []).find((k) => !used.has(k));
  segs.forEach(([a, b], k) => {
    if (used.has(k)) return;
    used.add(k);
    const line = [a, b];
    for (let end = b, n = next(end); n !== undefined; n = next(end)) {
      used.add(n);
      end = segs[n][0] === end ? segs[n][1] : segs[n][0];
      line.push(end);
    }
    for (let start = a, n = next(start); n !== undefined; n = next(start)) {
      used.add(n);
      start = segs[n][0] === start ? segs[n][1] : segs[n][0];
      line.unshift(start);
    }
    if (line.length > 3) paths.push(`M${line[0]}L${line.slice(1).join(' ')}`);
  });
  return paths.join('');
}

export const GET: APIRoute = () => {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
  const seed = [...day].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const h = terrain(seed);
  const field: number[][] = [];
  for (let y = 0; y <= H; y += STEP) {
    const row: number[] = [];
    for (let x = 0; x <= W; x += STEP) row.push(h(x, y));
    field.push(row);
  }
  const flat = field.flat();
  const min = Math.min(...flat), max = Math.max(...flat);
  const lines = Array.from({ length: LEVELS }, (_, k) => {
    const level = min + ((k + 1) / (LEVELS + 1)) * (max - min);
    const cls = k === 0 ? 'sjo' : k % 5 === 4 ? 'tell' : 'kote';
    return `<path class="${cls}" d="${contour(field, level)}"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><style>
path{fill:none;stroke-linejoin:round;stroke-linecap:round}
.kote{stroke:#b07a55;stroke-width:.8;opacity:.6}.tell{stroke:#a0643c;stroke-width:1.5;opacity:.75}.sjo{stroke:#3a78b5;stroke-width:1.3}
@media (prefers-color-scheme:dark){.kote{stroke:#b08a6a;opacity:.7}.tell{stroke:#c49470;opacity:.9}.sjo{stroke:#7fb2e5}}
</style>${lines}</svg>`;

  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
