// Kaynak: mecmua/site-ortak/dil-nb/dil-nb.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rettNb, sprakProblemerNb, kesinProblemer, korpusOrd, ukjenteOrdNb } from './dil-nb.mjs';

const koder = (t, v) => sprakProblemerNb(t, v).map((p) => p.kod);

test('rettNb: tusenskille, grader, intervall', () => {
  assert.equal(rettNb('450.000 russiske soldater og 1.250.000 kroner'), '450 000 russiske soldater og 1 250 000 kroner');
  assert.equal(rettNb('Møtet 12.11.2026 kl. 14.15'), 'Møtet 12.11.2026 kl. 14.15');
  assert.equal(rettNb('2,8°C i Oslo'), '2,8 °C i Oslo');
  assert.equal(rettNb('tapte 4-6, 4-6 i finalen'), 'tapte 4–6, 4–6 i finalen');
  assert.equal(rettNb('dato 2026-11-12 og Covid-19'), 'dato 2026-11-12 og Covid-19');
});

test('skrivefeil og dobbelt ord er kesin', () => {
  assert.deepEqual(koder('Til tross for at opppeturen ble stoppet.'), ['skrivefeil']);
  assert.deepEqual(koder('alle vil få muligheten til til å gjøre det'), ['dobbelt-ord']);
  assert.deepEqual(koder('WWW-adressen er ny, se www.nav.no.'), []);
});

test('engelsk setning, men ikke engelske navn', () => {
  const p = sprakProblemerNb('Han sa: «There is a difference between doing more with less and doing less.»');
  assert.equal(kesinProblemer(p)[0].kod, 'engelsk');
  assert.deepEqual(koder('Filmen «The Lord of the Rings» går på kino.'), []);
});

test('gjentatt setning', () => {
  const t = 'Redningsarbeidet ble avsluttet søndag kveld. Mer info kom senere i dag. Redningsarbeidet ble avsluttet søndag kveld.';
  assert.ok(koder(t).includes('gjentatt-setning'));
});

test('mønstre og tall med bokstaver er ikke kesin', () => {
  const p = sprakProblemerNb('Ulykken skjedde i sydgående løp. Totalt 44 700 individer. Tjueen land deltar.');
  assert.equal(kesinProblemer(p).length, 0);
  assert.deepEqual(p.map((x) => x.kod).sort(), ['monster', 'monster', 'tall-med-bokstaver']);
});

test('ett avsnitt bare for brødtekst', () => {
  const t = 'ord '.repeat(200);
  assert.deepEqual(koder(t), []);
  assert.deepEqual(koder(t, { brodtekst: true }), ['ett-avsnitt']);
});

test('ukjenteOrdNb: korpus, kilde, sammensetning og ordbok', async () => {
  const korpus = korpusOrd(['strømprisen steg i dag', 'strømprisen falt', 'strømprisen igjen']);
  const oppslag = [];
  const hent = async (url) => {
    const q = new URL(url).searchParams.get('q');
    oppslag.push(q);
    const kjente = { ventet: { inflect: [['vente']] } };
    return { ok: true, json: async () => ({ a: kjente[q] ?? {} }) };
  };
  const ukjente = await ukjenteOrdNb('Strømprisen ventet, men vented og påkjkning. Boligbrannen og kildeord.', {
    korpus,
    kilde: 'kildeord finnes her',
    hent,
  });
  assert.deepEqual(ukjente.sort(), ['påkjkning', 'vented']);
  assert.ok(!oppslag.includes('strømprisen'));
});

test('ukjenteOrdNb: nettverksfeil gir ingen falske funn', async () => {
  const hent = async () => {
    throw new Error('nede');
  };
  assert.deepEqual(await ukjenteOrdNb('helt nytt ordxyz her', { hent }), []);
});
