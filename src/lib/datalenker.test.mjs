import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datasiderFor, datakortFor } from './datalenker.mjs';

test('datasiderFor: sak om KPI peker til prisstigning, sak om renten til styringsrenten', () => {
  assert.deepEqual(datasiderFor('Konsumprisindeksen steg 3,4 prosent').map((d) => d.url), ['/prisstigning/']);
  assert.deepEqual(datasiderFor('Norges Bank hever styringsrenten til 4,5 prosent').map((d) => d.url), ['/styringsrenten/']);
  assert.deepEqual(datasiderFor('Boligprisene falt i Oslo').map((d) => d.url), ['/boligpriser/']);
  assert.deepEqual(datasiderFor('Arbeidsledigheten økte til 5 prosent ifølge AKU').map((d) => d.url), ['/arbeidsledighet/']);
  assert.deepEqual(datasiderFor('Oransje farevarsel for kraftig regn i Vestland').map((d) => d.url), ['/farevarsler/']);
});

test('datasiderFor: høyst to, i rekkefølgen de nevnes oftest; ingen treff gir tom liste', () => {
  const t = 'Styringsrenten og prisveksten: KPI, inflasjon og renten. Boligprisene også.';
  assert.equal(datasiderFor(t).length, 2);
  assert.deepEqual(datasiderFor(t).map((d) => d.url), ['/prisstigning/', '/styringsrenten/']);
  assert.deepEqual(datasiderFor('Fotballkamp i Bergen'), []);
  assert.deepEqual(datasiderFor(''), []);
});

test('datakortFor: styringsrenten med siste verdi og dato, norsk format', () => {
  const k = datakortFor('Norges Bank holdt styringsrenten uendret');
  assert.equal(k.url, '/styringsrenten/');
  assert.match(k.verdi, /^\d+,\d{2} %$/);
  assert.match(k.tekst, /^Styringsrenten nå, gjeldende fra \d{1,2}\. [a-zæøå]+ \d{4}$/);
  assert.equal(k.kilde, 'Norges Bank');
});

test('datakortFor: prisstigning, bolig og ledighet gir kort med SSB som kilde', () => {
  for (const [t, url] of [['KPI steg i september', '/prisstigning/'], ['Boligprisene falt', '/boligpriser/'], ['Arbeidsledigheten økte', '/arbeidsledighet/']]) {
    const k = datakortFor(t);
    assert.equal(k.url, url);
    assert.equal(k.kilde, 'SSB');
    assert.match(k.verdi, /^−?\d+,\d %$/);
    assert.doesNotMatch(JSON.stringify(k), /undefined|NaN|null/);
  }
});

test('datakortFor: ingen tema, farevarsel eller manglende verdi gir null; neste tema prøves', () => {
  assert.equal(datakortFor('Fotballkamp i Bergen'), null);
  assert.equal(datakortFor('Oransje farevarsel for regn'), null);
  const tom = { '/styringsrenten/': { kilde: { navn: 'Norges Bank' } }, '/prisstigning/': { kilde: { navn: 'Statistisk sentralbyrå (SSB)' }, tolvMnd: 3.4, sisteMaaned: '2026-09' } };
  assert.equal(datakortFor('Styringsrenten og styringsrente, KPI', tom).url, '/prisstigning/');
  assert.equal(datakortFor('Styringsrenten', tom), null);
  assert.equal(datakortFor('Arbeidsledigheten', { '/arbeidsledighet/': { kilde: { navn: 'SSB' }, prosent: 'x', sisteMaaned: '2026-09' } }), null);
});
