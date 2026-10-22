// Kaynak: mecmua/site-ortak/kok/indexnow.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adresListesi, bildir } from './indexnow.mjs';

const AYAR = { site: 'https://kifobu.com', indexnowAnahtar: '0123456789abcdef0123456789abcdef', indexnowEk: [] };

test('adresListesi: anasayfa ve ekler önce, yabancı host atılır, &amp; çözülür', () => {
  const xml = '<loc>https://kifobu.com/haber/a/?x=1&amp;y=2</loc><loc>https://baska.example/b/</loc>';
  assert.deepEqual(adresListesi({ xml, site: 'https://kifobu.com', ek: ['/en/'] }), [
    'https://kifobu.com/',
    'https://kifobu.com/en/',
    'https://kifobu.com/haber/a/?x=1&y=2',
  ]);
});

test('adresListesi: sitemap boşsa yalnız anasayfa ve ekler; tekrar yok', () => {
  assert.deepEqual(adresListesi({ xml: '', site: 'https://jendume.com', ek: ['/en/', '/tr/', '/en/'] }), [
    'https://jendume.com/',
    'https://jendume.com/en/',
    'https://jendume.com/tr/',
  ]);
  assert.deepEqual(adresListesi({ xml: '<loc> https://jendume.com/ </loc>', site: 'https://jendume.com/', ek: [] }), ['https://jendume.com/']);
});

test('adresListesi: en çok 10000 adres', () => {
  const xml = Array.from({ length: 10050 }, (_, i) => `<loc>https://kifobu.com/haber/${i}/</loc>`).join('');
  assert.equal(adresListesi({ xml, site: 'https://kifobu.com', ek: [] }).length, 10000);
});

test('bildir: gövde host/key/keyLocation/urlList taşır, durum döner', async () => {
  let giden;
  const fetchFn = async (url, opt) => {
    giden = { url, govde: JSON.parse(opt.body) };
    return new Response('', { status: 202 });
  };
  const r = await bildir({ ayar: AYAR, xml: '<loc>https://kifobu.com/haber/a/</loc>', fetchFn, log: () => {} });
  assert.equal(giden.url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(giden.govde, {
    host: 'kifobu.com',
    key: AYAR.indexnowAnahtar,
    keyLocation: `https://kifobu.com/${AYAR.indexnowAnahtar}.txt`,
    urlList: ['https://kifobu.com/', 'https://kifobu.com/haber/a/'],
  });
  assert.deepEqual(r, { adet: 2, durum: 202 });
});

test('bildir: fetch fırlatırsa { durum: null } döner, fırlatmaz', async () => {
  const satirlar = [];
  const r = await bildir({ ayar: AYAR, xml: '', fetchFn: async () => { throw new Error('ağ'); }, log: (s) => satirlar.push(s) });
  assert.deepEqual(r, { adet: 1, durum: null });
  assert.match(satirlar.join('\n'), /gönderilemedi \(ağ\)/);
});
