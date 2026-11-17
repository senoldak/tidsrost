// Yazar sayfasındaki yıl yıl gün ızgarası (GitHub katkı ızgarası gibi): her yıl bir satır, haftalar sütun,
// günler (pazartesi–pazar) satır. Her gün dört parçalı bir kutu; her site kendi parçasında.
// Günler Oslo saatine göre sayılır.
// egen dönem: gün gün kaydı olmayan dönem (sahibinin kendi anlatımı, 17.11.2026). O günlerde egneSider dolu gösterilir ve
// hücre `egen: true` taşır; sayfa bunları açık tonda ve notla gösterir, kayıtlı günlerden ayırır.
const DAG = 86400000;

export const osloDag = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
// 'YYYY-MM-DD' -> UTC öğlen (gün hesabı saat diliminden etkilenmesin).
const middag = (key) => new Date(`${key}T12:00:00Z`);
const ukedag = (key) => (middag(key).getUTCDay() + 6) % 7; // 0 = mandag
const pluss = (key, n) => osloDag(+middag(key) + n * DAG);

/**
 * poster: [{ date, site }]. egen: { fra: 'YYYY-MM-DD', til: 'YYYY-MM-DD', sider: [...] } ya da null.
 * Döner: [{ aar, uker: [[{ key, siter, egen, fremtid? } | null]*7], maaneder: [{ kol, mnd }] }]; null = yılın/aralığın dışında,
 * fremtid = bugünden sonraki gün (boş kutu).
 */
export function aarsRutenett(poster, egen = null, na = new Date()) {
  const perDag = new Map();
  for (const p of poster) {
    const k = osloDag(p.date);
    perDag.set(k, new Set([...(perDag.get(k) ?? []), p.site]));
  }
  const kayitli = [...perDag.keys()].sort();
  if (kayitli.length === 0 && !egen) return [];
  const idag = osloDag(na);
  const start = egen?.fra && (!kayitli[0] || egen.fra < kayitli[0]) ? egen.fra : kayitli[0];

  const rader = [];
  for (let aar = Number(start.slice(0, 4)); aar <= Number(idag.slice(0, 4)); aar++) {
    const forste = aar === Number(start.slice(0, 4)) ? start : `${aar}-01-01`;
    const siste = `${aar}-12-31`; // içinde bulunulan yıl da aralık sonuna kadar; gelecek günler boş kutu (fremtid)
    const uker = [];
    const maaneder = [];
    let forrigeMnd = '';
    for (let mandag = pluss(forste, -ukedag(forste)); mandag <= siste; mandag = pluss(mandag, 7)) {
      const uke = [];
      for (let i = 0; i < 7; i++) {
        const key = pluss(mandag, i);
        if (key < forste || key > siste) {
          uke.push(null);
          continue;
        }
        if (key > idag) {
          uke.push({ key, siter: [], egen: false, fremtid: true });
          continue;
        }
        const erEgen = !!egen && key >= egen.fra && key <= egen.til;
        const siter = erEgen ? [...egen.sider] : [...(perDag.get(key) ?? [])];
        uke.push({ key, siter, egen: erEgen });
      }
      const forsteDag = uke.find(Boolean);
      const mnd = forsteDag?.key.slice(0, 7);
      if (mnd && mnd !== forrigeMnd) maaneder.push({ kol: uker.length, mnd });
      if (mnd) forrigeMnd = mnd;
      uker.push(uke);
    }
    rader.push({ aar, uker, maaneder });
  }
  return rader.reverse(); // en yeni yıl üstte
}
