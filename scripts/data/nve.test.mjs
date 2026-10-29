import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NVE_KILDE, dagNivaaer, fareKommuner, hasterNve, iSesong, nveSnoskredUrl, snoskred } from './nve.mjs';

const les = (f) => JSON.parse(readFileSync(new URL(`./fikstur/${f}`, import.meta.url), 'utf8'));
const SNO = les('nve-snoskred.json');
const FLOM = les('nve-flom.json');
const JORD = les('nve-jordskred.json');

// Gerçek yanıt biçimine sadık, sezon içi durum: fikstürdeki bölgelerin seviyesini ve metnini değiştirir.
function sesongSno(nivaer) {
  const kopi = structuredClone(SNO);
  for (const r of kopi) {
    const n = nivaer[r.Id];
    if (n === undefined) continue;
    r.AvalancheWarningList[0].DangerLevel = String(n);
    r.AvalancheWarningList[0].MainText = 'Fokus på nysnø og vind.';
  }
  return kopi;
}
// Gerçek yanıt biçimine sadık flom: bir kommunenin ilk uyarısını verilen seviyeye çıkarır.
function medNiva(json, fylkeId, kommuneIdx, niva, tekst = 'Økt fare for flom i bekker.') {
  const kopi = structuredClone(json);
  const k = kopi.CountyList.find((c) => c.Id === fylkeId).MunicipalityList[kommuneIdx];
  k.WarningList[0].ActivityLevel = String(niva);
  k.WarningList[0].MainText = tekst;
  return kopi;
}

test('NVE_KILDE: NLOD og NVE/Varsom', () => {
  assert.equal(NVE_KILDE.lisens, 'NLOD');
  assert.match(NVE_KILDE.navn, /NVE/);
});

test('nveSnoskredUrl bygger adressen med fra og til', () => {
  assert.equal(
    nveSnoskredUrl('2026-10-29', '2026-10-30'),
    'https://api01.nve.no/hydrology/forecast/avalanche/v6.3.0/api/RegionSummary/Simple/1/2026-10-29/2026-10-30',
  );
});

test('snoskred: bare A-regioner, seviye 0 beholdes som nivaa 0 uten tekst', () => {
  const s = snoskred(SNO);
  assert.equal(s.regioner.length, 5); // 7 i fikstur, 2 er B
  assert.ok(s.regioner.every((r) => r.type === 'A'));
  assert.ok(!s.regioner.some((r) => r.navn === 'Østfold'));
  const r = s.regioner.find((x) => x.navn === 'Tromsø');
  assert.equal(r.id, 3011);
  assert.equal(r.dager.length, 2);
  assert.deepEqual(r.dager[0], { dato: '2026-10-29', nivaa: 0, tekst: null });
});

test('snoskred: avviser uventet svar i stedet for å gjette', () => {
  assert.throws(() => snoskred({ feil: 1 }));
  assert.throws(() => snoskred([{ Id: 1 }]));
});

test('iSesong: alt på 0 er utenfor sesong', () => {
  assert.equal(iSesong(snoskred(SNO)), false);
});

test('iSesong: minst én region på 1 eller mer er sesong, og NVE-teksten følger med', () => {
  const s = snoskred(sesongSno({ 3011: 2, 3023: 4 }));
  assert.equal(iSesong(s), true);
  const r = s.regioner.find((x) => x.navn === 'Tromsø');
  assert.equal(r.dager[0].nivaa, 2);
  assert.equal(r.dager[0].tekst, 'Fokus på nysnø og vind.');
  assert.equal(r.dager[1].nivaa, 0);
});

test('dagNivaaer: regioner med varsel på dagen, høyest først, 0 utelatt', () => {
  const s = snoskred(sesongSno({ 3011: 2, 3023: 4, 3010: 3 }));
  const d = dagNivaaer(s, '2026-10-29');
  assert.deepEqual(d.map((r) => [r.navn, r.nivaa]), [['Romsdal', 4], ['Lyngen', 3], ['Tromsø', 2]]);
  assert.deepEqual(dagNivaaer(s, '2026-10-30'), []);
});

test('hasterNve snøskred: haster bare når en region på 3 eller mer endres', () => {
  const ingen = snoskred(SNO);
  const to = snoskred(sesongSno({ 3011: 2 }));
  const tre = snoskred(sesongSno({ 3011: 3 }));
  const fire = snoskred(sesongSno({ 3011: 4 }));
  assert.equal(hasterNve('snoskred.json', ingen, to), false);
  assert.equal(hasterNve('snoskred.json', to, tre), true);
  assert.equal(hasterNve('snoskred.json', tre, tre), false);
  assert.equal(hasterNve('snoskred.json', tre, fire), true);
  assert.equal(hasterNve('snoskred.json', tre, ingen), true);
});

test('fareKommuner: bare grønt gir tomt fylkeskart, og Svalbard/Jan Mayen er utelatt', () => {
  const f = fareKommuner(FLOM, 'flom', '2026-10-29');
  assert.equal(f.dato, '2026-10-29');
  assert.deepEqual(f.fylker, {});
  assert.deepEqual(fareKommuner(JORD, 'jordskred', '2026-10-29').fylker, {});
});

test('fareKommuner: bare nivå 2 eller mer teller, høyeste nivå per fylke, kommuner sortert', () => {
  let json = medNiva(FLOM, '34', 0, 2);
  json = medNiva(json, '34', 1, 3, 'Fare for flom i store elver.');
  json = medNiva(json, '46', 2, 4);
  const f = fareKommuner(json, 'flom', '2026-10-29');
  assert.deepEqual(Object.keys(f.fylker).sort(), ['34', '46']);
  assert.equal(f.fylker['34'].nivaa, 3);
  assert.equal(f.fylker['34'].kommuner.length, 2);
  assert.equal(f.fylker['34'].tekst, 'Fare for flom i store elver.');
  assert.equal(f.fylker['46'].nivaa, 4);
  assert.ok(!('21' in f.fylker));
});

test('fareKommuner: nivå 1 (grønt) i en kommune teller ikke, og uyldig dato gir ingenting', () => {
  const json = medNiva(FLOM, '03', 0, 1);
  assert.deepEqual(fareKommuner(json, 'flom', '2026-10-29').fylker, {});
  const json2 = medNiva(FLOM, '03', 0, 3);
  assert.deepEqual(fareKommuner(json2, 'flom', '2020-01-01').fylker, {});
});

test('fareKommuner: ukjent type og uventet svar avvises', () => {
  assert.throws(() => fareKommuner(FLOM, 'storm', '2026-10-29'));
  assert.throws(() => fareKommuner({ feil: 1 }, 'flom', '2026-10-29'));
});

test('fareKommuner: tekst faller tilbake til null når NVE bare har fargenavn', () => {
  const json = medNiva(FLOM, '34', 0, 3, 'Oransje nivå');
  assert.equal(fareKommuner(json, 'flom', '2026-10-29').fylker['34'].tekst, null);
});

test('hasterNve flom: haster når oransje/rødt-settet endres, ikke ved gult', () => {
  const tom = { flom: {}, jordskred: {} };
  const gul = { flom: fareKommuner(medNiva(FLOM, '34', 0, 2), 'flom', '2026-10-29').fylker, jordskred: {} };
  const oransje = { flom: fareKommuner(medNiva(FLOM, '34', 0, 3), 'flom', '2026-10-29').fylker, jordskred: {} };
  const oransje2 = { flom: fareKommuner(medNiva(FLOM, '34', 1, 3), 'flom', '2026-10-29').fylker, jordskred: {} };
  assert.equal(hasterNve('flom.json', tom, gul), false);
  assert.equal(hasterNve('flom.json', gul, oransje), true);
  assert.equal(hasterNve('flom.json', oransje, oransje), false);
  assert.equal(hasterNve('flom.json', oransje, oransje2), true);
  assert.equal(hasterNve('flom.json', oransje, tom), true);
});
