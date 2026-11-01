import test from 'node:test';
import assert from 'node:assert/strict';
import { grafHtml } from './html.mjs';

const d = { form: 'soyle', tittel: 'Tittel <b>', under: 'Under', tall: { verdi: '5 %', etikett: 'sep.' }, enhet: 'Prosent', kilde: { navn: 'SSB', url: 'https://www.ssb.no/', tabell: '13760' }, serier: [{ navn: 'A', punkter: [{ x: 'a', y: 1 }, { x: 'b', y: 2 }] }] };

test('grafHtml: kart iskeleti', () => {
  const h = grafHtml(d, { id: 'g1' });
  assert.match(h, /^<figure class="g-kort" data-graf tabindex="0">/);
  assert.match(h, /<h3 class="g-tittel">Tittel &lt;b&gt;<\/h3>/);
  assert.match(h, /<p class="g-under">Under<\/p>/);
  assert.match(h, /<p class="g-tall">5 %<small>sep\.<\/small><\/p>/);
  assert.match(h, /Kilde: <a href="https:\/\/www\.ssb\.no\/">SSB<\/a>, tabell 13760/);
  assert.match(h, /<summary>Vis tallene<\/summary>/);
  assert.match(h, /<script type="application\/json" data-graf-punkter>\{"modus":"element"/);
});
test('grafHtml: seçenekler', () => {
  const h = grafHtml(d, { id: 'g1', visTittel: false, tabell: false, bred: true, nivaa: 2 });
  assert.match(h, /class="g-kort g-bred"/);
  assert.match(h, /<h2 class="g-tittel sr-only">/);
  assert.doesNotMatch(h, /Vis tallene/);
});
test('grafHtml: JSON içinde < kaçışlı', () => assert.doesNotMatch(grafHtml({ ...d, serier: [{ navn: 'A', punkter: [{ x: '</script>', y: 1 }] }] }, { id: 'g' }).split('data-graf-punkter>')[1], /<\/script>.*<\/script>/s));
