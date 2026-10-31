import test from 'node:test';
import assert from 'node:assert/strict';
import { skalaFra, fortsettFra, fremdrift, velgStemme, lagringsnokkel } from './lesing.mjs';

test('skalaFra: gyldige verdier beholdes, alt annet gir 1', () => {
  for (const s of ['0', '1', '2', '3']) assert.equal(skalaFra(s), s);
  assert.equal(skalaFra(2), '2');
  for (const x of [null, undefined, '', '4', '-1', 'abc', '1.5', {}, NaN]) assert.equal(skalaFra(x), '1');
});

test('fortsettFra: bare mellom 10 % og 95 %', () => {
  assert.equal(fortsettFra(0.5), 0.5);
  assert.equal(fortsettFra('0.42'), 0.42);
  assert.equal(fortsettFra(0.1), 0.1);
  assert.equal(fortsettFra(0.95), 0.95);
  for (const x of [0, 0.05, 0.099, 0.951, 1, 2, -0.3, null, undefined, '', 'abc', NaN, Infinity]) assert.equal(fortsettFra(x), null);
});

test('fremdrift: 0 til 1 og tåler tom tekst', () => {
  assert.equal(fremdrift(1000, 2000, 800), 0);
  assert.equal(fremdrift(-5000, 2000, 800), 1);
  assert.ok(Math.abs(fremdrift(0, 1000, 1000) - 0.6) < 1e-9);
  assert.equal(fremdrift(0, 0, 800), 0);
  assert.equal(fremdrift(0, NaN, 800), 0);
});

test('velgStemme: nb før no før nn, uavhengig av rekkefølge; -1 uten norsk stemme', () => {
  assert.equal(velgStemme([{ lang: 'en-US' }, { lang: 'nn-NO' }, { lang: 'no-NO' }, { lang: 'nb-NO' }]), 3);
  assert.equal(velgStemme([{ lang: 'nn-NO' }, { lang: 'no-NO' }]), 1);
  assert.equal(velgStemme([{ lang: 'nn_NO' }]), 0);
  assert.equal(velgStemme([{ lang: 'NB-no' }]), 0);
  assert.equal(velgStemme([{ lang: 'en-US' }, { lang: 'nl-NL' }, { lang: 'nob' }]), -1);
  assert.equal(velgStemme([]), -1);
  assert.equal(velgStemme(undefined), -1);
  assert.equal(velgStemme([null, { lang: 'nb-NO' }]), 1);
});

test('lagringsnokkel', () => {
  assert.equal(lagringsnokkel('/artikkel/x/'), 'les:/artikkel/x/');
});
