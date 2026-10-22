import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_SAKER, TEMAER, temaerFor } from '../../src/lib/tema.mjs';

test('temaer har unike slugs og en introtekst uten tall', () => {
  const slugs = TEMAER.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const t of TEMAER) {
    assert.match(t.slug, /^[a-z0-9-]+$/);
    assert.ok(t.intro.length > 40, t.slug);
    // Giriş metinleri rakam içermez (uydurma ya da eskiyecek sayı olmasın).
    assert.doesNotMatch(t.intro, /\d/, t.slug);
  }
  assert.equal(MIN_SAKER, 3);
});

test('tittel, ingress og kildelinje gir tema', () => {
  assert.deepEqual(temaerFor({ title: 'Norges Bank holder renten uendret', description: '', body: '' }), ['norges-bank']);
  const body = 'Tekst om tall.\n\n*Kilde: [Statistisk sentralbyrå (SSB)](https://www.ssb.no/)*';
  assert.ok(temaerFor({ title: 'Boligprisene steg', description: '', body }).includes('ssb'));
});

test('én tilfeldig omtale i brødteksten er ikke nok, to er nok', () => {
  const én = 'Saken nevner Stortinget én gang.';
  assert.ok(!temaerFor({ title: 'Ny vei åpnet', description: '', body: én }).includes('stortinget'));
  const to = 'Stortinget behandlet saken. Senere vedtok Stortinget forslaget.';
  assert.ok(temaerFor({ title: 'Ny vei åpnet', description: '', body: to }).includes('stortinget'));
});

test('korte forkortelser krever eksakt skrivemåte og ordgrense', () => {
  // «met» i «metode» eller «nav» i «navn» skal ikke gi treff.
  const t = temaerFor({ title: 'Ny metode for navn og nav', description: 'Navnet endres', body: '' });
  assert.ok(!t.includes('meteorologisk-institutt'));
  assert.ok(!t.includes('nav'));
  assert.ok(temaerFor({ title: 'MET varsler sterk vind', description: '', body: '' }).includes('meteorologisk-institutt'));
  assert.ok(temaerFor({ title: 'Nav endrer reglene for dagpenger', description: '', body: '' }).includes('nav'));
});

test('departementene samles under regjeringen', () => {
  const body = '*Kilde: [Utenriksdepartementet / regjeringen.no](https://www.regjeringen.no/)*';
  assert.ok(temaerFor({ title: 'Norge gir støtte', description: '', body }).includes('regjeringen'));
});

test('lenkeadresser i brødteksten teller ikke', () => {
  const body = 'Les mer [her](https://www.norges-bank.no/sentralbanken/) og [her](https://www.norges-bank.no/sentralbanken/).';
  assert.ok(!temaerFor({ title: 'Annen sak', description: '', body }).includes('norges-bank'));
});
