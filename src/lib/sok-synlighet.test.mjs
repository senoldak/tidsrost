import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apenForSok, erFarevarsel, skjultForSok, kanApnesForGoogle, googleTestPa } from './sok-synlighet.mjs';

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

test('Google denemesi: ≥3 kilder + eget bidrag åpner ki-medier; resten forblir kapalt', () => {
  const ok = { id: 'brann-i-oslo', title: 'Brann i Oslo', produksjon: 'ki-medier', antallKilder: 3, harBidrag: true };
  assert.equal(kanApnesForGoogle(ok, {}), true);
  assert.equal(kanApnesForGoogle({ ...ok, antallKilder: 2 }, {}), false);
  assert.equal(kanApnesForGoogle({ ...ok, harBidrag: false }, {}), false);
  assert.equal(kanApnesForGoogle({ ...ok, id: 'nyheter-31-oktober-2026' }, {}), false);
  assert.equal(kanApnesForGoogle({ ...ok, title: 'Brann i Oslo og 4 andre saker' }, {}), false);
  assert.equal(kanApnesForGoogle({ ...ok, id: 'farevarsler-1-november-2026' }, {}), false);
  assert.equal(kanApnesForGoogle({ ...ok, produksjon: 'automatisk' }, {}), false);
});

test('Google denemesi: GOOGLE_TEST=0 slår av gjenåpningen', () => {
  const ok = { id: 'x', title: 'X', produksjon: 'ki-medier', antallKilder: 4, harBidrag: true };
  assert.equal(googleTestPa({}), true);
  assert.equal(kanApnesForGoogle(ok, { GOOGLE_TEST: '0' }), false);
  assert.equal(kanApnesForGoogle(ok, { GOOGLE_TEST: '1' }), true);
});

test('apnet løfter bare ki-medier-skjuling, ikke farevarsel eller korte saker', () => {
  assert.equal(apenForSok({ body: lang, produksjon: 'ki-medier', id: 'x', apnet: true }), true);
  assert.equal(apenForSok({ body: lang, produksjon: 'ki-medier', id: 'x', apnet: false }), false);
  assert.equal(apenForSok({ body: lang, produksjon: 'ki-medier', id: 'farevarsler-1', apnet: true }), false);
  assert.equal(apenForSok({ body: 'kort', produksjon: 'ki-medier', id: 'x', apnet: true }), false);
});
