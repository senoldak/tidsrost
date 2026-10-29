import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fodtRang, harHull, naboer, navnBeskrivelse, navnSetninger, navnTittel, tiaarSnitt, toppAar } from './navn-tekst.mjs';

const fodte = { 1990: 100, 1991: 110, 1992: 120, 1993: 130, 1994: 140, 2000: 50, 2001: 50, 2002: 50, 2003: 50, 2004: 50, 2005: 60 };
const ola = { navn: 'Ola', kjonn: 'G', antall: 9313, serie: { 2013: 9000, 2025: 9313 }, fodte };
const data = { fornavn: [ola, { navn: 'Per', kjonn: 'G', antall: 5000, serie: {}, fodte: { 2005: 80 } }, { navn: 'Kari', kjonn: 'J', antall: 100, serie: {}, fodte: { 2005: 900 } }] };

test('toppAar og tiaarSnitt', () => {
  assert.deepEqual(toppAar(fodte), { aar: '1994', antall: 140 });
  assert.deepEqual(tiaarSnitt(fodte), [{ tiaar: '1990', snitt: 120, aarMed: 5 }, { tiaar: '2000', snitt: 52, aarMed: 6 }]);
  assert.deepEqual(tiaarSnitt({ 2000: 5, 2001: 6 }), []);
});

test('fodtRang: kun samme kjønn; mangler data → null', () => {
  assert.equal(fodtRang(data, ola, '2005'), 2);
  assert.equal(fodtRang(data, ola, '1980'), null);
  assert.equal(harHull({ 2013: 1, 2014: 1, 2016: 1 }), true);
  assert.equal(harHull({ 2013: 1, 2014: 1 }), false);
});

test('navnSetninger: retningsord følger dataene', () => {
  const s = navnSetninger(data, ola, 3).join(' ');
  assert.match(s, /3\. mest brukte guttenavnet/);
  assert.match(s, /økt fra 9\s?000 til 9\s?313/);
  assert.match(s, /Flest barn fikk navnet i 1994/);
  assert.match(s, /1990-årene/);
  const ned = navnSetninger(data, { ...ola, serie: { 2013: 9313, 2025: 9000 } }, 1).join(' ');
  assert.match(ned, /det mest brukte guttenavnet/);
  assert.match(ned, /sunket/);
  assert.match(ned, /nedgang/);
  // Tom serie ve doğum: cümle üretilmez, hata da çıkmaz
  assert.deepEqual(navnSetninger(data, { navn: 'X', kjonn: 'J', antall: 1, serie: {}, fodte: {} }, null), []);
});

test('navnTittel og navnBeskrivelse', () => {
  assert.equal(navnTittel('Ola'), 'Hvor mange heter Ola? Statistikk fra SSB');
  assert.ok(navnTittel('Anne-Marie-Katrine-Sofie').length <= 49);
  const b = navnBeskrivelse(ola, 3);
  assert.ok(b.length >= 120 && b.length <= 160, b);
});

test('naboer: samme forbokstav først, uten seg selv', () => {
  const sider = ['Anna', 'Arne', 'Aud', 'Bjørn', 'Bo', 'Per'].map((navn) => ({ slug: navn.toLowerCase(), navn, kjonn: 'G' }));
  const n = naboer(sider, 'arne', 3).map((s) => s.navn);
  assert.deepEqual(n, ['Anna', 'Aud', 'Bjørn']);
});
