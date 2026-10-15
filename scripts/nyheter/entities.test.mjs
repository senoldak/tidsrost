import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NORWEGIAN_ENTITIES, matchEntities, findEntities } from '../../src/lib/entities.ts';

test('NORWEGIAN_ENTITIES contains all 8 required Wikidata mappings', () => {
  const expected = [
    { name: 'Stortinget', sameAs: 'https://www.wikidata.org/wiki/Q109016', type: 'Organization' },
    { name: 'Norges Bank', sameAs: 'https://www.wikidata.org/wiki/Q1145151', type: 'Organization' },
    { name: 'Meteorologisk institutt', sameAs: 'https://www.wikidata.org/wiki/Q1779817', type: 'Organization' },
    { name: 'Equinor', sameAs: 'https://www.wikidata.org/wiki/Q145547', type: 'Organization' },
    { name: 'Jonas Gahr Støre', sameAs: 'https://www.wikidata.org/wiki/Q316021', type: 'Person' },
    { name: 'NVE', sameAs: 'https://www.wikidata.org/wiki/Q1779822', type: 'Organization' },
    { name: 'Oljefondet', sameAs: 'https://www.wikidata.org/wiki/Q1197779', type: 'Organization' },
    { name: 'Statens vegvesen', sameAs: 'https://www.wikidata.org/wiki/Q1779841', type: 'Organization' },
  ];

  assert.equal(NORWEGIAN_ENTITIES.length, 8);
  for (const exp of expected) {
    const found = NORWEGIAN_ENTITIES.find((e) => e.name === exp.name);
    assert.ok(found, `Entity ${exp.name} must exist`);
    assert.equal(found.sameAs, exp.sameAs);
    assert.equal(found.type, exp.type);
  }
});

test('MET lookaround regex matches isolated acronym and rejects false-positive substrings', () => {
  // Positive matches
  const match1 = matchEntities('MET har sendt ut gult farevarsel for Østlandet');
  assert.ok(match1.some((e) => e.name === 'Meteorologisk institutt'));

  const match2 = matchEntities('Ifølge METs nye prognoser blir det mye regn');
  assert.ok(match2.some((e) => e.name === 'Meteorologisk institutt'));

  const match3 = matchEntities('Farevarsel (MET): Kraftige vindkast i fjellet');
  assert.ok(match3.some((e) => e.name === 'Meteorologisk institutt'));

  // Negative / false-positive substring rejection
  const negative = matchEntities('Vinden er målt til 25 meter i sekundet, 50 kilometer fra kysten med en ny målemetode.');
  assert.ok(!negative.some((e) => e.name === 'Meteorologisk institutt'), 'Substrings meter, kilometer, metode must NOT match MET');
});

test('NVE lookaround regex matches isolated acronym and rejects false-positive substrings', () => {
  // Positive matches
  const match1 = matchEntities('NVE advarer mot økende flomfare i Drammenselva');
  assert.ok(match1.some((e) => e.name === 'NVE'));

  const match2 = matchEntities('NVEs hydrologiske avdeling melder om høy vannføring');
  assert.ok(match2.some((e) => e.name === 'NVE'));

  // Negative / false-positive substring rejection
  const negative = matchEntities('En internasjonal konvensjon for å investere i energisektoren.');
  assert.ok(!negative.some((e) => e.name === 'NVE'), 'Substrings konvensjon, investere must NOT match NVE');
});

test('Norwegian entities match correctly in natural text', () => {
  const text = 'Statsminister Jonas Gahr Støre møtte sjefen for Norges Bank og representanter fra Equinor i Stortinget.';
  const matched = matchEntities(text);

  assert.ok(matched.some((e) => e.name === 'Jonas Gahr Støre'));
  assert.ok(matched.some((e) => e.name === 'Norges Bank'));
  assert.ok(matched.some((e) => e.name === 'Equinor'));
  assert.ok(matched.some((e) => e.name === 'Stortinget'));
});

test('findEntities partitions into about (max 2) and mentions', () => {
  const text = 'Oljefondet og Statens vegvesen samarbeider med Norges Bank og Stortinget.';
  const res = findEntities(text);

  assert.ok(Array.isArray(res.about));
  assert.ok(res.about.length <= 2);
  assert.ok(Array.isArray(res.mentions));
  assert.equal(res.about.length + res.mentions.length, 4);
});

test('matchEntities handles empty or null input gracefully', () => {
  assert.deepEqual(matchEntities(''), []);
  assert.deepEqual(matchEntities(null), []);
});
