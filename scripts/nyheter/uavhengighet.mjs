// Aynı olayı anlatan sitelerin kaç tanesi gerçekten bağımsız?
// Ajans (NTB, ANB) metni birçok sitede neredeyse aynen çıkar; bunlar tek kaynak sayılır.
// İki metin aynı kaynaktan sayılır: aynı site, ikisinde de ajans imzası, ya da 3 kelimelik dizilerin yarısı ortak.

const BYRA = /(?<![\p{L}\d])(NTB|ANB)(?![\p{L}\d])/u;
const BENZERLIK = 0.5;

const ord = (t) => t.toLowerCase().match(/[\p{L}\d]+/gu) ?? [];

function triplets(tekst) {
  const o = ord(tekst);
  const ut = new Set();
  for (let i = 0; i + 2 < o.length; i++) ut.add(`${o[i]} ${o[i + 1]} ${o[i + 2]}`);
  return ut;
}

/** Jaccard benzerliği (0–1); kısa metinlerde küçük olanın boyutuna göre (biri ötekinin kısaltması olabilir). */
export function likhet(a, b) {
  const x = triplets(a);
  const y = triplets(b);
  if (x.size < 3 || y.size < 3) return 0;
  let felles = 0;
  for (const t of x) if (y.has(t)) felles++;
  return felles / Math.min(x.size, y.size);
}

/** Saklar: { medie, tittel, ingress, tekst? }. Döner: bağımsız kaynak sayısı. */
export function uavhengigeKilder(saker) {
  const tekst = saker.map((s) => [s.tittel, s.ingress, s.tekst?.slice(0, 1500)].filter(Boolean).join(' '));
  const byra = tekst.map((t) => BYRA.test(t));
  const forelder = saker.map((_, i) => i);
  const rot = (i) => (forelder[i] === i ? i : (forelder[i] = rot(forelder[i])));
  for (let i = 0; i < saker.length; i++) {
    for (let j = i + 1; j < saker.length; j++) {
      const samme = saker[i].medie === saker[j].medie || (byra[i] && byra[j]) || likhet(tekst[i], tekst[j]) >= BENZERLIK;
      if (samme) forelder[rot(i)] = rot(j);
    }
  }
  return new Set(saker.map((_, i) => rot(i))).size;
}
