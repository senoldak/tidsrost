// tidsrøst'ün varsayılanı açık tema (29.10.2026). Ortak motorun grafik SVG'leri (<img> olarak gömülür) kendi içinde
// cihazın koyu ayarına bakan bir @media bloğu taşır; <img> sayfanın seçtiği temayı göremez, koyu cihazda açık sayfaya
// koyu grafik düşer. Derleme sonunda dist'teki SVG'lerden bu blok silinir (astro.config.mjs, svgLys entegrasyonu).
export function koyuMediaSil(svg) {
  return String(svg).replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
}
