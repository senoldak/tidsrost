// Kaynak: mecmua/site-ortak/duzeltme/duzeltme.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duzeltmeleriUygula, duzeltmeBicimi, DUZELTME_SEMASI, EN_COK_DUZELTME } from './duzeltme.mjs';

const govde = 'Şirket 5 milyon dolar topladı. Bu gelişme sektör için önemli bir adım. Yatırımı iki fon yönetti.';

test('düzeltme birebir bulunan cümleye uygulanır; öteki alanlar ve girdi değişmez', () => {
  const alanlar = { body: govde, title: 'Başlık burada', key_points: ['Birinci madde.', 'İkinci madde.'] };
  const r = duzeltmeleriUygula(alanlar, [
    { alan: 'body', eski: 'Bu gelişme sektör için önemli bir adım.', yeni: 'Tur, şirketin ilk kurumsal yatırımı.' },
    { alan: 'key_points', eski: 'İkinci madde.', yeni: 'İkinci madde düzeldi.' },
  ]);
  assert.equal(r.uygulanan, 2);
  assert.equal(r.alanlar.body, 'Şirket 5 milyon dolar topladı. Tur, şirketin ilk kurumsal yatırımı. Yatırımı iki fon yönetti.');
  assert.deepEqual(r.alanlar.key_points, ['Birinci madde.', 'İkinci madde düzeldi.']);
  assert.equal(alanlar.body, govde, 'girdi değişmez');
  assert.deepEqual(r.atlanan, []);
});

test('bulunamayan, birden çok geçen, boş ya da bilinmeyen alanlı düzeltme atlanır', () => {
  const r = duzeltmeleriUygula({ body: 'A cümle var. A cümle var. Başka cümle.' }, [
    { alan: 'body', eski: 'A cümle var.', yeni: 'A cümlesi var.' },
    { alan: 'body', eski: 'Olmayan cümle.', yeni: 'Olmayan cümle düzeldi.' },
    { alan: 'body', eski: 'Başka cümle.', yeni: '' },
    { alan: 'spot', eski: 'Başka cümle.', yeni: 'Öteki cümle.' },
    { alan: 'body', eski: '', yeni: 'x' },
  ]);
  assert.equal(r.uygulanan, 0);
  assert.deepEqual(r.atlanan.map((a) => a.neden), [
    'eski birden çok yerde geçiyor', 'eski metinde bulunamadı', 'yeni boş (cümle silinemez)', 'bilinmeyen alan: spot', 'eski boş',
  ]);
});

test('cümleyi yarıya indiren ya da şişiren düzeltme atlanır (metin kısalamaz)', () => {
  const eski = 'Şirket bu turda toplanan parayı ürün geliştirme ve yeni pazarlara açılmak için kullanacak.';
  const r = duzeltmeleriUygula({ body: eski }, [{ alan: 'body', eski, yeni: 'Şirket parayı kullanacak.' }]);
  assert.equal(r.uygulanan, 0);
  assert.match(r.atlanan[0].neden, /^uzunluk 13 → 3 sözcük/);
  const s = duzeltmeleriUygula({ body: 'Kısa cümle burada.' }, [{ alan: 'body', eski: 'Kısa cümle burada.', yeni: 'Kısa cümle burada ve buna ek olarak pek çok ayrıntı eklendi.' }]);
  assert.equal(s.uygulanan, 0);
});

test('değişmeyen düzeltme sayılmaz; liste yoksa ya da sınırı aşarsa not düşer; $ gibi özel karakter güvenli', () => {
  assert.equal(duzeltmeleriUygula({ body: 'Aynı.' }, [{ alan: 'body', eski: 'Aynı.', yeni: 'Aynı.' }]).uygulanan, 0);
  assert.deepEqual(duzeltmeleriUygula({ body: 'x' }, null).atlanan, [{ neden: 'düzeltme listesi yok' }]);
  const cok = Array.from({ length: EN_COK_DUZELTME + 2 }, () => ({ alan: 'body', eski: 'yok', yeni: 'yok2' }));
  assert.match(duzeltmeleriUygula({ body: 'x' }, cok).atlanan[0].neden, /sınırın/);
  const r = duzeltmeleriUygula({ body: 'It raised money.' }, [{ alan: 'body', eski: 'It raised money.', yeni: 'It raised $5 ($&).' }]);
  assert.equal(r.alanlar.body, 'It raised $5 ($&).');
});

test('biçim talimatı üç dilde; şema düzeltme listesini ister', () => {
  for (const d of ['tr', 'nb', 'en']) assert.ok(duzeltmeBicimi(d).length > 100, d);
  assert.throws(() => duzeltmeBicimi('de'), /bilinmeyen dil/);
  assert.deepEqual(DUZELTME_SEMASI.required, ['duzeltmeler']);
});

test('uzunluk bütçesi: gövdeyi alt sınırın altına indirecek düzeltme atlanır, ötekiler uygulanır; az kısaltan önce', async () => {
  const { govdeSiniri } = await import('./duzeltme.mjs');
  const cumle = (i) => `Bu ${i}. cümle dokuz sözcükten oluşan sıradan bir örnek cümle.`;
  const body = Array.from({ length: 20 }, (_, i) => cumle(i + 1)).join(' ');
  const sinir = govdeSiniri(body, 0);
  assert.deepEqual(sinir, { alt: 186, ust: 224 }); // 200 sözcük: %93 ve %112
  const liste = Array.from({ length: 6 }, (_, i) => ({ alan: 'body', eski: cumle(i + 1), yeni: `Bu ${i + 1}. cümle kısa bir örnek.` })); // her biri 10 → 6 sözcük
  liste.push({ alan: 'body', eski: cumle(20), yeni: `Bu 20. cümle dokuz sözcükten oluşan sıradan bir örnek cümle oldu.` });
  const r = duzeltmeleriUygula({ body }, liste, { sinirlar: { body: sinir } });
  // Uzatan düzeltme önce, sonra kısaltanlar: 200 + 1 = 201; 201 − 4k ≥ 186 → en çok 3 kısaltma.
  assert.equal(r.uygulanan, 4);
  assert.equal(r.atlanan.filter((a) => a.neden.startsWith('uzunluk bütçesi')).length, 3);
  assert.ok(r.alanlar.body.includes('cümle oldu.'));
});

test('govdeSiniri: site alt sınırına yakın metin alt sınırın altına inemez; zaten altındaysa kısalamaz', async () => {
  const { govdeSiniri } = await import('./duzeltme.mjs');
  const metin = (n) => Array.from({ length: n }, () => 'sözcük').join(' ');
  assert.equal(govdeSiniri(metin(190), 180).alt, 183);
  assert.equal(govdeSiniri(metin(175), 180).alt, 175);
  assert.equal(govdeSiniri(metin(400), 180).alt, 372);
});
