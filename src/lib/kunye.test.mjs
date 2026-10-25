import test from 'node:test';
import assert from 'node:assert/strict';
import { kunyeParcalari, satirParcalari } from './kunye.mjs';

test('kunyeParcalari: dört yayın adı bağlanır, gerisi düz metin', () => {
  const p = kunyeParcalari('kifobu, finfolis, JEN DUME ve tidsrøst aracılığıyla');
  assert.deepEqual(p.filter((x) => x.adres).map((x) => x.adres), [
    'https://kifobu.com/',
    'https://finfolis.com/',
    'https://jendume.com/',
    'https://tidsrost.com/',
  ]);
  assert.equal(p.map((x) => x.metin).join(''), 'kifobu, finfolis, JEN DUME ve tidsrøst aracılığıyla');
});

test('satirParcalari: parça bağlanır; parça yoksa tek düz metin', () => {
  const p = satirParcalari('Yazı, yayın ilkelerimize göre hazırlandı.', { parca: 'yayın ilkelerimize', adres: '/yayin-ilkeleri/' });
  assert.deepEqual(p, [
    { metin: 'Yazı, ' },
    { metin: 'yayın ilkelerimize', adres: '/yayin-ilkeleri/' },
    { metin: ' göre hazırlandı.' },
  ]);
  assert.deepEqual(satirParcalari('düz', undefined), [{ metin: 'düz' }]);
});
