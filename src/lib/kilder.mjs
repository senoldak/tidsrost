// Haberin kaynak listesi ({ navn, url }): temizleme ve "Bygger på ..." satırı.
// Kaynak adları ve adresleri yalnız frontmatter'daki `kilder` alanında ve kaynak satırında görünür; haber metninde medya adı geçmez.

// Boşları atar, aynı adresi ve aynı adı tekilleştirir, utm_* parametrelerini siler, http: -> https:. Sıra korunur.
// `lisens` (resmî kaynakta NLOD gibi) varsa korunur.
export function normaliserKilder(liste) {
  const ut = [];
  const sett = { url: new Set(), navn: new Set() };
  for (const k of Array.isArray(liste) ? liste : []) {
    const navn = String(k?.navn ?? '').replace(/\s+/g, ' ').trim();
    const rå = String(k?.url ?? '').trim();
    if (!navn || !rå) continue;
    let u;
    try {
      u = new URL(rå);
    } catch {
      continue;
    }
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:' || u.username || u.password) continue;
    for (const p of [...u.searchParams.keys()]) if (/^utm_/i.test(p)) u.searchParams.delete(p);
    const url = u.href;
    const nokkelNavn = navn.toLocaleLowerCase('nb');
    if (sett.url.has(url) || sett.navn.has(nokkelNavn)) continue;
    sett.url.add(url);
    sett.navn.add(nokkelNavn);
    const lisens = String(k.lisens ?? '').trim();
    ut.push({ navn, url, ...(lisens && { lisens }) });
  }
  return ut;
}

const TALL = { 2: 'to', 3: 'tre', 4: 'fire', 5: 'fem', 6: 'seks', 7: 'sju', 8: 'åtte', 9: 'ni', 10: 'ti' };
const tallOrd = (n) => TALL[n] ?? String(n);

// ki-medier: "Bygger på saker fra A og to andre medier." (0 andre: "Bygger på en sak fra A.", 1 annet: "... og ett annet medium.")
// ki-kontrollert/ki-automatisk/automatisk: "Bygger på en melding fra A."
// Kilde yoksa: ki-medier "Kildene ble ikke lagret for denne saken.", ötekiler null.
export function kildelinje(kilder, produksjon) {
  const liste = Array.isArray(kilder) ? kilder.filter((k) => k?.navn) : [];
  if (produksjon === 'ki-medier') {
    if (!liste.length) return 'Kildene ble ikke lagret for denne saken.';
    const ilk = liste[0].navn;
    const andre = liste.length - 1;
    if (andre === 0) return `Bygger på en sak fra ${ilk}.`;
    if (andre === 1) return `Bygger på saker fra ${ilk} og ett annet medium.`;
    return `Bygger på saker fra ${ilk} og ${tallOrd(andre)} andre medier.`;
  }
  if (['ki-kontrollert', 'ki-automatisk', 'automatisk'].includes(produksjon) && liste.length) {
    return `Bygger på en melding fra ${liste[0].navn}.`;
  }
  return null;
}
