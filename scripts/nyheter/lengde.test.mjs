import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordtelling, indekserbar, MIN_ORD_INDEKS } from '../../src/lib/ordtelling.mjs';
import { sjekkLengde, forLiteKilde, utenAvsenderprefiks, MIN_ORD_UTKAST, LENGDE_REGEL, TITTEL_REGEL } from './redaktor.mjs';

const ord = (n) => Array.from({ length: n }, (_, i) => `ord${i}`).join(' ');

test('ordtelling teller ikke kildelinje, lenkeadresser eller markdown-tegn', () => {
  const body = `Regjeringen foreslår **mer** penger.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n*Kilde: [Departementet / regjeringen.no](https://www.regjeringen.no/x)*`;
  assert.equal(ordtelling(body), 4 + 4);
  assert.equal(ordtelling('Se [rapporten](https://example.com/a-b-c) her.'), 3);
  assert.equal(ordtelling(''), 0);
  assert.equal(ordtelling(undefined), 0);
});

test('indekserbar: under grensen er noindex', () => {
  assert.equal(indekserbar(ord(MIN_ORD_INDEKS - 1)), false);
  assert.equal(indekserbar(ord(MIN_ORD_INDEKS)), true);
});

test('utkast under minstelengden får et problem som sendes til retterunden', () => {
  const p = sjekkLengde({ body: ord(MIN_ORD_UTKAST - 1) });
  assert.equal(p.length, 1);
  assert.match(p[0], /for kort/);
  assert.deepEqual(sjekkLengde({ body: ord(MIN_ORD_UTKAST) }), []);
});

test('for lite kildemateriale (bare tittel og ingress) avvises før skriving', () => {
  assert.equal(forLiteKilde('Tittel\nIngress med noen få ord.'), true);
  assert.equal(forLiteKilde(ord(400)), false);
});

test('avsenderprefiks med kolon fjernes fra tittelen', () => {
  assert.equal(utenAvsenderprefiks('Utenriksdepartementet: Norge gir 150 millioner til glemte kriser'), 'Norge gir 150 millioner til glemte kriser');
  assert.equal(utenAvsenderprefiks('Klima- og miljødepartementet: ny tiltaksplan for villrein'), 'Ny tiltaksplan for villrein');
  assert.equal(utenAvsenderprefiks('Departementet: Krav om sporing'), 'Krav om sporing');
  assert.equal(utenAvsenderprefiks('Statsministerens kontor: Støre skal møte Polens ledere'), 'Støre skal møte Polens ledere');
  assert.equal(utenAvsenderprefiks('Regjeringen foreslår ny ordning'), 'Regjeringen foreslår ny ordning');
  assert.equal(utenAvsenderprefiks('Zelenskyj: To drept i angrep'), 'Zelenskyj: To drept i angrep');
});

test('skriveregler i promptene: lengde og tittel uten avsenderprefiks', () => {
  assert.match(LENGDE_REGEL, /250–400 ord/);
  assert.match(LENGDE_REGEL, /egen kunnskap/);
  assert.match(TITTEL_REGEL, /Departementet: …/);
});
