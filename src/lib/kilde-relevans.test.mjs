import test from 'node:test';
import assert from 'node:assert/strict';
import { relevanteSaker, sammeHendelse, urelatertUrl, slugOrd } from './kilde-relevans.mjs';

const s = (tittel, ingress = '') => ({ tittel, ingress });

test('sammeHendelse: samme hendelse fra to medier', () => {
  assert.ok(sammeHendelse(s('Ørjan Nyland hylles etter comebacket for RB Leipzig'), s('Ørjan Nyland får strålende skussmål etter comebacket')));
  assert.ok(sammeHendelse(s('Fem personer døde i bussulykke i Nordland'), s('Bussulykke i Nordland: fem omkom')));
});

test('sammeHendelse: urelaterte saker', () => {
  assert.ok(!sammeHendelse(s('Abortventetiden varierer kraftig ved norske sykehus'), s('Russland beslaglegger eiendommer i Oslo')));
  assert.ok(!sammeHendelse(s('Københavns universitet rammet av dataangrep'), s('Et forferdelig rot i Premier League')));
  assert.ok(!sammeHendelse(s('Ørjan Nyland hylles etter comebacket for RB Leipzig'), s('Erling Braut Haaland slår tilbake etter kritikk om at han er sliten')));
  assert.ok(!sammeHendelse(s('Støre kritiserer Frp for skolen i Møre og Romsdal'), s('Kulturetaten i Oslo får ny sjef')));
});

test('relevanteSaker: dropper den urelaterte', () => {
  const r = relevanteSaker([
    s('Ørjan Nyland hylles etter comebacket for RB Leipzig'),
    s('Erling Braut Haaland slår tilbake etter kritikk'),
    s('Nyland får strålende skussmål etter comebacket for RB Leipzig'),
  ]);
  assert.deepEqual(r.behold, [0, 2]);
  assert.deepEqual(r.dropp, [1]);
});

test('relevanteSaker: ingen treff gir bare hovedsaken', () => {
  assert.deepEqual(relevanteSaker([s('Dataangrep mot universitet i København'), s('Skolen i Møre og Romsdal diskuteres i Stortinget')]).behold, [0]);
});

test('slugOrd', () => {
  assert.deepEqual(slugOrd('https://www.vg.no/sport/i/9ka6yw/oerjan-nyland-faar-straalende-skussmaal'), ['oerjan', 'nyland', 'faar', 'straalende', 'skussmaal']);
  assert.deepEqual(slugOrd('https://www.vg.no/nyheter/i/AbC123'), []);
});

const NYLAND = 'Ørjan Nyland hylles etter comebacket for RB Leipzig\nDen norske målvakten fikk sin første kamp';
test('urelatertUrl: negative eksempler', () => {
  assert.ok(urelatertUrl('https://www.nrk.no/sport/erling-braut-haaland-slar-tilbake-etter-kritikk-om-at-han-er-sliten-etter-vm-og-nasjonsligaen-1.18063782', NYLAND));
  assert.ok(urelatertUrl('https://www.nettavisen.no/nyheter/russland-beslaglegger-eiendommer-i-oslo/s/5-95-123', 'Abortventetiden varierer kraftig ved norske sykehus. Kvinner venter ulikt.'));
  assert.ok(urelatertUrl('https://www.dagbladet.no/sport/et-forferdelig-rot/123', 'Københavns universitet rammet av dataangrep. Universitetet melder om angrep.'));
  assert.ok(urelatertUrl('https://www.aftenposten.no/oslo/i/x/kulturetaten-i-oslo-far-ny-sjef', 'Store kritiserer Frp for skolen i Møre og Romsdal i Stortinget'));
});

test('urelatertUrl: sanne treff og usikre adresser beholdes', () => {
  assert.ok(!urelatertUrl('https://www.vg.no/sport/i/9ka6yw/oerjan-nyland-faar-straalende-skussmaal-etter-comebacket-for-rb-leipzig', NYLAND));
  assert.ok(!urelatertUrl('https://www.vg.no/sport/i/AbC123', NYLAND));
  assert.ok(!urelatertUrl('https://www.nrk.no/x/kort-slug', NYLAND));
});

test('urelatertUrl: stammet ord på begge sider (Marine/marin)', () => {
  assert.ok(!urelatertUrl('https://www.dagsavisen.no/nyheter/marine-le-pen-vil-smadre-eu-og-energisamarbeidet/10585850', 'Marine Le Pen truer med å knuse EUs budsjettplaner'));
});

test('urelatertUrl: korte ord som han og fem gir ikke treff', () => {
  assert.ok(urelatertUrl('https://www.nettavisen.no/nyheter/russland-varsler-kamp-mot-arrest-av-fem-eiendommer-i-oslo/s/80-95-1', 'Abortventetiden varierer. Fem sykehus og han venter.'));
});
