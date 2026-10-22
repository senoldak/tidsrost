import test from 'node:test';
import assert from 'node:assert/strict';
import { ara, kelimeler, normalle } from './arama-cekirdek.mjs';

test('normalle: Türkçe ve Norveççe harfler, aksan ve noktalama', () => {
  assert.equal(normalle('Döviz KURU, İşçi ığdır!'), 'doviz kuru isci igdir');
  assert.equal(normalle('Øvre Årdal / Ærlig'), 'ovre ardal aerlig');
  assert.equal(normalle('S&P 500 %3,7'), 's p 500 3 7');
});

test('kelimeler: tek harfli parçalar atılır', () => {
  assert.deepEqual(kelimeler('a ABD faiz'), ['abd', 'faiz']);
});

const K = [
  { t: 'Fed faizi sabit tuttu', d: 'Merkez bankası beklentiye uydu.', k: 'Ekonomi', u: '/haber/a/', z: '2026-10-10' },
  { t: 'Dolar kuru rekor kırdı', d: 'Döviz piyasasında faiz beklentisi etkili oldu.', k: 'Döviz & Altın', u: '/haber/b/', z: '2026-10-12' },
  { t: 'Enflasyon yüzde 3,7', d: 'ABD tüketici fiyatları yükseldi; Fed faiz artırabilir.', k: 'Ekonomi', u: '/haber/c/', z: '2026-10-15' },
];

test('ara: tüm kelimeler geçmeli, başlıkta geçen önce, eşitlikte yeni önce', () => {
  assert.deepEqual(ara(K, 'faiz').map((x) => x.u), ['/haber/a/', '/haber/c/', '/haber/b/']);
  assert.deepEqual(ara(K, 'fed faiz').map((x) => x.u), ['/haber/a/', '/haber/c/']);
  assert.deepEqual(ara(K, 'doviz').map((x) => x.u), ['/haber/b/']);
  assert.deepEqual(ara(K, 'enflas').map((x) => x.u), ['/haber/c/']);
  assert.deepEqual(ara(K, 'ekonomi fed').length, 2);
  assert.deepEqual(ara(K, 'yok böyle'), []);
  assert.deepEqual(ara(K, ' '), []);
});
