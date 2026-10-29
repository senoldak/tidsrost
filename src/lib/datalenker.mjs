// Haberden ilgili veri sayfasına iç bağlantı: başlık ve gövdede geçen kavramlara göre en çok iki sayfa, en çok anılan
// önce. Saf ve test edilebilir (datalenker.test.mjs); artikkel sayfası "Tallene bak saken" kutusunda kullanır.
const SIDER = [
  { url: '/prisstigning/', navn: 'Prisstigningen nå', monster: /konsumpris|\bKPI\b|prisvekst|prisstigning|inflasjon/gi },
  { url: '/styringsrenten/', navn: 'Styringsrenten nå', monster: /styringsrent|\brenten\b|rentemøte|renteheving|rentekutt/gi },
  { url: '/boligpriser/', navn: 'Boligprisene nå', monster: /boligpris|bruktbolig|brukte boliger/gi },
  { url: '/arbeidsledighet/', navn: 'Arbeidsledigheten nå', monster: /arbeidsledig|\bledighet|\bAKU\b|arbeidskraftundersøkelse/gi },
  { url: '/farevarsler/', navn: 'Farevarsler i Norge', monster: /farevarsel|farevarsler/gi },
];

/** @returns {{ url: string, navn: string }[]} */
export function datasiderFor(tekst = '') {
  const s = String(tekst ?? '');
  return SIDER.map((d) => ({ url: d.url, navn: d.navn, n: (s.match(d.monster) ?? []).length }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map(({ url, navn }) => ({ url, navn }));
}
