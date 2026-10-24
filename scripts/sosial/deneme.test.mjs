import test from 'node:test';
import assert from 'node:assert/strict';
import { AZAMI_DENEME, AZAMI_LIMIT, eksikKanallar, hataIsle, limitHatasi } from './deneme.mjs';

const KANALLAR = ['ig_post', 'ig_story', 'fb_post', 'fb_story'];

test('limitHatasi: Meta uygulama sınırı tanınır, öteki hatalar değil', () => {
  assert.equal(limitHatasi('Graph 403: Application request limit reached'), true);
  assert.equal(limitHatasi('Graph 400: Media ID is not available'), false);
  assert.equal(limitHatasi(undefined), false);
});

test('sınır hatası kanal denemesinden düşmez, haber sayacına yazılır', () => {
  const k = {};
  assert.equal(hataIsle(k, 'ig_post', 'Graph 403: Application request limit reached'), 'limit');
  assert.equal(k.limit, 1);
  assert.equal(k.deneme, undefined);
  assert.deepEqual(eksikKanallar(KANALLAR, k), KANALLAR);
});

test('gerçek hata kanal denemesini yer; 3. denemeden sonra kanal düşer', () => {
  const k = {};
  for (let i = 0; i < AZAMI_DENEME; i++) assert.equal(hataIsle(k, 'ig_post', 'Graph 400: kötü görsel'), 'hata');
  assert.deepEqual(eksikKanallar(KANALLAR, k), ['ig_story', 'fb_post', 'fb_story']);
});

test('haber başına sınır tavanı: AZAMI_LIMIT kez takılan haber bırakılır', () => {
  const k = {};
  for (let i = 0; i < AZAMI_LIMIT; i++) hataIsle(k, 'ig_post', 'Graph 403: Application request limit reached');
  assert.deepEqual(eksikKanallar(KANALLAR, k), []);
});

test('giden kanal ve atlanan haber eksik sayılmaz', () => {
  assert.deepEqual(eksikKanallar(KANALLAR, { ig_post: 'x', ig_story: 'y' }), ['fb_post', 'fb_story']);
  assert.deepEqual(eksikKanallar(KANALLAR, { atlandi: 'kurulum öncesi' }), []);
});
