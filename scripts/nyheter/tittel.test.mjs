import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sjekkTittel, TITTEL_REGEL } from './redaktor.mjs';

test('gode titler som begynner med selve saken godkjennes', () => {
  for (const t of [
    'Norges Bank holder styringsrenten uendret',
    'Norge gir 150 millioner til glemte kriser',
    'Regjeringen foreslår ny ordning for strømstøtte',
    'Gult farevarsel for kraftige vindkast i deler av Nordland',
    'Stortinget vedtok forslag om endringer i skatteloven',
    'Mattilsynet trekker tilbake basilikum fra butikkene',
    // Kolon senere i tittelen er ikke en «etikett» i starten.
    'Boligmarkedet i flere større byer: lang salgstid og færre budgivere',
  ]) {
    assert.deepEqual(sjekkTittel(t), [], t);
  }
});

test('kolon tidlig i tittelen avvises', () => {
  for (const t of [
    'Departementet: Krav om elektronisk sporing på alle fiskebåter',
    'Finansdepartementet: Møtte Ukrainas ambassadør i Oslo',
    'Statsministerens kontor: Støre skal møte Polens ledere',
    'Norges Bank: Renten holdes uendret ut året',
    'Statistisk sentralbyrå (SSB): Boligprisene steg i tredje kvartal',
    'Støre: Vi må styrke beredskapen i nord',
  ]) {
    assert.ok(sjekkTittel(t).some((p) => p.includes('kolon')), t);
  }
});

test('vage titler og titler uten navngitt avsender avvises', () => {
  for (const t of [
    'Dette må du vite om de nye reglene',
    'Nå skjer det store endringer for bilister',
    'Viktig melding til alle som eier hytte',
    'Departementet foreslår endringer i regelverket',
    'Direktoratet sender ut nye råd om vinterdekk',
  ]) {
    assert.ok(sjekkTittel(t).some((p) => p.includes('vag')), t);
  }
});

test('spørsmål og for korte titler avvises', () => {
  assert.ok(sjekkTittel('Blir renten satt ned i desember?').some((p) => p.includes('spørsmål')));
  assert.ok(sjekkTittel('Nye tall').some((p) => p.includes('for kort')));
});

test('ord som bare begynner likt som en vag åpning godkjennes', () => {
  // «Seniorer», «Lesesenteret», «Nåværende» skal ikke tolkes som «Se», «Les», «Nå».
  assert.deepEqual(sjekkTittel('Seniorer får høyere pensjon fra januar'), []);
  assert.deepEqual(sjekkTittel('Lesesenteret får ny leder fra nyttår'), []);
});

test('tittelregelen i promptene nevner søkeord, kolon og vage titler', () => {
  assert.match(TITTEL_REGEL, /søker etter/);
  assert.match(TITTEL_REGEL, /Departementet: …/);
  assert.match(TITTEL_REGEL, /vage titler/);
});
