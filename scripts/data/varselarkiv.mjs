// Farevarsel arşivi: MET MetAlerts 2.0 archive.json (ay ay) → olaylar → gün × fylke × seviye sayıları.
// Saf ve test edilebilir (varselarkiv.test.mjs); ağ işi hent-data.mjs ve varselarkiv-fyll.mjs'te.
//
// Sayım kuralı (sayfadaki "Slik teller vi" bunu anlatır):
// - Yeşil seviye, "Actual" olmayan (2024 öncesi kayıtlarda durum alanı yoktur, onlar sayılır) ve iptal kayıtları sayılmaz.
// - Bir "Alert" yeni bir olaydır. Bir "Update", aynı türden (event), aynı alandaki (karada kesişen fylke, denizde
//   aynı bölge adı) ve zaman aralığı çakışan en son olaya bağlanır; olayın seviyesi ulaştığı en yüksek seviyedir,
//   fylkeleri birleşir.
// - Bağlanacak olay bulamayan güncelleme yeni olay sayılır; yalnız ayın ilk üç gününde gönderilmişse önceki ayın
//   bir olayına ait sayılıp atlanır (arşiv aylara bölünmüş; olay ay dönümünde başlamış olabilir).
// - Olay, başlangıç gününde (Oslo saati) sayılır. Karada her fylkede bir kez, ülke toplamında bir kez.
import { fylkerFraKoder } from '../../src/lib/fylker.mjs';

const NIVA = { yellow: 'gult', orange: 'oransje', red: 'rodt' };
const RANG = { gult: 0, oransje: 1, rodt: 2 };
const OSLO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' });
const osloDag = (iso) => OSLO.format(new Date(iso));

// Kimlikteki gönderim zamanı → YYYYMMDDHHMMSS. Yeni kara kayıtları YYYYMMDDHHMMSS, deniz kayıtları YYMMDDHHMMSS,
// 2024 öncesi (CAP v1) kayıtlar YYMMDDHHMMSSmmm taşır.
function sendt(id) {
  const m = String(id).match(/\.(\d{12,})\./);
  if (!m) return '';
  const s = m[1];
  return (s.length >= 14 && s.startsWith('20') ? s : `20${s}`).slice(0, 14);
}

// Bağlanamayan güncellemenin atlandığı eşik: pencere başlangıcı + 3 gün. Pencere bir ay ('YYYY-MM', arşiv) ya da
// bir an (ISO, all.json'un son 30 günü) olabilir.
function terskelFor(vindu) {
  const start = /^\d{4}-\d{2}$/.test(vindu) ? Date.parse(`${vindu}-01T00:00:00Z`) : Date.parse(vindu);
  return new Date(start + 3 * 86_400_000).toISOString().replace(/\D/g, '').slice(0, 14);
}

const overlapp = (a, b) => a[0] < b[1] && b[0] < a[1];

/**
 * Bir pencerenin (arşiv ayı ya da all.json'un son 30 günü) kayıtlarından olaylar.
 * @param {object[]} features archive.json / all.json features
 * @param {string} vindu 'YYYY-MM' ya da pencere başlangıcı (ISO); ilk üç gün kuralı için
 * @returns {{ start: string, niva: 'gult'|'oransje'|'rodt', domene: 'land'|'hav', fylker: string[], event: string }[]}
 */
export function hendelser(features, vindu) {
  const terskel = terskelFor(vindu);
  // Kaynakta arada bozuk tarih var (29 Ekim'de Nisan 2026 arşivinde 0300 yılı): pencerenin iki ay öncesi ve
  // sonrası dışındaki başlangıçlar sayılmaz.
  const vStart = /^\d{4}-\d{2}$/.test(vindu) ? Date.parse(`${vindu}-01T00:00:00Z`) : Date.parse(vindu);
  const makul = (t) => t > vStart - 62 * 86_400_000 && t < vStart + 93 * 86_400_000;
  const kayitlar = (features ?? [])
    .map((f) => {
      const p = f?.properties ?? {};
      const farge = String(p.awareness_level ?? '').split(';')[1]?.trim();
      const [fra, til] = f?.when?.interval ?? [];
      return {
        sendt: sendt(p.id),
        type: p.type,
        status: p.status,
        niva: NIVA[farge],
        event: p.event,
        domene: p.geographicDomain === 'marine' ? 'hav' : 'land',
        fylker: fylkerFraKoder(p.county),
        area: p.area ?? '',
        tid: [Date.parse(fra), Date.parse(til)],
      };
    })
    .filter((k) => k.niva && k.event && (k.status === 'Actual' || k.status == null) && (k.type === 'Alert' || k.type === 'Update') && Number.isFinite(k.tid[0]) && Number.isFinite(k.tid[1]) && makul(k.tid[0]))
    .sort((a, b) => a.sendt.localeCompare(b.sendt));

  const ut = [];
  for (const k of kayitlar) {
    if (k.type === 'Update') {
      const samme = (h) =>
        h.event === k.event &&
        h.domene === k.domene &&
        (k.domene === 'land' ? h.fylker.some((f) => k.fylker.includes(f)) || (!h.fylker.length && !k.fylker.length) : h.area === k.area) &&
        overlapp(h.tid, k.tid);
      const h = ut.findLast(samme);
      if (h) {
        if (RANG[k.niva] > RANG[h.niva]) h.niva = k.niva;
        h.fylker = [...new Set([...h.fylker, ...k.fylker])].sort();
        h.tid = [Math.min(h.tid[0], k.tid[0]), Math.max(h.tid[1], k.tid[1])];
        continue;
      }
      if (k.sendt && k.sendt < terskel) continue;
    }
    ut.push({ niva: k.niva, event: k.event, domene: k.domene, fylker: [...k.fylker], area: k.area, tid: [...k.tid] });
  }
  return ut.map((h) => ({ start: osloDag(h.tid[0]), niva: h.niva, domene: h.domene, fylker: h.fylker, event: h.event }));
}

/** Olaylar → { 'YYYY-MM-DD': { land: { fylke: [g,o,r] }, landTotal: [g,o,r], hav: [g,o,r] } } (yalnız uyarılı günler). */
export function dagsTall(liste) {
  const dager = {};
  for (const h of liste) {
    const d = (dager[h.start] ??= { land: {}, landTotal: [0, 0, 0], hav: [0, 0, 0] });
    const i = RANG[h.niva];
    if (h.domene === 'hav') {
      d.hav[i]++;
      continue;
    }
    d.landTotal[i]++;
    for (const f of h.fylker) (d.land[f] ??= [0, 0, 0])[i]++;
  }
  return Object.fromEntries(Object.keys(dager).sort().map((k) => [k, dager[k]]));
}

/** Arşive bir ayın sonucunu yazar; diğer aylara dokunmaz, girdiyi değiştirmez. */
export function birlestirMaaned(arkiv, maaned, dager, hentet) {
  const maaneder = { ...(arkiv?.maaneder ?? {}), [maaned]: { hentet, dager } };
  return { ...(arkiv ?? {}), maaneder: Object.fromEntries(Object.keys(maaneder).sort().map((k) => [k, maaneder[k]])) };
}

const DOGN = 86_400_000;
const mnd = (d) => d.toISOString().slice(0, 7);

/**
 * MET'in arşivi yılda bir güncellenir (29 Ekim 2026'da Ocak 2019–Nisan 2026). Saklanan son arşiv ayından sonraki ayı
 * döndürür; içinde bulunulan ay ve sonrası arşivde olmaz (null). Ay henüz yayımlanmadıysa istek 400 döner; bu yüzden
 * en çok günde bir denenir (arkivForsok).
 */
export function nesteArkivmaaned(arkiv, naa = new Date()) {
  const lagret = Object.keys(arkiv?.maaneder ?? {}).sort();
  const siste = lagret.at(-1);
  let neste = '2019-01';
  if (siste) {
    const [y, m] = siste.split('-').map(Number);
    neste = mnd(new Date(Date.UTC(y, m, 1)));
  }
  if (neste >= mnd(naa)) return null;
  const forsok = Date.parse(arkiv?.arkivForsok ?? '');
  if (Number.isFinite(forsok) && naa.getTime() - forsok < DOGN) return null;
  return neste;
}

/**
 * all.json (son 30 günde gönderilen bütün uyarılar) her turda okunur. Pencerenin günleri (pencere başlangıcından
 * itibaren, Oslo günü) yeniden hesaplanıp değiştirilir; daha eski kendi günlerimiz korunur. Böylece arşivin
 * gecikmesini kendi kaydımız kapatır.
 */
export function oppdaterLopende(arkiv, features, naa = new Date()) {
  const vinduStart = new Date(naa.getTime() - 30 * DOGN).toISOString();
  const fraDag = osloDag(vinduStart);
  const gamle = arkiv?.lopende?.dager ?? {};
  const nye = dagsTall(hendelser(features, vinduStart));
  const dager = { ...Object.fromEntries(Object.entries(gamle).filter(([d]) => d < fraDag)), ...nye };
  const tidligste = arkiv?.lopende?.fra && arkiv.lopende.fra < fraDag ? arkiv.lopende.fra : fraDag;
  return {
    ...(arkiv ?? {}),
    lopende: { hentet: naa.toISOString(), fra: tidligste, dager: Object.fromEntries(Object.keys(dager).sort().map((k) => [k, dager[k]])) },
  };
}
