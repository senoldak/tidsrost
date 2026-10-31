import test from 'node:test';
import assert from 'node:assert/strict';
import { rehypeOrd } from './rehype-ord.mjs';

const ordbok = { ord: { tilsyn: 'overvåking, kontroll', vikar: 'person som tar over en stilling', avdrag: 'sum som betales av på gjeld', toppmøte: 'møte mellom ledere' } };
const t = (value) => ({ type: 'text', value });
const el = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, properties, children });
const kjør = (tre, path = 'C:/x/tidsrost/src/content/haberler/2026/sak/index.md') =>
  rehypeOrd(ordbok)()(tre, { path, history: [path] });
const knapper = (n, ut = []) => { if (n.tagName === 'button') ut.push(n); (n.children ?? []).forEach((c) => knapper(c, ut)); return ut; };

test('pakker første forekomst i button med data-attributter', () => {
  const tre = el('root', [el('p', [t('Tilsynet var klart. Tilsynet kom igjen.')])]);
  kjør(tre);
  const b = knapper(tre);
  assert.equal(b.length, 1);
  assert.equal(b[0].properties.dataLemma, 'tilsyn');
  assert.equal(b[0].properties.dataDef, 'overvåking, kontroll');
  assert.equal(b[0].properties.type, 'button');
  assert.deepEqual(b[0].properties.className, ['ord']);
  assert.equal(b[0].properties.ariaExpanded, 'false');
  assert.equal(b[0].children[0].value, 'Tilsynet');
});

test('ikke i overskrift, lenke, kode eller eksisterende knapp', () => {
  const tre = el('root', [
    el('h2', [t('Tilsyn')]),
    el('p', [el('a', [t('vikar')]), el('code', [t('avdrag')]), el('button', [t('toppmøte')])]),
  ]);
  kjør(tre);
  assert.equal(knapper(tre).length, 1); // bare den eksisterende
});

test('maks tre per dokument, på tvers av avsnitt', () => {
  const tre = el('root', [el('p', [t('Tilsyn og vikar.')]), el('p', [t('Avdrag og toppmøte.')])]);
  kjør(tre);
  assert.equal(knapper(tre).length, 3);
});

test('bare filer under src/content/haberler/', () => {
  const tre = el('root', [el('p', [t('Tilsynet.')])]);
  kjør(tre, 'C:/x/tidsrost/src/pages/om-oss.md');
  assert.equal(knapper(tre).length, 0);
});

test('teksten rundt bevares', () => {
  const tre = el('root', [el('p', [t('Før '), el('em', [t('toppmøtet')]), t(' etter')])]);
  kjør(tre);
  const b = knapper(tre);
  assert.equal(b.length, 1);
  assert.equal(b[0].children[0].value, 'toppmøtet');
});
