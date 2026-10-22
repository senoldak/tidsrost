import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lokalRettTekst, lokalRett, ilgiliKisim } from './tekstverktoy.mjs';

test('relativ tid midt i setningen fjernes', () => {
  assert.equal(lokalRettTekst('Regjeringen la i dag fram budsjettet.'), 'Regjeringen la fram budsjettet.');
  assert.equal(lokalRettTekst('Møtet holdes i morgen.'), 'Møtet holdes.');
});

test('relativ tid i setningsstart røres ikke (V2-ordstilling)', () => {
  const t = 'I dag la regjeringen fram budsjettet. I går var det stille.';
  assert.equal(lokalRettTekst(t), t);
});

test('relativ tid etter preposisjon røres ikke', () => {
  const t = 'Ordningen gjelder fra i morgen, og har vart frem til i dag.';
  assert.equal(lokalRettTekst(t), t);
});

test('sitater røres ikke', () => {
  const t = 'Hun sa at «vi møtes i dag, ifølge Reuters.» og gikk.\n– Vi kommer i morgen, sier hun.';
  assert.equal(lokalRettTekst(t), t);
});

test('medietilskriving på slutten av setningen fjernes', () => {
  assert.equal(lokalRettTekst('Prisene stiger, ifølge Klassekampen. Neste setning.'), 'Prisene stiger. Neste setning.');
  assert.equal(lokalRettTekst('Statsministeren går av, skriver Klassekampen og NTB.'), 'Statsministeren går av.');
  assert.equal(lokalRettTekst('Mange er rammet ifølge Reuters!'), 'Mange er rammet!');
});

test('medienavn i andre konstruksjoner står igjen for Gemini', () => {
  const t = 'Ifølge Reuters har regjeringen bestemt seg. Reuters har fått innsyn i 1 250 dokumenter.';
  assert.equal(lokalRettTekst(t), t);
});

test('lokalRett endrer alle felt og beholder tall', () => {
  const sak = { title: 'Skatten økes', description: 'Regjeringen foreslo i går 3,5 prosent.', body: 'Det gjelder 1 250 kommuner, melder NTB.', slug: 'x' };
  assert.deepEqual(lokalRett(sak), { title: 'Skatten økes', description: 'Regjeringen foreslo 3,5 prosent.', body: 'Det gjelder 1 250 kommuner.', slug: 'x' });
});

const fyll = (n, ord) => Array.from({ length: n }, (_, i) => `Avsnitt ${ord} nummer ${i} handler om generelle forhold uten betydning for saken her.`).join('\n\n');

test('kort kilde returneres uendret', () => {
  assert.equal(ilgiliKisim('Kort kilde.', 'utkast', 14000), 'Kort kilde.');
});

test('tall i utkastet trekker inn et sent avsnitt', () => {
  const kilde = `Innledning om budsjettet.\n\n${fyll(200, 'fyll')}\n\nTilskuddet økes til 1.250 millioner kroner i Bodø.\n\n${fyll(50, 'hale')}`;
  const ut = ilgiliKisim(kilde, 'Tilskuddet blir 1 250 millioner kroner.', 3000);
  assert.ok(ut.length <= 3000);
  assert.ok(ut.startsWith('Innledning om budsjettet.'));
  assert.ok(ut.includes('1.250 millioner kroner i Bodø'));
  assert.ok(ut.includes('\n\n[…]\n\n'));
  assert.ok(ut.indexOf('Bodø') > ut.indexOf('Innledning'));
});

test('sitat og navn gir treff, original rekkefølge beholdes', () => {
  const kilde = `Start.\n\n${fyll(100, 'a')}\n\nKari Nordmann sa: «Dette er en viktig dag for alle».\n\n${fyll(100, 'b')}\n\nTromsø kommune er også berørt.\n\n${fyll(100, 'c')}`;
  const ut = ilgiliKisim(kilde, '– Dette er en viktig dag for alle, sier Kari Nordmann. Også Tromsø er berørt.', 2500);
  const a = ut.indexOf('Kari Nordmann');
  const b = ut.indexOf('Tromsø kommune');
  assert.ok(a > 0 && b > a);
});
