import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delEtterAvsnitt } from './delhtml.mjs';

test('deler etter andre avsnitt på øverste nivå', () => {
  const [a, b] = delEtterAvsnitt('<p>en</p>\n<p>to <a href="x">lenke</a></p>\n<p>tre</p>');
  assert.equal(a, '<p>en</p>\n<p>to <a href="x">lenke</a></p>');
  assert.equal(b, '\n<p>tre</p>');
});

test('avsnitt i sitat og liste, bilder og kommentarer teller ikke som øverste nivå', () => {
  const html = '<p>en</p><blockquote><p>sitat</p><p>mer</p></blockquote><img src="a.png"><!-- <p>x</p> --><p>to</p><ul><li><p>l</p></li></ul><p>tre</p>';
  const [a, b] = delEtterAvsnitt(html);
  assert.ok(a.endsWith('<p>to</p>'));
  assert.equal(b, '<ul><li><p>l</p></li></ul><p>tre</p>');
});

test('færre enn tre avsnitt: alt står før, modulen kommer etter teksten', () => {
  assert.deepEqual(delEtterAvsnitt('<p>en</p><p>to</p>'), ['<p>en</p><p>to</p>', '']);
  assert.deepEqual(delEtterAvsnitt(''), ['', '']);
  assert.deepEqual(delEtterAvsnitt('<h2>x</h2><p>en</p>'), ['<h2>x</h2><p>en</p>', '']);
});
