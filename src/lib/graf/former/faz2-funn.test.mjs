// Faz 2 son incelemesinin bulguları: eksik veri asla 0 ya da başka bir değer olarak gösterilmez.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tegnGraf } from '../index.mjs';
import { validerGraf } from '../sema.mjs';

const g = (form, serier, valg, enhet = 'Prosent') => ({ form, tittel: 't', kilde: { navn: 'SSB' }, enhet, serier: serier.map(([navn, pts]) => ({ navn, punkter: pts.map(([x, y]) => ({ x, y })) })), valg });

test('hizala: sonraki serideki ek x kaybolmaz (varmekart)', () => {
  const t = tegnGraf(g('varmekart', [['A', [['1', 1]]], ['B', [['2', 9]]]]));
  assert.deepEqual(t.tabell.kolonner, ['', '1', '2']);
  assert.equal(t.tabell.rader[1][2], '9,0');
});
test('kombi: çizgi farklı x değerlerinde → derleme çökmez', () => {
  assert.doesNotThrow(() => tegnGraf({ ...g('kombi', [['S', [['a', 1], ['b', 2]]], ['L', [['c', 3]]]]), valg: { enhet2: 'Prosent' } }));
});
test('stablet: bir seri boşsa Sum "–", sütun çizilmez', () => {
  const t = tegnGraf(g('stablet', [['A', [['x', 1], ['y', 2]]], ['B', [['x', null], ['y', 3]]]]));
  assert.match(t.punkter[0].tekst, /Sum: –/);
  assert.equal(t.tabell.rader[0][3], '–');
});
test('stablet prosent: eksik sütunda pay "–"', () => {
  const t = tegnGraf(g('stablet', [['A', [['x', 1], ['y', 1]]], ['B', [['x', null], ['y', 1]]]], { prosent: true }));
  assert.match(t.punkter[0].tekst, /A: –/);
});
test('stabletflate: eksik değerde alan kesilir, Sum "–"', () => {
  const t = tegnGraf(g('stabletflate', [['A', [['a', 1], ['b', null], ['c', 2]]], ['B', [['a', 1], ['b', 1], ['c', 1]]]]));
  assert.match(t.punkter[1].tekst, /Sum: –/);
  assert.equal(t.tabell.rader[1][3], '–');
  assert.ok((t.svg.match(/class="g-lag /g) || []).length >= 4); // iki katman × iki parça
});
test('fossefall: ilk değer zorunlu; aradaki boş adım tabloda "–", düzey değişmez', () => {
  assert.match(validerGraf(g('fossefall', [['E', [['Start', null], ['Skatt', -5]]]])).join(), /fossefall/);
  const t = tegnGraf(g('fossefall', [['E', [['Start', 10], ['Hull', null], ['Inn', 2]]]], { sum: true }));
  assert.equal(t.tabell.rader[1][1], '–');
  assert.equal(t.tabell.rader.at(-1)[2], '12,0');
});
test('fremdrift: negatif hedef hata', () => assert.match(validerGraf({ ...g('fremdrift', [['M', [['a', 1]]]]), serier: [{ navn: 'M', punkter: [{ x: 'a', y: 1, y2: -50 }] }] }).join(), /fremdrift/));
