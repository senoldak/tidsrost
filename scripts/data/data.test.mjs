import { test } from 'node:test';
import assert from 'node:assert/strict';
import { farevarsler, hasterPublisering, lesSdmxCsv, sammeInnhold, styringsrente } from './data.mjs';

const CSV = `FREQ;Frequency;INSTRUMENT_TYPE;Instrument Type;TENOR;Tenor;UNIT_MEASURE;Unit of Measure;DECIMALS;COLLECTION;Collection Indicator;TIME_PERIOD;OBS_VALUE;CALC_METHOD;Calculation Method
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-01-02;4.5;;
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-01-03;4.5;;
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-06-20;4.25;;
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-06-23;4.25;;
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-09-19;4;;
B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2025-09-22;NaN;;`;

test('lesSdmxCsv leser dato og verdi og hopper over ugyldige rader', () => {
  const serie = lesSdmxCsv(CSV);
  assert.equal(serie.length, 5);
  assert.deepEqual(serie[0], { dato: '2025-01-02', verdi: 4.5 });
  assert.deepEqual(serie.at(-1), { dato: '2025-09-19', verdi: 4 });
});

test('lesSdmxCsv avviser ukjent format i stedet for å gjette', () => {
  assert.throws(() => lesSdmxCsv('a;b;c\n1;2;3'));
});

test('styringsrente finner gjeldende nivå, startdato og endringer (nyeste først)', () => {
  const r = styringsrente(lesSdmxCsv(CSV));
  assert.equal(r.rente, 4);
  assert.equal(r.gjeldendeFra, '2025-09-19');
  assert.equal(r.sisteObservasjon, '2025-09-19');
  assert.deepEqual(r.endringer, [
    { fra: '2025-09-19', rente: 4, forrige: 4.25 },
    { fra: '2025-06-20', rente: 4.25, forrige: 4.5 },
  ]);
});

test('styringsrente uten endring i serien har ukjent startdato (null), ikke en gjettet dato', () => {
  const r = styringsrente([{ dato: '2025-01-02', verdi: 4.5 }, { dato: '2025-01-03', verdi: 4.5 }]);
  assert.equal(r.gjeldendeFra, null);
  assert.equal(r.serieFra, '2025-01-02');
});

test('styringsrente uten observasjoner kaster feil', () => {
  assert.throws(() => styringsrente([]));
});

const varsel = (id, nivå, domene, start, område = 'Område X') => ({
  properties: {
    id,
    awareness_level: `2; ${nivå}; Moderate`,
    eventAwarenessName: 'Kraftige vindkast',
    area: område,
    geographicDomain: domene,
    description: 'Beskrivelse.',
    instruction: 'Råd. ',
    consequences: 'Konsekvens.',
    web: 'https://www.met.no/vaer-og-klima/side',
  },
  when: { interval: [start, '2026-10-16T22:00:00+00:00'] },
});

test('farevarsler sorterer etter nivå og start, og oversetter nivå og domene', () => {
  const liste = farevarsler({
    features: [
      varsel('a', 'yellow', 'land', '2026-10-15T10:00:00+00:00'),
      varsel('b', 'red', 'marine', '2026-10-16T10:00:00+00:00'),
      varsel('c', 'orange', 'land', '2026-10-15T08:00:00+00:00'),
    ],
  });
  assert.deepEqual(liste.map((v) => v.id), ['b', 'c', 'a']);
  assert.equal(liste[0].niva, 'rodt');
  assert.equal(liste[0].domene, 'hav');
  assert.equal(liste[2].rad, 'Råd.');
});

test('farevarsler godtar bare met.no-lenker og dropper varsler uten nivå', () => {
  const f = varsel('d', 'yellow', 'land', '2026-10-15T10:00:00+00:00');
  f.properties.web = 'https://annet.example/side';
  const uten = varsel('e', 'purple', 'land', '2026-10-15T10:00:00+00:00');
  const liste = farevarsler({ features: [f, uten] });
  assert.equal(liste.length, 1);
  assert.equal(liste[0].web, null);
});

test('farevarsler avviser svar uten features', () => {
  assert.throws(() => farevarsler({}));
});

test('sammeInnhold ser bort fra hentetidspunktet', () => {
  assert.equal(sammeInnhold({ hentet: '1', rente: 4 }, { hentet: '2', rente: 4 }), true);
  assert.equal(sammeInnhold({ hentet: '1', rente: 4 }, { hentet: '1', rente: 4.25 }), false);
  assert.equal(sammeInnhold(null, { hentet: '1', rente: 4 }), false);
});

test('hasterPublisering: rente og oransje/røde varsler publiseres straks, bare gule venter', () => {
  const gult = { id: 'g1', niva: 'gult', hendelse: 'Vind' };
  const rodt = { id: 'r1', niva: 'rodt', hendelse: 'Flom' };
  const v = (...varsler) => ({ hentet: '1', varsler });
  assert.equal(hasterPublisering('styringsrente.json', { hentet: '1', rente: 4 }, { hentet: '2', rente: 4.25 }), true);
  assert.equal(hasterPublisering('styringsrente.json', { hentet: '1', rente: 4 }, { hentet: '2', rente: 4 }), false);
  assert.equal(hasterPublisering('farevarsler.json', v(), v(gult)), false);
  assert.equal(hasterPublisering('farevarsler.json', v(rodt, gult), v(rodt)), false);
  assert.equal(hasterPublisering('farevarsler.json', v(gult), v(rodt, gult)), true);
  assert.equal(hasterPublisering('farevarsler.json', v(rodt), v()), true);
  assert.equal(hasterPublisering('farevarsler.json', v({ ...rodt, niva: 'oransje' }), v(rodt)), true);
});

test('hasterPublisering: SSB-filer venter på neste vanlige publisering, styringsrenten haster', () => {
  for (const fil of ['prisstigning.json', 'boligpriser.json', 'arbeidsledighet.json', 'varselarkiv.json']) {
    assert.equal(hasterPublisering(fil, { a: 1 }, { a: 2 }), false, fil);
  }
  assert.equal(hasterPublisering('styringsrente.json', { rente: 4 }, { rente: 4.25 }), true);
});
