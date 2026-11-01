import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './avvik.mjs';

const veri = (rader) => ({ form: 'avvik', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosentpoeng', serier: [{ navn: 'Avvik', punkter: rader.map(([x, y]) => ({ x, y })) }] });

test('avvik: işaret sınıfları', () => { const s = tegn(veri([['A', 2], ['B', -1]])).svg; assert.match(s, /g-f-rod/); assert.match(s, /g-f-su/); });
test('avvik: büyükten küçüğe sıralı', () => assert.match(tegn(veri([['A', -1], ['B', 3]])).punkter[0].tekst, /^B/));
test('avvik: artı değer + işaretiyle', () => assert.match(tegn(veri([['A', 2]])).punkter[0].tekst, /\+2,0/));
test('avvik: data-i her satırda', () => assert.equal((tegn(veri([['A', 1], ['B', -2]])).svg.match(/data-i=/g) || []).length, 2));
