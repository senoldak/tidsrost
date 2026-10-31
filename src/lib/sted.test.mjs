import test from 'node:test';
import assert from 'node:assert/strict';
import { finnSted, visKart, kanHaSted, FYLKE_FOR } from './sted.mjs';
import { STEDER } from '../../scripts/nyheter/bilde.mjs';

const sted = (t, i = '') => finnSted(t, i, STEDER);

test('finner sted i tittelen, med fylke', () => {
  assert.deepEqual(sted('To personer pågrepet etter skyting i Drammen'), {
    navn: 'Drammen', lat: 59.74, lon: 10.2, fylke: 'Buskerud',
  });
  assert.equal(sted('Hundrevis evakuert etter at tårnkran ble skjev i Oslo sentrum').navn, 'Oslo');
  assert.equal(sted('Kirkenes må stanse alt privat vannforbruk').fylke, 'Finnmark');
});

test('genitiv og bindestrek er helt ord, delord er det ikke', () => {
  assert.equal(sted('Oslos ordfører går av').navn, 'Oslo');
  assert.equal(sted('Nye Oslo-sykehus kan koste 70 milliarder').navn, 'Oslo');
  assert.equal(sted('Bergensere protesterer'), null);
  assert.equal(sted('Altaposten er ikke et sted'), null);
  assert.equal(sted('Hamarøy får ny ferge'), null);
});

test('norske bokstaver i stedsnavn', () => {
  assert.equal(sted('Brann i Tromsø sentrum').navn, 'Tromsø');
  assert.equal(sted('Skred ved Ålesund').navn, 'Ålesund');
  assert.equal(sted('Strømbrudd i Mo i Rana').navn, 'Mo i Rana');
  assert.equal(sted('Flom i Førde').navn, 'Førde');
});

test('bare tittel og ingress, tittel først', () => {
  assert.equal(sted('Regjeringen foreslår ny lov', 'Saken ble behandlet i Stavanger.').navn, 'Stavanger');
  assert.equal(sted('Brann i Narvik', 'Brannvesenet i Oslo bistår.').navn, 'Narvik');
  assert.equal(sted('Regjeringen foreslår ny lov', 'Ingen steder nevnt.'), null);
});

test('mest spesifikt: mindre by foran storby, ellers først nevnt', () => {
  assert.equal(sted('Skred stenger veien mellom Bergen og Førde').navn, 'Førde');
  assert.equal(sted('Fly fra Oslo til Bergen forsinket').navn, 'Oslo');
});

test('institusjonsnavn og utenlandske byer gir ikke sted', () => {
  assert.equal(sted('Oslo Børs falt kraftig i dag'), null);
  assert.equal(sted('Streik ved OsloMet'), null);
  assert.equal(sted('Brann i Stockholm sentrum'), null);
});

test('fylketabellen dekker alle norske byer i stedslisten', () => {
  for (const s of STEDER.filter((x) => !x.naboland && !['Longyearbyen', 'Ny-Ålesund', 'Jan Mayen'].includes(x.navn))) {
    assert.ok(FYLKE_FOR[s.navn], `fylke mangler for ${s.navn}`);
  }
});

const sak = (title, extra = {}) => ({ title, category: 'innenriks', sted: sted(title), ...extra });

test('visKart: stedet er poenget ved hendelser, med ekte titler', () => {
  for (const t of [
    'Hundrevis evakuert etter at tårnkran ble skjev i Oslo sentrum',
    'Person døde i ulykke på treningssenter på CC Vest i Oslo',
    'To personer pågrepet etter skyting i Drammen',
    'Kirkenes må stanse alt privat vannforbruk',
    'Gult farevarsel for flom i Førde',
    'Skred stengte E39 ved Ålesund',
  ]) assert.equal(visKart(sak(t)), true, t);
});

test('visKart: sted som bare er med, gir ikke kart', () => {
  for (const t of [
    'Anita Leirvik North (H) går av som byråd i Oslo',
    'SpareBank 1 Kundesenter i Stavanger legges ned og 113 mister jobben',
    'Universitetet i Tromsø utsatt for målrettet dataangrep',
    'Statnett planlegger ny kraftledning fra Gran til Oslo',
    'Boligprisene er 3,3 prosent høyere enn for ett år siden – Bergen hadde høyest vekst med 11,2 prosent',
    'USAs spesialutsending reiser til Russland etter Ukraina-samtaler i Oslo',
  ]) assert.equal(visKart(sak(t)), false, t);
});

test('visKart: samlesaker, sport, forklart og saker uten sted', () => {
  const samle = 'Brann snudde til seier etter dramatikk i Conference League og 3 andre saker · 15. oktober, kveld';
  assert.equal(kanHaSted({ title: samle }), false);
  assert.equal(visKart(sak(samle)), false);
  assert.equal(visKart(sak('Brann vant i Bergen', { category: 'sport' })), false);
  assert.equal(visKart(sak('Brann i Oslo', { sjanger: 'forklart' })), false);
  assert.equal(visKart({ title: 'Brann i landet', category: 'innenriks', sted: null }), false);
  assert.equal(visKart(sak('Brann i Oslo', { id: 'farevarsler-25-oktober-2026' })), false);
});

test('ingressen kan beskrive hendelsen når tittelen ikke gjør det', () => {
  assert.equal(visKart({ title: 'Tromsø: veien er stengt', description: 'Et skred gikk over riksveien i natt.', category: 'innenriks', sted: sted('Tromsø: veien er stengt') }), true);
});
