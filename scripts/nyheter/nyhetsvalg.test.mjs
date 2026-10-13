import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uavhengigeKilder, likhet } from './uavhengighet.mjs';
import { vurder, velg } from './viktighet.mjs';

const ntb = 'Regjeringen foreslår å øke barnetrygden med 500 kroner i måneden fra neste år, opplyser finansministeren til pressen.';

test('samme byråtekst på to nettsteder teller som én kilde', () => {
  const saker = [
    { medie: 'VG', tittel: 'Barnetrygden økes', ingress: ntb },
    { medie: 'Dagbladet', tittel: 'Økt barnetrygd neste år', ingress: ntb + ' Mer om saken kommer.' },
  ];
  assert.ok(likhet(saker[0].ingress, saker[1].ingress) >= 0.5);
  assert.equal(uavhengigeKilder(saker), 1);
});

test('NTB-signatur i begge tekster teller som én kilde', () => {
  const saker = [
    { medie: 'VG', tittel: 'Brann i Bergen', ingress: 'Et lager brant natt til tirsdag. (NTB)' },
    { medie: 'Nettavisen', tittel: 'Lagerbrann', ingress: 'Brannvesenet rykket ut til et stort lager i sentrum. ©NTB' },
  ];
  assert.equal(uavhengigeKilder(saker), 1);
});

test('to selvstendig skrevne saker teller som to kilder', () => {
  const saker = [
    { medie: 'NRK', tittel: 'Barnetrygden økes', ingress: ntb },
    { medie: 'Aftenposten', tittel: 'Familier får mer', ingress: 'Statsbudsjettet gir småbarnsforeldre et løft, og økningen kommer etter press fra Senterpartiet.' },
  ];
  assert.equal(uavhengigeKilder(saker), 2);
});

test('NTB-ord inne i en ellers egen sak slår ikke sammen med en uten signatur', () => {
  const saker = [
    { medie: 'NRK', tittel: 'A', ingress: 'Han sa til NTB at han ikke stiller til gjenvalg som leder av partiet.' },
    { medie: 'VG', tittel: 'B', ingress: 'Partilederen trekker seg etter et turbulent landsmøte i Trondheim.' },
  ];
  assert.equal(uavhengigeKilder(saker), 2);
});

const k = (id, tittel = id) => ({ id, tittel });

test('velg: lav verdi forkastes, høy verdi først, dataskilder slipper vurdering', async () => {
  const kandidater = { norfund: [k('n1'), k('n2')], stortinget: [k('s1')], met: [k('m1')] };
  const poeng = await vurder(kandidater, {
    kall: async ({ prompt }) => {
      assert.ok(!prompt.includes('m1'));
      return { poeng: [{ nr: 0, poeng: 2 }, { nr: 1, poeng: 3 }, { nr: 2, poeng: 5 }] };
    },
  });
  const { valgt, forkastet } = velg(kandidater, poeng, 12);
  assert.deepEqual(valgt.map((x) => x.id), ['s1', 'm1', 'n2']);
  assert.deepEqual(forkastet.map((x) => x.id), ['n1']);
});

test('velg uten poeng: rundgang som før, ingenting forkastes', () => {
  const kandidater = { a: [k('a1'), k('a2')], b: [k('b1')] };
  const { valgt, forkastet } = velg(kandidater, null, 2);
  assert.deepEqual(valgt.map((x) => x.id), ['a1', 'b1']);
  assert.equal(forkastet.length, 0);
});

test('vurder: tomt svar gir null', async () => {
  assert.equal(await vurder({ ssb: [k('x')] }, { kall: async () => null }), null);
});

test('medier-tittel vises uten mediernavn', async () => {
  await vurder({ medier: [k('x', 'Stor sak (VG, NRK)')] }, {
    kall: async ({ prompt }) => {
      assert.ok(prompt.includes('Stor sak') && !prompt.includes('VG'));
      return { poeng: [] };
    },
  });
});
