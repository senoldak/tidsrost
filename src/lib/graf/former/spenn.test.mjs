import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './spenn.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (rader) => ({ form: 'spenn', tittel: 't', kilde: { navn: 'Norges Bank' }, enhet: 'Kroner', desimaler: 2, serier: [{ navn: 'EUR', punkter: rader.map(([x, y, y2, start, slutt]) => ({ x, y, y2, start, slutt })) }] });

test('spenn: y2 eksikse hata', () => assert.match(validerGraf(veri([['a', 1, undefined]])).join(), /y2/));
test('spenn: gövde rengi yöne göre', () => {
  const s = tegn(veri([['u1', 11, 12, 11.2, 11.8], ['u2', 11, 12, 11.8, 11.2]])).svg;
  assert.match(s, /data-i="0"[^]*?class="g-f-su"/);
  assert.match(s, /data-i="1"[^]*?class="g-f-rod"/);
});
test('spenn: gövdesiz nokta yalnız çizgi', () => { const s = tegn(veri([['a', 1, 2]])).svg; assert.ok(!/g-f-su|g-f-rod/.test(s)); assert.match(s, /class="g-spenn"/); });
test('spenn: ipucu lav–høy', () => assert.match(tegn(veri([['a', 1, 2]])).punkter[0].tekst, /1,00–2,00 kr/));
