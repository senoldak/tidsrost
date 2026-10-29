import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apenForSok, erFarevarsel, skjultForSok } from './sok-synlighet.mjs';

const lang = Array.from({ length: 200 }, (_, i) => `ord${i}`).join(' ');

test('medya yeniden yazımı arama motorlarına kapalı, resmî ve imzalı haberler açık', () => {
  assert.equal(apenForSok({ body: lang, produksjon: 'ki-medier', id: 'x' }), false);
  assert.equal(apenForSok({ body: lang, produksjon: 'automatisk', id: 'boliglansrenten' }), true);
  assert.equal(apenForSok({ body: lang, produksjon: 'ki-kontrollert', id: 'x' }), true);
  assert.equal(apenForSok({ body: lang, id: 'produktivitet-knekk' }), true);
});

test('farevarsel derlemesi ve tekil uyarı kapalı', () => {
  assert.equal(erFarevarsel({ id: 'farevarsler-10-oktober-2026' }), true);
  assert.equal(erFarevarsel({ id: '2026/farevarsler-11-oktober-2026' }), true);
  assert.equal(erFarevarsel({ id: 'x', title: 'Oransje farevarsel for kraftig regn' }), true);
  assert.equal(erFarevarsel({ id: 'varsler-om-endring', title: 'Regjeringen varsler kutt' }), false);
  assert.equal(apenForSok({ body: lang, produksjon: 'automatisk', id: 'farevarsler-10-oktober-2026' }), false);
});

test('kısa haber türünden bağımsız kapalı kalır', () => {
  assert.equal(apenForSok({ body: 'kort sak', produksjon: 'automatisk', id: 'x' }), false);
  assert.equal(skjultForSok({ produksjon: ' ki-medier ' }), true);
  assert.equal(skjultForSok({}), false);
});
