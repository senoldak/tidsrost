// Kaynak: mecmua/site-ortak/ozet/gunun-ozeti.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  istanbulGunu, ozetSlug, trTarih, OZET_SEMASI, ozetIstemi, paragrafDenetle, paragrafKisalt, yedekParagraf,
  kapakSirasi, listeSigdir, ozetBildir, osloGunu, siteDili,
} from './gunun-ozeti.mjs';

const H = [
  { id: 'mirendil', baslik: 'Mirendil, Seri A turunda 1 milyar dolar yatırım aldı', ozet: 'Yapay zekâ araştırma araçları geliştiren Mirendil, Kleiner Perkins ve Clearlake Capital liderliğinde 1 milyar dolar Seri A yatırım topladı.' },
  { id: 'qctrl', baslik: 'Q-CTRL, Seri C turunda 290 milyon dolar yatırım alarak unicorn unvanı kazandı', ozet: 'Kuantum yazılım girişimi Q-CTRL 290 milyon dolar toplayarak 1,4 milyar dolar değerlemeye ulaştı.' },
  { id: 'norwest', baslik: 'Norwest Venture Partners 4 milyar dolar büyüklüğünde yeni fon oluşturdu', ozet: '4 milyar dolarlık Norwest 18 fonunu tamamladı.' },
];

test('istanbulGunu: 21:30Z ertesi gün', () => assert.equal(istanbulGunu(new Date('2026-11-13T21:30:00Z')), '2026-11-14'));
test('istanbulGunu: 20:30Z aynı gün', () => assert.equal(istanbulGunu(new Date('2026-11-13T20:30:00Z')), '2026-11-13'));
test('ozetSlug ve trTarih', () => {
  assert.equal(ozetSlug('2026-11-13'), 'gunun-ozeti-2026-11-13');
  assert.equal(trTarih('2026-11-13'), '13 Kasım 2026');
  assert.equal(trTarih('2026-03-01'), '1 Mart 2026');
});

test('OZET_SEMASI: paragraf ve kimlikler zorunlu', () => assert.deepEqual(OZET_SEMASI.required, ['paragraf', 'kimlikler']));

test('ozetIstemi: konu siteye göre, haberler bloklar hâlinde', () => {
  const { sistem, istem } = ozetIstemi({ site: 'jendume', haberler: H.slice(0, 1) });
  assert.match(sistem, /Konu: yapay zekâ\./);
  assert.match(sistem, /yatırım tavsiyesi verme/);
  assert.equal(istem, `kimlik: mirendil\nbaşlık: ${H[0].baslik}\nözet: ${H[0].ozet}`);
  assert.throws(() => ozetIstemi({ site: 'bilinmeyen', haberler: H }), /site/);
});

test('paragrafDenetle: kaynaktaki rakam ve adlar geçerli', () => {
  const p = "Günün en büyük turu Mirendil'den geldi. Şirket, Kleiner Perkins ve Clearlake Capital liderliğinde 1 milyar dolar Seri A yatırımı aldı. Q-CTRL 290 milyon dolarlık turla 1,4 milyar dolar değerlemeye ulaştı.";
  assert.deepEqual(paragrafDenetle({ paragraf: p, kimlikler: ['mirendil', 'qctrl'], haberler: H }), { gecerli: true, sorunlar: [] });
});
test('paragrafDenetle: uydurma rakam reddedilir', () => {
  const r = paragrafDenetle({ paragraf: 'Mirendil 2 milyar dolar topladı. Tur bir Seri A turuydu. Q-CTRL de yatırım aldı.', kimlikler: ['mirendil', 'qctrl'], haberler: H });
  assert.equal(r.gecerli, false);
  assert.match(r.sorunlar.join(' '), /rakam: 2/);
});
test('paragrafDenetle: uydurma özel ad reddedilir', () => {
  const r = paragrafDenetle({ paragraf: 'Mirendil, Sequoia liderliğinde 1 milyar dolar aldı. Tur Seri A idi. Q-CTRL de yatırım aldı.', kimlikler: ['mirendil', 'qctrl'], haberler: H });
  assert.equal(r.gecerli, false);
  assert.match(r.sorunlar.join(' '), /ad: Sequoia/);
});
test('paragrafDenetle: tümce başındaki karışık büyük harfli ad da denetlenir', () => {
  const p = 'OpenAI, Seri A turunda 1 milyar dolar yatırım aldı. Q-CTRL 290 milyon dolar topladı ve büyüdü. Mirendil yapay zekâ araştırma araçları geliştiriyor.';
  const r = paragrafDenetle({ paragraf: p, kimlikler: ['mirendil', 'qctrl'], haberler: H });
  assert.equal(r.gecerli, false);
  assert.match(r.sorunlar.join(' '), /ad: OpenAI/);
});
test('paragrafDenetle: seçilmeyen haberin rakamı da reddedilir', () => {
  const r = paragrafDenetle({ paragraf: 'Mirendil 1 milyar dolar aldı. Norwest 4 milyar dolarlık fon kurdu. Bu hafta yatırım çoktu.', kimlikler: ['mirendil'], haberler: H });
  assert.equal(r.gecerli, false);
});
test('paragrafDenetle: bilinmeyen kimlik, üç nokta, hitap reddedilir', () => {
  const ok = 'Mirendil, Seri A turunda 1 milyar dolar yatırım aldı. Q-CTRL 290 milyon dolar toplayarak 1,4 milyar dolar değerlemeye ulaştı. Norwest Venture Partners 4 milyar dolarlık yeni fonunu tamamladı.';
  assert.equal(paragrafDenetle({ paragraf: ok, kimlikler: ['yok'], haberler: H }).gecerli, false);
  assert.equal(paragrafDenetle({ paragraf: ok.replace(/\.$/, '…'), kimlikler: ['mirendil', 'qctrl', 'norwest'], haberler: H }).gecerli, false);
  assert.equal(paragrafDenetle({ paragraf: ok + ' Ayrıntılar için sizi sayfaya bekliyoruz.', kimlikler: ['mirendil', 'qctrl', 'norwest'], haberler: H }).gecerli, false);
  assert.equal(paragrafDenetle({ paragraf: ok, kimlikler: ['mirendil', 'qctrl', 'norwest'], haberler: H }).gecerli, true);
});
test('paragrafDenetle: tek tümce ve 6 kimlik reddedilir', () => {
  assert.equal(paragrafDenetle({ paragraf: 'Mirendil 1 milyar dolar aldı ve Q-CTRL 290 milyon dolar topladı ve Norwest fon kurdu.', kimlikler: ['mirendil'], haberler: H }).gecerli, false);
  assert.equal(paragrafDenetle({ paragraf: 'Mirendil 1 milyar dolar aldı. Q-CTRL büyüdü. Norwest fon kurdu.', kimlikler: ['a', 'b', 'c', 'd', 'e', 'f'], haberler: H }).gecerli, false);
});

test('paragrafKisalt: tümce sınırında keser, kısaysa dokunmaz', () => {
  const p = `${'A'.repeat(300)}. ${'B'.repeat(300)}. ${'C'.repeat(100)}.`;
  assert.equal(paragrafKisalt(p, 600), `${'A'.repeat(300)}.`);
  assert.equal(paragrafKisalt('Kısa. Metin.', 600), 'Kısa. Metin.');
});

test('yedekParagraf: ilk üç başlık', () => {
  assert.deepEqual(yedekParagraf(H), {
    paragraf: 'Günün öne çıkanları: Mirendil, Seri A turunda 1 milyar dolar yatırım aldı. Q-CTRL, Seri C turunda 290 milyon dolar yatırım alarak unicorn unvanı kazandı. Norwest Venture Partners 4 milyar dolar büyüklüğünde yeni fon oluşturdu.',
    kimlikler: ['mirendil', 'qctrl', 'norwest'],
  });
});

test('kapakSirasi: seçilenler önce, kalanlar yayın sırasıyla', () => {
  assert.deepEqual(kapakSirasi(H, ['norwest']).map((h) => h.id), ['norwest', 'mirendil', 'qctrl']);
  assert.deepEqual(kapakSirasi(H, ['yok', 'qctrl']).map((h) => h.id), ['qctrl', 'mirendil', 'norwest']);
});

test('listeSigdir: 2 satırı aşan atlanır, alan dolunca durur, kalan sayılır', () => {
  const satirla = (b) => (b.length > 40 ? ['x', 'y', 'z'] : b.length > 20 ? ['x', 'y'] : ['x']);
  const r = listeSigdir({ basliklar: ['kısa', 'a'.repeat(30), 'b'.repeat(50), 'c', 'd', 'e'], toplam: 9, satirla, sigar: (o) => o.reduce((t, x) => t + x.satirlar.length, 0) <= 4 });
  assert.deepEqual(r.ogeler.map((o) => o.baslik), ['kısa', 'a'.repeat(30), 'c']);
  assert.equal(r.kalan, 6);
});
test('listeSigdir: en çok 4 öğe', () => {
  const r = listeSigdir({ basliklar: ['a', 'b', 'c', 'd', 'e'], toplam: 5, satirla: () => ['x'], sigar: () => true });
  assert.equal(r.ogeler.length, 4);
  assert.equal(r.kalan, 1);
});

test('ozetBildir: yazilar gövdesi', async () => {
  let g;
  const f = async (u, i) => {
    g = { u, b: JSON.parse(i.body), a: i.headers.Authorization };
    return new Response('{}');
  };
  const ok = await ozetBildir({ url: 'https://saat.example', anahtar: 'k', site: 'kifobu', sayfaUrl: 'https://kifobu.com/gunun-ozeti/2026-11-13/', simdi: new Date('2026-11-13T17:50:00Z'), fetchFn: f });
  assert.equal(ok, true);
  assert.equal(g.u, 'https://saat.example/motor/kifobu/kaydet');
  assert.equal(g.a, 'Bearer k');
  assert.deepEqual(g.b, { yazilar: [{ slug: 'gunun-ozeti-2026-11-13', url: 'https://kifobu.com/gunun-ozeti/2026-11-13/', tarih: '2026-11-13T17:50:00.000Z' }] });
});
test('ozetBildir: ağ hatası ya da 4xx false, fırlatmaz', async () => {
  assert.equal(await ozetBildir({ url: 'https://saat.example', anahtar: 'k', site: 'kifobu', sayfaUrl: 'x', fetchFn: async () => { throw new Error('ağ'); } }), false);
  assert.equal(await ozetBildir({ url: 'https://saat.example', anahtar: 'k', site: 'kifobu', sayfaUrl: 'x', fetchFn: async () => new Response('{}', { status: 400 }) }), false);
  assert.equal(await ozetBildir({ url: '', anahtar: 'k', site: 'kifobu', sayfaUrl: 'x', fetchFn: async () => new Response('{}') }), false);
});

test('ozetBildir: geçici hata üç kez denenir', async () => {
  let n = 0;
  const f = async () => (++n < 3 ? new Response('{}', { status: 503 }) : new Response('{}'));
  assert.equal(await ozetBildir({ url: 'https://saat.example', anahtar: 'k', site: 'kifobu', sayfaUrl: 'x', fetchFn: f, bekle: async () => {} }), true);
  assert.equal(n, 3);
  let m = 0;
  assert.equal(await ozetBildir({ url: 'https://saat.example', anahtar: 'k', site: 'kifobu', sayfaUrl: 'x', fetchFn: async () => (m++, new Response('{}', { status: 500 })), bekle: async () => {} }), false);
  assert.equal(m, 3);
});

// tidsrost: Dagens oppsummering (Norveççe).
const NB = [
  { id: 'trafikk', baslik: '106 omkom i trafikken i 2025 – 19 flere enn året før', ozet: 'Antall drepte i trafikken økte fra 87 til 106 i 2025, viser SSB.' },
  { id: 'oslos', baslik: 'Oslo S rammet av jordfeil og togavsporing', ozet: 'Togtrafikken ved Oslo S ble stanset fredag morgen etter en jordfeil.' },
  { id: 'kronen', baslik: 'Kronen svekket seg denne uken', ozet: 'En euro kostet 10,57 kroner, 4 øre mer enn en uke tidligere.' },
];
const NB_GECERLI = 'Antall drepte i trafikken økte fra 87 til 106 i 2025, viser SSB. Togtrafikken ved Oslo S ble stanset fredag morgen etter en jordfeil. Kronen svekket seg denne uken, og en euro kostet 10,57 kroner.';

test('osloGunu ve siteDili', () => {
  assert.equal(osloGunu(new Date('2026-11-13T23:30:00Z')), '2026-11-14');
  assert.equal(osloGunu(new Date('2026-11-13T22:30:00Z')), '2026-11-13');
  assert.equal(siteDili('tidsrost'), 'nb');
  assert.equal(siteDili('kifobu'), 'tr');
});

test('ozetIstemi: tidsrost istemi bokmål, alanlar id/tittel/ingress', () => {
  const { sistem, istem } = ozetIstemi({ site: 'tidsrost', haberler: NB.slice(0, 1) });
  assert.match(sistem, /bokmål/);
  assert.match(istem, /^id: trafikk\ntittel: 106 omkom/);
});

test('paragrafDenetle nb: geçerli paragraf; uydurma ad ve rakam, du-hitabı reddedilir', () => {
  const k = ['trafikk', 'oslos', 'kronen'];
  assert.deepEqual(paragrafDenetle({ paragraf: NB_GECERLI, kimlikler: k, haberler: NB, dil: 'nb' }), { gecerli: true, sorunlar: [] });
  const uydurma = paragrafDenetle({ paragraf: NB_GECERLI.replace('Oslo S', 'Bergen stasjon').replace('10,57', '11,20'), kimlikler: k, haberler: NB, dil: 'nb' });
  assert.ok(uydurma.sorunlar.includes('ad: Bergen'));
  assert.ok(uydurma.sorunlar.includes('rakam: 11,20'));
  assert.ok(paragrafDenetle({ paragraf: `${NB_GECERLI} Dette bør du vite om trafikken.`, kimlikler: k, haberler: NB, dil: 'nb' }).sorunlar.includes('okura hitap'));
});

test('paragrafDenetle nb: Æ/Ø/Å ile başlayan uydurma ad da yakalanır', () => {
  const r = paragrafDenetle({ paragraf: NB_GECERLI.replace('Oslo S', 'Ålesund'), kimlikler: ['trafikk', 'oslos', 'kronen'], haberler: NB, dil: 'nb' });
  assert.ok(r.sorunlar.includes('ad: Ålesund'));
});

test('yedekParagraf nb', () => {
  assert.match(yedekParagraf(NB, 'nb').paragraf, /^Dagens viktigste saker: 106 omkom/);
});

test('ozetBildir: verilen slug gövdeye gider', async () => {
  let govde;
  await ozetBildir({ url: 'https://saat.example', anahtar: 'a', site: 'tidsrost', sayfaUrl: 'https://tidsrost.com/oversikt/2026-11-13/morgen/', slug: 'oversikt-2026-11-13-morgen', fetchFn: async (_, i) => ((govde = JSON.parse(i.body)), new Response('{}')) });
  assert.equal(govde.yazilar[0].slug, 'oversikt-2026-11-13-morgen');
});
