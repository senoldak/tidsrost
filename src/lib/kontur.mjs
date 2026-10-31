// Eş yükselti motifi (7 halka, 3. su mavisi). Aynı seed her zaman aynı SVG'yi verir.
export function konturSvg(seed = 0) {
  const s = Number(seed) || 0;
  let p = '';
  for (let i = 1; i <= 7; i++) {
    const r = i * 15;
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const rr = r * (1 + 0.12 * Math.sin(a * 3 + i * 0.7 + s) + 0.06 * Math.cos(a * 5 - i - s * 0.5));
      pts.push(`${(150 + rr * Math.cos(a)).toFixed(1)},${(20 + rr * 0.72 * Math.sin(a)).toFixed(1)}`);
    }
    const vann = i === 3;
    p += `<polyline points="${pts.join(' ')}" fill="none" stroke="${vann ? '#1f5f99' : '#a8643a'}" stroke-width="${vann ? 1.6 : 1}" opacity="${vann ? 0.9 : 0.55}"/>`;
  }
  return `<svg class="na-kontur" viewBox="0 0 160 120" aria-hidden="true">${p}</svg>`;
}
