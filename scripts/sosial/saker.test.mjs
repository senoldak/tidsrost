import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sakOku, paylasilir, bildetekst, bildeFil, bildeUrl } from './saker.mjs';

const govde = (n) => Array.from({ length: n }, (_, i) => `ord${i}`).join(' ');
const md = (fm, n = 200) => `---\n${fm}\n---\n\n${govde(n)}\n`;
const fm = `title: "Togstreiken er over"\ndescription: "Partene er enige."\ndate: 2026-10-17T12:00:00+02:00\ncategory: okonomi\nkey_points:\n  - "Ett"\n  - "To"\ncover: ./cover.png\ncoverKreditt: "Illustrasjon: tidsrøst"`;
const simdi = Date.parse('2026-10-17T15:00:00+02:00');

test('sakOku: alanlar ve editoryal kapak ayrımı', () => {
  const s = sakOku('togstreiken', md(fm));
  assert.equal(s.tittel, 'Togstreiken er over');
  assert.deepEqual(s.punkter, ['Ett', 'To']);
  assert.equal(s.gorselKapak, false);
  assert.equal(s.indeks, true);
  assert.equal(sakOku('kart', md(fm.replace('Illustrasjon: tidsrøst', 'Kart: tidsrøst. Varselområde: MET'))).gorselKapak, true);
});

test('paylasilir: kısa (noindex), taslak, gelecek ve eski haber gitmez', () => {
  assert.equal(paylasilir(sakOku('a', md(fm)), simdi), true);
  assert.equal(paylasilir(sakOku('a', md(fm, 50)), simdi), false);
  assert.equal(paylasilir(sakOku('a', md(`${fm}\ndraft: true`)), simdi), false);
  assert.equal(paylasilir(sakOku('a', md(fm)), Date.parse('2026-10-17T11:00:00+02:00')), false);
  assert.equal(paylasilir(sakOku('a', md(fm)), Date.parse('2026-10-18T13:00:00+02:00')), false);
});

test('bildetekst: başlık, özet, noktalar, yönlendirme ve etiketler; bağlantı yok', () => {
  const t = bildetekst(sakOku('a', md(fm)));
  assert.equal(t, 'Togstreiken er over\n\nPartene er enige.\n\n• Ett\n• To\n\nLes hele saken på tidsrost.com\n\n#nyheter #norge #økonomi');
  assert.doesNotMatch(t, /https?:\/\//);
});

test('görsel adları', () => {
  assert.equal(bildeFil('a/b', 'post'), 'a-b-post.png');
  assert.equal(bildeUrl('togstreiken', 'story'), 'https://tidsrost.com/sosial/togstreiken-story.png');
});
