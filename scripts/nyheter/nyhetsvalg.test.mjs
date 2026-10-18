import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uavhengigeKilder, likhet } from './uavhengighet.mjs';
import { vurder, velg, puanTemizle, PUAN_VERSJON, PUAN_GECERLI_MS } from './viktighet.mjs';

const ntb = 'Regjeringen foreslår å øke barnetrygden med 500 kroner i måneden fra neste år, opplyser finansministeren til pressen.';

test('samme byråtekst på to nettsteder teller som én kilde', () => {
  const saker = [
    { medie: 'Avis A', tittel: 'Barnetrygden økes', ingress: ntb },
    { medie: 'Avis B', tittel: 'Økt barnetrygd neste år', ingress: ntb + ' Mer om saken kommer.' },
  ];
  assert.ok(likhet(saker[0].ingress, saker[1].ingress) >= 0.5);
  assert.equal(uavhengigeKilder(saker), 1);
});

test('NTB-signatur i begge tekster teller som én kilde', () => {
  const saker = [
    { medie: 'Avis A', tittel: 'Brann i Bergen', ingress: 'Et lager brant natt til tirsdag. (NTB)' },
    { medie: 'Avis C', tittel: 'Lagerbrann', ingress: 'Brannvesenet rykket ut til et stort lager i sentrum. ©NTB' },
  ];
  assert.equal(uavhengigeKilder(saker), 1);
});

test('to selvstendig skrevne saker teller som to kilder', () => {
  const saker = [
    { medie: 'Avis D', tittel: 'Barnetrygden økes', ingress: ntb },
    { medie: 'Avis B', tittel: 'Familier får mer', ingress: 'Statsbudsjettet gir småbarnsforeldre et løft, og økningen kommer etter press fra Senterpartiet.' },
  ];
  assert.equal(uavhengigeKilder(saker), 2);
});

test('NTB-ord inne i en ellers egen sak slår ikke sammen med en uten signatur', () => {
  const saker = [
    { medie: 'Avis D', tittel: 'A', ingress: 'Han sa til NTB at han ikke stiller til gjenvalg som leder av partiet.' },
    { medie: 'Avis A', tittel: 'B', ingress: 'Partilederen trekker seg etter et turbulent landsmøte i Trondheim.' },
  ];
  assert.equal(uavhengigeKilder(saker), 2);
});

const k = (id, tittel = id) => ({ id, tittel });

test('velg: lav verdi forkastes, høy verdi først, dataskilder slipper vurdering', async () => {
  const kandidater = { norfund: [k('n1'), k('n2')], stortinget: [k('s1')], met: [k('m1')] };
  const poeng = await vurder(kandidater, {
    kall: async ({ prompt }) => {
      assert.ok(!prompt.includes('m1'));
      return { poeng: [{ nr: 0, poeng: 65 }, { nr: 1, poeng: 70 }, { nr: 2, poeng: 95 }] };
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

test('medier-tittel vises uten parentes', async () => {
  await vurder({ medier: [k('x', 'Stor sak (2 medier)')] }, {
    kall: async ({ prompt }) => {
      assert.ok(prompt.includes('Stor sak') && !prompt.includes('medier)'));
      return { poeng: [] };
    },
  });
});

test('puanbuffer: kjent sak spørres ikke på nytt, ny sak får puan og lagres', async () => {
  const hukommelse = {};
  const na = Date.parse('2026-10-18T10:00:00Z');
  const sporsmal = [];
  const kall = async ({ prompt }) => {
    sporsmal.push(prompt);
    return { poeng: [{ nr: 0, poeng: 88 }, { nr: 1, poeng: 40 }] };
  };
  const a = await vurder({ ssb: [k('a'), k('b')] }, { kall, hukommelse, na });
  assert.deepEqual([...a.values()], [88, 40]);
  assert.equal(hukommelse.a.v, PUAN_VERSJON);
  // Neste tur: a og b kjent, bare ny sak c spørres (nummerert fra 0).
  const c = await vurder({ ssb: [k('a'), k('b'), k('c')] }, { kall: async ({ prompt }) => { sporsmal.push(prompt); return { poeng: [{ nr: 0, poeng: 75 }] }; }, hukommelse, na: na + 864e5 });
  assert.equal(sporsmal.length, 2);
  assert.ok(!sporsmal[1].includes('1. [ssb]') && sporsmal[1].includes('0. [ssb] c'));
  assert.deepEqual([...c.values()], [88, 40, 75]);
  // Alt kjent: ingen KI-kall.
  const d = await vurder({ ssb: [k('a'), k('c')] }, { kall: async () => assert.fail('skal ikke kalles'), hukommelse, na: na + 2 * 864e5 });
  assert.deepEqual([...d.values()], [88, 75]);
});

test('puanbuffer: utløper etter tre dager og ugyldiggjøres av ny versjon', async () => {
  const na = Date.parse('2026-10-18T10:00:00Z');
  const hukommelse = {
    gammel: { p: 90, v: PUAN_VERSJON, t: new Date(na - PUAN_GECERLI_MS - 1).toISOString() },
    annen: { p: 90, v: 'annen-versjon', t: new Date(na).toISOString() },
    fersk: { p: 90, v: PUAN_VERSJON, t: new Date(na - 1000).toISOString() },
  };
  let spurt = '';
  const p = await vurder({ ssb: [k('gammel'), k('annen'), k('fersk')] }, {
    kall: async ({ prompt }) => { spurt = prompt; return { poeng: [{ nr: 0, poeng: 50 }, { nr: 1, poeng: 60 }] }; },
    hukommelse,
    na,
  });
  assert.ok(spurt.includes('0. [ssb] gammel') && spurt.includes('1. [ssb] annen') && !spurt.includes('fersk'));
  assert.deepEqual([...p.values()].sort((x, y) => x - y), [50, 60, 90]);
  puanTemizle(hukommelse, na + 4 * 864e5);
  assert.deepEqual(Object.keys(hukommelse), []);
});

test('puanbuffer: svikt i KI-kallet gir null og skriver ingenting', async () => {
  const hukommelse = {};
  assert.equal(await vurder({ ssb: [k('x')] }, { kall: async () => null, hukommelse }), null);
  assert.deepEqual(hukommelse, {});
});
