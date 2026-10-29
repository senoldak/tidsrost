import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FYLKER, fylkerFraKoder } from '../../src/lib/fylker.mjs';
import { birlestirMaaned, dagsTall, hendelser } from './varselarkiv.mjs';

const fikstur = JSON.parse(readFileSync(new URL('./fikstur/varselarkiv-2024-10.json', import.meta.url), 'utf8'));

test('FYLKER: 15 fylker etter 2024-inndelingen', () => {
  assert.equal(FYLKER.length, 15);
  assert.deepEqual(FYLKER.find((f) => f.kode === '46'), { kode: '46', navn: 'Vestland' });
});

test('fylkerFraKoder: gamle koder fordeles på dagens fylker, ukjente hoppes over', () => {
  assert.deepEqual(fylkerFraKoder(['30']), ['31', '32', '33']);
  assert.deepEqual(fylkerFraKoder(['54', '20']), ['55', '56']);
  assert.deepEqual(fylkerFraKoder(['04', '05', '12', '14']), ['34', '46']);
  assert.deepEqual(fylkerFraKoder(['38']), ['39', '40']);
  assert.deepEqual(fylkerFraKoder(['21']), []);
  assert.deepEqual(fylkerFraKoder(['46', '46', '03']), ['03', '46']);
  assert.deepEqual(fylkerFraKoder(undefined), []);
});

test('hendelser: varsel og oppdateringer slås sammen, høyeste nivå teller, grønt hoppes over', () => {
  const h = hendelser(fikstur.features, '2024-10');
  const land = h.filter((x) => x.domene === 'land');
  assert.equal(land.length, 3);
  const vindYtre = land.find((x) => x.event === 'wind' && x.fylker.length === 2);
  assert.deepEqual(vindYtre, { start: '2024-10-21', niva: 'oransje', domene: 'land', fylker: ['15', '46'], event: 'wind' });
  const vindStor = land.find((x) => x.event === 'wind' && x.fylker.length === 4);
  assert.equal(vindStor.niva, 'gult');
  const regn = land.find((x) => x.event === 'rain');
  assert.deepEqual(regn, { start: '2024-10-31', niva: 'rodt', domene: 'land', fylker: ['33', '46'], event: 'rain' });
  const hav = h.filter((x) => x.domene === 'hav');
  assert.equal(hav.length, 1);
  assert.equal(hav[0].start, '2024-10-31');
});

test('hendelser: oppdatering uten varsel i månedens første tre døgn hører til forrige måned', () => {
  const oppdatering = {
    properties: { id: '2.49.0.1.578.0.20241101100000.001', type: 'Update', status: 'Actual', awareness_level: '2; yellow; Moderate', event: 'snow', county: ['18'], area: 'Nordland', geographicDomain: 'land' },
    when: { interval: ['2024-11-01T12:00:00+00:00', '2024-11-02T00:00:00+00:00'] },
  };
  assert.equal(hendelser([oppdatering], '2024-11').length, 0);
  const senere = structuredClone(oppdatering);
  senere.properties.id = '2.49.0.1.578.0.20241110100000.001';
  senere.when.interval = ['2024-11-10T12:00:00+00:00', '2024-11-11T00:00:00+00:00'];
  assert.equal(hendelser([senere], '2024-11').length, 1);
});

test('dagsTall: per fylke og én gang i landstotalen', () => {
  const dager = dagsTall(hendelser(fikstur.features, '2024-10'));
  assert.deepEqual(dager['2024-10-21'].land['46'], [1, 1, 0]);
  assert.deepEqual(dager['2024-10-21'].land['15'], [1, 1, 0]);
  assert.deepEqual(dager['2024-10-21'].land['34'], [1, 0, 0]);
  assert.deepEqual(dager['2024-10-21'].landTotal, [1, 1, 0]);
  assert.deepEqual(dager['2024-10-31'].land['46'], [0, 0, 1]);
  assert.deepEqual(dager['2024-10-31'].landTotal, [0, 0, 1]);
  assert.deepEqual(dager['2024-10-31'].hav, [1, 0, 0]);
});

test('birlestirMaaned: bytter bare den ene måneden', () => {
  const arkiv = { maaneder: { '2024-09': { hentet: 'a', dager: { '2024-09-02': { x: 1 } } }, '2024-10': { hentet: 'b', dager: {} } } };
  const ny = birlestirMaaned(arkiv, '2024-10', { '2024-10-21': { y: 2 } }, 'c');
  assert.deepEqual(ny.maaneder['2024-09'], arkiv.maaneder['2024-09']);
  assert.deepEqual(ny.maaneder['2024-10'], { hentet: 'c', dager: { '2024-10-21': { y: 2 } } });
  assert.equal(arkiv.maaneder['2024-10'].hentet, 'b');
});

test('nesteArkivmaaned: måneden etter siste lagrede, høyst én gang i døgnet, aldri inneværende måned', async () => {
  const { nesteArkivmaaned } = await import('./varselarkiv.mjs');
  const naa = new Date('2026-10-29T12:00:00Z');
  assert.equal(nesteArkivmaaned({ maaneder: { '2026-03': {}, '2026-04': {} } }, naa), '2026-05');
  assert.equal(nesteArkivmaaned({ maaneder: { '2026-04': {} }, arkivForsok: '2026-10-29T02:00:00Z' }, naa), null);
  assert.equal(nesteArkivmaaned({ maaneder: { '2026-04': {} }, arkivForsok: '2026-10-28T02:00:00Z' }, naa), '2026-05');
  assert.equal(nesteArkivmaaned({ maaneder: { '2026-09': {} } }, naa), null);
  assert.equal(nesteArkivmaaned({ maaneder: {} }, naa), '2019-01');
});

test('oppdaterLopende: dagene i 30-dagersvinduet byttes, eldre egne dager beholdes', async () => {
  const { oppdaterLopende } = await import('./varselarkiv.mjs');
  const naa = new Date('2026-10-29T12:00:00Z');
  const arkiv = { lopende: { fra: '2026-09-15', dager: { '2026-09-20': { gammel: true }, '2026-10-05': { gammel: true } } } };
  const varsel = {
    properties: { id: '2.49.0.1.578.0.20261010100000.001', type: 'Alert', status: 'Actual', awareness_level: '3; orange; Severe', event: 'wind', county: ['46'], area: 'Vestland', geographicDomain: 'land' },
    when: { interval: ['2026-10-11T06:00:00+00:00', '2026-10-11T18:00:00+00:00'] },
  };
  const ny = oppdaterLopende(arkiv, [varsel], naa);
  assert.equal(ny.lopende.fra, '2026-09-15');
  assert.deepEqual(ny.lopende.dager['2026-09-20'], { gammel: true });
  assert.equal(ny.lopende.dager['2026-10-05'], undefined);
  assert.deepEqual(ny.lopende.dager['2026-10-11'].landTotal, [0, 1, 0]);
  assert.equal(ny.lopende.hentet, naa.toISOString());
  assert.equal(oppdaterLopende({}, [], naa).lopende.fra, '2026-09-29');
});

test('hendelser: gamle meldinger uten status og med 15-sifret id telles', () => {
  const gammel = {
    properties: { id: '2.49.0.1.578.0.190611105610291.2015', type: 'Alert', status: null, awareness_level: '2; yellow; Moderate', event: 'rainFlood', county: ['20', '54'], area: 'Finnmark', geographicDomain: 'land' },
    when: { interval: ['2019-06-11T18:00:00+00:00', '2019-06-13T00:00:00+00:00'] },
  };
  const h = hendelser([gammel], '2019-06');
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].fylker, ['55', '56']);
});

test('hendelser: vindu fra en dato (all.json) — oppdatering uten varsel de første tre døgnene hoppes over', () => {
  const opp = {
    properties: { id: '2.49.0.1.578.0.20261001100000.001', type: 'Update', status: 'Actual', awareness_level: '2; yellow; Moderate', event: 'snow', county: ['18'], area: 'Nordland', geographicDomain: 'land' },
    when: { interval: ['2026-10-01T12:00:00+00:00', '2026-10-02T00:00:00+00:00'] },
  };
  assert.equal(hendelser([opp], '2026-09-30T08:00:00Z').length, 0);
  assert.equal(hendelser([opp], '2026-09-20T08:00:00Z').length, 1);
});

test('hendelser: meldinger med åpenbart feil dato (utenfor vinduet ± to måneder) telles ikke', () => {
  const feil = {
    properties: { id: '2.49.0.1.578.0.260404100000.001', type: 'Alert', status: 'Actual', awareness_level: '2; yellow; Moderate', event: 'gale', county: [], area: 'Viking', geographicDomain: 'marine' },
    when: { interval: ['0300-04-05T06:00:00+00:00', '0300-04-05T18:00:00+00:00'] },
  };
  assert.equal(hendelser([feil], '2026-04').length, 0);
});
