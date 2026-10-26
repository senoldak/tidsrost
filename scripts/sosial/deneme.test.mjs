import test from 'node:test';
import assert from 'node:assert/strict';
import { AZAMI_DENEME, SINIR_ILK_MS, SINIR_TAVAN_MS, eksikKanallar, hataIsle, limitHatasi, sinirde, sinirKaydet } from './deneme.mjs';

const KANALLAR = ['ig_post', 'ig_story', 'fb_post', 'fb_story'];
const LIMIT = 'kap: Graph 403: Application request limit reached (#4/2207051)';

test('limitHatasi: Meta uygulama sınırı tanınır, öteki hatalar değil', () => {
  assert.equal(limitHatasi('Graph 403: Application request limit reached'), true);
  assert.equal(limitHatasi(LIMIT), true);
  assert.equal(limitHatasi('Graph 400: Media ID is not available'), false);
  assert.equal(limitHatasi(undefined), false);
});

test('sınır hatası kanal denemesinden düşmez, haber sayacına yazılır', () => {
  const k = {};
  assert.equal(hataIsle(k, 'ig_post', LIMIT), 'limit');
  assert.equal(k.limit, 1);
  assert.equal(k.deneme, undefined);
  assert.deepEqual(eksikKanallar(KANALLAR, k), KANALLAR);
});

test('gerçek hata kanal denemesini yer; 3. denemeden sonra kanal düşer', () => {
  const k = {};
  for (let i = 0; i < AZAMI_DENEME; i++) assert.equal(hataIsle(k, 'ig_post', 'Graph 400: kötü görsel'), 'hata');
  assert.deepEqual(eksikKanallar(KANALLAR, k), ['ig_story', 'fb_post', 'fb_story']);
});

test('sınıra kaç kez takılırsa takılsın haber düşmez (24 Ekim kaybı)', () => {
  const k = {};
  for (let i = 0; i < 10; i++) hataIsle(k, 'ig_post', LIMIT);
  assert.deepEqual(eksikKanallar(KANALLAR, k), KANALLAR);
});

test('giden kanal ve atlanan haber eksik sayılmaz', () => {
  assert.deepEqual(eksikKanallar(KANALLAR, { ig_post: 'x', ig_story: 'y' }), ['fb_post', 'fb_story']);
  assert.deepEqual(eksikKanallar(KANALLAR, { atlandi: 'kurulum öncesi' }), []);
});

test('sınır beklemesi yalnız o kanalı tutar; süre 1, 2, 4 … en çok 12 saat', () => {
  const t = Date.parse('2026-10-26T10:00:00Z');
  const sinir = {};
  assert.equal(sinirKaydet(sinir, 'ig_post', t).kadar, new Date(t + SINIR_ILK_MS).toISOString());
  assert.equal(sinirde(sinir, 'ig_post', t + SINIR_ILK_MS - 1), true);
  assert.equal(sinirde(sinir, 'ig_post', t + SINIR_ILK_MS), false, 'süre dolunca yeniden denenir');
  for (const c of ['ig_story', 'fb_post', 'fb_story']) assert.equal(sinirde(sinir, c, t), false);
  assert.equal(sinirKaydet(sinir, 'ig_post', t).kadar, new Date(t + 2 * SINIR_ILK_MS).toISOString());
  for (let i = 0; i < 10; i++) sinirKaydet(sinir, 'ig_post', t);
  assert.equal(sinir.ig_post.kadar, new Date(t + SINIR_TAVAN_MS).toISOString());
  assert.equal(sinirde({}, 'ig_post', t), false);
  assert.equal(sinirde(undefined, 'ig_post', t), false);
});
