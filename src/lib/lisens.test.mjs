import test from 'node:test';
import assert from 'node:assert/strict';
import { LISENS_URL, LISENS_JSONLD_URL, MEDIA_KILDE_TEKST, visMedieKilde } from './lisens.mjs';

test('lisens adresleri CC BY-NC 4.0', () => {
  assert.equal(LISENS_URL, 'https://creativecommons.org/licenses/by-nc/4.0/deed.no');
  assert.equal(LISENS_JSONLD_URL, 'https://creativecommons.org/licenses/by-nc/4.0/');
});

test('medya kaynaklı haber: adsız kaynak satırı', () => {
  assert.equal(MEDIA_KILDE_TEKST, 'Kilde: saker i flere uavhengige nyhetsmedier (navngis ikke).');
  assert.equal(visMedieKilde({ produksjon: 'ki-medier', forklart: false, harOffentligKilde: false }), true);
});

test('resmî kaynaklı, Forklart ve diğer üretim türlerinde satır çıkmaz', () => {
  assert.equal(visMedieKilde({ produksjon: 'ki-automatisk', forklart: false, harOffentligKilde: false }), false);
  assert.equal(visMedieKilde({ produksjon: 'ki-medier', forklart: true, harOffentligKilde: false }), false);
  assert.equal(visMedieKilde({ produksjon: 'ki-medier', forklart: false, harOffentligKilde: true }), false);
});
