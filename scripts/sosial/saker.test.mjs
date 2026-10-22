import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sakOku, paylasilir, bildetekst, bildeFil, bildeUrl, varselSeviye, varselSuz, reelsDilimi, reelsSec, REELS_DILIMLERI, sakBy, etiketler, sakSorusu } from './saker.mjs';

const govde = (n) => Array.from({ length: n }, (_, i) => `ord${i}`).join(' ');
const md = (fm, n = 200) => `---\n${fm}\n---\n\n${govde(n)}\n`;
const fm = `title: "Togstreiken er over"\ndescription: "Partene er enige."\ndate: 2026-10-17T12:00:00+02:00\ncategory: okonomi\nkey_points:\n  - "Ett"\n  - "To"\ncover: ./cover.png\ncoverKreditt: "Illustrasjon: tidsrøst"`;
const simdi = Date.parse('2026-10-17T15:00:00+02:00');

test('sakOku: alanlar ve editoryal kapak ayrımı', () => {
  const s = sakOku('togstreiken', md(fm));
  assert.equal(s.tittel, 'Togstreiken er over');
  assert.deepEqual(s.punkter, ['Ett', 'To']);
  assert.equal(s.gorselKapak, false);
  assert.equal(s.indeks, true);
  assert.equal(sakOku('kart', md(fm.replace('Illustrasjon: tidsrøst', 'Kart: tidsrøst. Varselområde: MET'))).gorselKapak, true);
});

test('paylasilir: kısa (noindex), taslak, gelecek ve eski haber gitmez', () => {
  assert.equal(paylasilir(sakOku('a', md(fm)), simdi), true);
  assert.equal(paylasilir(sakOku('a', md(fm, 50)), simdi), false);
  assert.equal(paylasilir(sakOku('a', md(`${fm}\ndraft: true`)), simdi), false);
  assert.equal(paylasilir(sakOku('a', md(fm)), Date.parse('2026-10-17T11:00:00+02:00')), false);
  assert.equal(paylasilir(sakOku('a', md(fm)), Date.parse('2026-10-18T13:00:00+02:00')), false);
});

test('bildetekst Facebook: bağlantı var, etiket yok', () => {
  const t = bildetekst(sakOku('togstreiken', md(fm)), 'facebook');
  assert.match(t, /^Togstreiken er over\n\nPartene er enige\.\n\n• Ett\n• To\n\n(Hva|Hvordan)[^\n]+\n\nLes hele saken: https:\/\/tidsrost\.com\/artikkel\/togstreiken\/\?utm_source=facebook&utm_medium=social$/);
  assert.doesNotMatch(t, /#/);
});

test('bildetekst Instagram: başlık, özet, noktalar, yönlendirme ve etiketler; bağlantı yok', () => {
  const t = bildetekst(sakOku('a', md(fm)));
  assert.match(t, /\n\nLes hele saken på tidsrost\.com\n\n#nyheter #norge #økonomi$/);
  assert.doesNotMatch(t, /https?:\/\//);
});

test('görsel adları', () => {
  assert.equal(bildeFil('a/b', 'post'), 'a-b-post.png');
  assert.equal(bildeUrl('togstreiken', 'story'), 'https://tidsrost.com/sosial/togstreiken-story.png');
});

test('farevarsel: gult gitmez, oransje 24 saatte bir (en yenisi), rødt hep gider', () => {
  const h = (id, tittel) => ({ id, tittel });
  const liste = [
    h('a', 'Togstreiken er over'),
    h('b', 'Gult farevarsel for kraftige vindkast i Finnmark'),
    h('c', 'Oransje farevarsel for jordskred i Nordland'),
    h('d', 'Oransje farevarsel for svært mye regn i Troms'),
    h('e', 'Rødt farevarsel for ekstremvær'),
  ];
  assert.equal(varselSeviye({ id: 'oransje-farevarsel-for-flom' }), 'oransje');
  assert.equal(varselSeviye({ id: 'rodt-farevarsel-for-flom' }), 'rødt');
  assert.equal(varselSeviye(h('x', 'Farevarsel-systemet forklart')), null);
  assert.deepEqual(varselSuz(liste).map((s) => s.id), ['a', 'd', 'e']);
  assert.deepEqual(varselSuz(liste, 1).map((s) => s.id), ['a', 'e']);
});

test('reelsDilimi: Oslo saatiyle öğle ve akşam dilimi, yaz ve kış saati', () => {
  assert.deepEqual(reelsDilimi(Date.parse('2026-10-19T05:17:00Z')), { ...REELS_DILIMLERI[0], gun: '2026-10-19' }); // 07:17 CEST
  assert.equal(reelsDilimi(Date.parse('2026-10-19T07:17:00Z')), null); // 09:17 CEST
  assert.equal(reelsDilimi(Date.parse('2026-10-19T17:17:00Z')).ad, 'kveld'); // 19:17 CEST
  assert.equal(reelsDilimi(Date.parse('2026-11-02T05:17:00Z')), null); // 06:17 CET
  assert.equal(reelsDilimi(Date.parse('2026-11-02T07:17:00Z')).ad, 'morgen'); // 08:17 CET
  assert.equal(reelsDilimi(Date.parse('2026-11-02T19:17:00Z')).ad, 'kveld'); // 20:17 CET
});

test('reelsSec: en yüksek puan, imzalı öne, farevarsel ve eşik altı yok, dilimde bir kez', () => {
  const s = (id, ek = '') => sakOku(id, md(`${fm}${ek}`));
  const dilim = { ad: 'kveld', esik: 80, gun: '2026-10-17' };
  const saker = [s('zayif', '\nnyhetsverdi: 75'), s('guclu', '\nnyhetsverdi: 88'), sakOku('varsel', md(`${fm.replace('Togstreiken er over', 'Oransje farevarsel for regn')}\nnyhetsverdi: 95`))];
  assert.equal(reelsSec(saker, {}, dilim).id, 'guclu');
  assert.equal(reelsSec([...saker, s('forklart', '\nauthor: "Şenol Dak"')], {}, dilim).id, 'forklart');
  assert.equal(reelsSec([saker[0]], {}, dilim), null);
  assert.equal(reelsSec([saker[0]], {}, { ...dilim, ad: 'morgen', esik: 70 }).id, 'zayif');
  assert.equal(reelsSec(saker, { guclu: { reels: { gun: '2026-10-17', dilim: 'kveld' } } }, dilim), null);
  assert.equal(reelsSec(saker, { guclu: { reels: { gun: '2026-10-16', dilim: 'kveld' } } }, dilim), null);
  assert.equal(reelsSec(saker, { guclu: { reels: { gun: '2026-10-16', dilim: 'kveld' } } }, { ...dilim, esik: 70 }).id, 'zayif');
});

test('sakBy ve etiketler: şehir kelime olarak aranır, en çok 5 Norveççe etiket', () => {
  const s = (tittel, ek = '') => sakOku('x', md(`${fm.replace('Togstreiken er over', tittel)}${ek}`));
  assert.equal(sakBy(s('Ny bybane i Bergen åpner')), 'Bergen');
  assert.equal(sakBy(s('Tromsø får nytt sykehus')), 'Tromsø');
  assert.equal(sakBy(s('Oslobørsen stiger')), null);
  assert.deepEqual(etiketler(s('Ny bybane i Bergen åpner', '\nsjanger: forklart')), ['#nyheter', '#norge', '#økonomi', '#bergen', '#forklart']);
  assert.deepEqual(etiketler(s('Ny bybane i Bergen åpner', '\nsjanger: analyse')), ['#nyheter', '#norge', '#økonomi', '#bergen', '#analyse']);
});

test('sakSorusu: ölüm, kaza ve suç haberinde soru yok', () => {
  const s = (tittel) => sakOku('x', md(fm.replace('Togstreiken er over', tittel)));
  assert.ok(sakSorusu(s('Togstreiken er over')));
  assert.equal(sakSorusu(s('Mann funnet omkommet etter ulykke')), null);
  assert.equal(sakSorusu(s('To døde i brann i Bodø')), null);
  // 20 Ekim: Gaza'da can kaybı haberine soru eklendi
  assert.equal(sakSorusu(s('FN advarer om vold og tap av liv i Gaza')), null);
  assert.equal(sakSorusu(s('Angrepene har krevd flere menneskeliv')), null);
  assert.equal(sakSorusu(s('Mann mistet livet i trafikken')), null);
  assert.equal(sakSorusu(s('Millioner rammes av sult i Afghanistan')), null);
});

test('sakBy: yalnız ana noktada geçen şehir haberi o şehre bağlamaz (22 Ekim, ulusal kürtaj haberi #tromsø aldı)', () => {
  const sak = { tittel: 'Abortventetiden varierer kraftig ved norske sykehus', ingress: 'Store forskjeller mellom sykehusene.', punkter: ['Universitetssykehuset i Tromsø venter til uke ni'] };
  assert.equal(sakBy(sak), null);
  assert.equal(sakBy({ ...sak, ingress: 'I Tromsø må kvinner vente lengst.' }), 'Tromsø');
});
