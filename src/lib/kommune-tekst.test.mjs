import { test } from 'node:test';
import assert from 'node:assert/strict';
import { andelTekst, forskjell, kommuneBeskrivelse, kommuneRang, kommuneSetninger, kommuneTittel, medSuffiks, naboer, perTusen, rangRader, utvikling } from './kommune-tekst.mjs';

const serie = (a, b) => Object.fromEntries(Array.from({ length: 11 }, (_, i) => [2016 + i, Math.round(a + ((b - a) * i) / 10)]));
const endring = (o = {}) => ({ aar: '2025', fodte: 100, dode: 80, fodselsoverskudd: 20, innflytting: 300, utflytting: 200, netto: 100, tilvekst: 120, ...o });
const kom = (kode, navn, fylke, a, b, o = {}) => ({
  kode,
  navn,
  fylke,
  folkemengde: b,
  serie10: serie(a, b),
  andel: { barn: 18, voksne: 62, eldre: 20 },
  endring: endring(),
  areal: 200,
  landareal: 180,
  tetthet: 30,
  inntektMedian: 600000,
  ...o,
});
const DATA = {
  sisteAar: '2026',
  inntektAar: '2024',
  land: { navn: 'Norge', folkemengde: 100000, serie10: serie(90000, 100000), andel: { barn: 19, voksne: 64, eldre: 17 }, endring: endring({ fodte: 1000, dode: 900, netto: 500 }), areal: 10000, landareal: 9000, tetthet: 11, inntektMedian: 650000 },
  fylker: {
    '11': { navn: 'Rogaland', folkemengde: 36000, serie10: serie(34000, 36000), andel: { barn: 19, voksne: 63, eldre: 18 }, tetthet: 40, inntektMedian: 640000 },
    '03': { navn: 'Oslo', folkemengde: 5000, serie10: serie(4000, 5000), andel: { barn: 18, voksne: 70, eldre: 12 }, tetthet: 1000, inntektMedian: 620000 },
  },
  kommuner: [
    kom('1103', 'Stavanger', '11', 20000, 25000),
    kom('1151', 'Utsira', '11', 200, 190, { areal: 6, tetthet: 36.5, endring: endring({ netto: -5, innflytting: 10, utflytting: 15, fodte: 1, dode: 3 }) }),
    kom('1127', 'Randaberg', '11', 9000, 9000),
    kom('1101', 'Eigersund', '11', 100, 100, { inntektMedian: null, andel: null, endring: endring({ netto: null, innflytting: null, utflytting: null }) }),
    kom('0301', 'Oslo - Oslove', '03', 4000, 5000, { tetthet: 1500 }),
  ],
};
const SIDER = [
  { slug: 'stavanger', kode: '1103', navn: 'Stavanger' },
  { slug: 'utsira', kode: '1151', navn: 'Utsira' },
  { slug: 'randaberg', kode: '1127', navn: 'Randaberg' },
  { slug: 'eigersund', kode: '1101', navn: 'Eigersund' },
  { slug: 'oslo', kode: '0301', navn: 'Oslo - Oslove' },
];
const rang = kommuneRang(DATA);
const tekst = (kode) => {
  const k = DATA.kommuner.find((x) => x.kode === kode);
  const r = rang.get(kode);
  return kommuneSetninger(k, DATA.fylker[k.fylke], DATA.land, r.fylke, r.land, DATA.sisteAar, DATA.inntektAar);
};

test('hjelpere: forskjell, utvikling, perTusen, andelTekst, medSuffiks', () => {
  assert.deepEqual(forskjell(60, 50), { pst: 20, retning: 'over' });
  assert.deepEqual(forskjell(40, 50), { pst: 20, retning: 'under' });
  assert.deepEqual(forskjell(50.1, 50), { pst: 0, retning: 'lik' });
  assert.equal(forskjell(null, 50), null);
  assert.deepEqual(utvikling({ 2016: 100, 2026: 110 }), { fra: '2016', til: '2026', a: 100, b: 110, abs: 10, pst: 10 });
  assert.equal(utvikling({ 2016: 100 }), null);
  assert.equal(utvikling({ 2016: 100, 2020: 105, 2026: 110 }, '2020', '2026').a, 105);
  assert.equal(perTusen(5, 1000), 5);
  assert.equal(perTusen(5, 0), null);
  assert.equal(andelTekst(0.04), 'mindre enn 0,1');
  assert.equal(andelTekst(0.5), '0,50');
  assert.equal(andelTekst(13.2), '13');
  assert.equal(medSuffiks('Våler (Østfold)'), 'Våler kommune (Østfold)');
  assert.equal(medSuffiks('Oslo - Oslove'), 'Oslo - Oslove kommune');
});

test('kommuneRang: land og fylke, null utelates', () => {
  assert.deepEqual(rang.get('1103').land.folkemengde, { plass: 1, av: 5 });
  assert.equal(rang.get('1151').land.folkemengde.plass, 4, 'Eigersund (100) er minst');
  assert.equal(rang.get('1101').land.folkemengde.plass, 5);
  assert.equal(rang.get('1103').fylke.plass, 1);
  assert.equal(rang.get('1103').fylke.av, 4);
  assert.equal(rang.get('0301').fylke.av, 1);
  assert.equal(rang.get('1101').land.inntekt, undefined, 'null inntekt har ingen plass');
  assert.equal(rang.get('1103').land.inntekt.av, 4);
  assert.equal(rang.get('1103').land.vekst.plass, 1, 'Oslo og Stavanger har lik vekst: begge plass 1');
  assert.equal(rang.get('1151').land.vekst.plass, 5, 'nedgang er nederst');
});

test('kommuneSetninger: retning følger tallene, ingen vurderinger', () => {
  const st = tekst('1103').join('\n');
  assert.match(st, /Stavanger er landets største kommune/);
  assert.match(st, /en økning på/);
  assert.match(st, /prosent under landsandelen/); // barn 18 mot 19
  assert.match(st, /prosent over landsandelen/);
  assert.match(st, /netto innflytting på 100 personer/);
  const ut = tekst('1151').join('\n');
  assert.match(ut, /plass nummer 4 av 5 kommuner etter folketall/);
  assert.match(ut, /en nedgang på/);
  assert.match(ut, /netto utflytting på 5 personer/);
  assert.match(ut, /Det døde 2 flere enn det ble født/);
  assert.match(ut, /I Rogaland er Utsira nummer 3 av 4 kommuner/);
  assert.match(tekst('1101').join('\n'), /landets minste kommune/);
  assert.match(tekst('1101').join('\n'), /I Rogaland er Eigersund den minste kommunen/);
  for (const kode of ['1103', '1151', '1127', '1101', '0301']) {
    const t = tekst(kode).join(' ');
    assert.doesNotMatch(t, /fattig|rik\b|døende|attraktiv|dårlig|heldig|beste|verste|NaN|undefined|null/i);
  }
});

test('kommuneSetninger: manglende tall gir ingen setning, ikke NaN', () => {
  const t = tekst('1101').join('\n');
  assert.doesNotMatch(t, /NaN|undefined|null/);
  assert.doesNotMatch(t, /husholdningsinntekt/);
  assert.doesNotMatch(t, /eldre/);
  assert.doesNotMatch(t, /flyttet inn/);
  assert.match(t, /innbyggere 1\. januar 2026/);
});

test('kommuneSetninger: Oslo (eneste kommune i fylket) hopper over fylkesammenligning', () => {
  const t = tekst('0301').join('\n');
  assert.doesNotMatch(t, /I Oslo er/);
  assert.doesNotMatch(t, /I Oslo var medianen/);
});

test('kommuneSetninger: sidene ligner ikke hverandre', () => {
  const a = tekst('1103').join('\n');
  const b = tekst('1151').join('\n');
  assert.notEqual(a, b);
  assert.notEqual(tekst('1103')[0], tekst('1151')[0]);
});

test('rangRader: bare ledd med tall', () => {
  const k = DATA.kommuner.find((x) => x.kode === '1101');
  const rader = rangRader(k, rang.get('1101').land, '2016');
  assert.ok(rader.some((r) => r.navn === 'Folketall'));
  assert.ok(!rader.some((r) => /inntekt/.test(r.navn)));
  assert.ok(rader.every((r) => r.plass >= 1 && r.plass <= r.av));
});

test('kommuneTittel: ≤ 49 tegn også for lange doble navn; parentes', () => {
  assert.equal(kommuneTittel('Stavanger'), 'Stavanger kommune: folketall og nøkkeltall');
  assert.equal(kommuneTittel('Våler (Østfold)'), 'Våler kommune (Østfold): folketall og nøkkeltall');
  for (const navn of ['Storfjord - Omasvuotna - Omasvuono', 'Porsanger - Porsángu - Porsanki', 'Gáivuotna - Kåfjord - Kaivuono', 'Herøy (Møre og Romsdal)', 'Guovdageaidnu - Kautokeino']) {
    const t = kommuneTittel(navn);
    assert.ok(t.length <= 49, `${navn}: ${t}`);
    assert.ok(t.startsWith(navn.split(' - ')[0].split(' (')[0]), t);
  }
});

test('kommuneBeskrivelse: 120–160 tegn for korte og lange navn, null uten folketall', () => {
  const r = rang.get('1103').land;
  for (const navn of ['Os', 'Stavanger', 'Herøy (Møre og Romsdal)', 'Storfjord - Omasvuotna - Omasvuono', 'Gáivuotna - Kåfjord - Kaivuono']) {
    const k = { ...DATA.kommuner[0], navn };
    const d = kommuneBeskrivelse(k, '2026', r, '2016');
    assert.ok(d && d.length >= 120 && d.length <= 160, `${navn}: ${d?.length} ${d}`);
  }
  assert.equal(kommuneBeskrivelse({ ...DATA.kommuner[0], folkemengde: null }, '2026', r, '2016'), null);
});

test('naboer: samme fylke, rundt kommunen i folketallsrekkefølge, ikke seg selv', () => {
  const n = naboer(DATA, SIDER, '1127', 1);
  assert.deepEqual(n.map((x) => x.slug), ['stavanger', 'eigersund'].slice(0, 0).concat(['stavanger', 'utsira']), 'Randaberg: Stavanger (over) og Utsira (under)');
  const forst = naboer(DATA, SIDER, '1103', 3);
  assert.ok(!forst.some((x) => x.slug === 'stavanger'));
  assert.ok(forst.every((x) => ['randaberg', 'utsira', 'eigersund'].includes(x.slug)), 'bare Rogaland');
  assert.equal(forst.length, 3, 'vinduet glir ved kanten');
  assert.deepEqual(naboer(DATA, SIDER, '0301', 3), []);
  assert.deepEqual(naboer(DATA, SIDER, 'ukjent'), []);
});
