import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KRISER, finnKrise, filtrerKriser, sammenligningsMatrise } from './kriser.ts';

test('KRISER inneholder 6 historiske kriseepoker', () => {
  assert.equal(KRISER.length, 6);
  const ider = KRISER.map((k) => k.id);
  assert.ok(ider.includes('volcker-1979'));
  assert.ok(ider.includes('norsk-bankkrise-1988'));
  assert.ok(ider.includes('erm-1992'));
  assert.ok(ider.includes('latin-stabilisering-1990'));
  assert.ok(ider.includes('finanskrisen-2008'));
  assert.ok(ider.includes('inflasjonssjokket-2021'));
});

test('finnKrise henter riktig epoke', () => {
  const k = finnKrise('volcker-1979');
  assert.ok(k);
  assert.equal(k.periode, '1979–1982');
  assert.ok(k.toppRente.includes('20,0 %'));
});

test('filtrerKriser filtrerer på kategori eller returnerer alle', () => {
  const inflasjon = filtrerKriser('inflasjon');
  assert.ok(inflasjon.length >= 3);
  for (const k of inflasjon) {
    assert.equal(k.kategori, 'inflasjon');
  }

  const bank = filtrerKriser('bankkrise');
  assert.equal(bank.length, 1);
  assert.equal(bank[0].id, 'norsk-bankkrise-1988');

  assert.equal(filtrerKriser('alle').length, 6);
  assert.equal(filtrerKriser().length, 6);
});

test('sammenligningsMatrise gir kompakt oversikt for alle kriser', () => {
  const m = sammenligningsMatrise();
  assert.equal(m.length, 6);
  for (const rad of m) {
    assert.ok(rad.id);
    assert.ok(rad.tittel);
    assert.ok(rad.toppRente);
    assert.ok(rad.toppInflasjon);
    assert.ok(rad.hovedlaerdom);
  }
});
