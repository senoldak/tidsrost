import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grafForAvsnitt } from './forklart.mjs';

const mappe = mkdtempSync(join(tmpdir(), 'forklart-'));
writeFileSync(join(mappe, 'graf-1.json'), JSON.stringify({ form: 'soyle', tittel: 'Drepte', kilde: { navn: 'SSB' }, enhet: 'personer', desimaler: 0, serier: [{ navn: 'Drepte', punkter: [{ x: '2024', y: 87 }, { x: '2025', y: 106 }] }] }));
const p = (src, ekstra = []) => ({ type: 'element', tagName: 'p', children: [...ekstra, { type: 'element', tagName: 'img', properties: { src, alt: 'x' }, children: [] }] });

test('grafForAvsnitt: JSON varsa etkileşimli kart', () => {
  const h = grafForAvsnitt(p('./graf-1.svg'), mappe);
  assert.match(h, /^<figure class="g-kort" data-graf/);
  assert.match(h, /Drepte/);
});
test('grafForAvsnitt: JSON yoksa null (resim kalır)', () => assert.equal(grafForAvsnitt(p('./graf-2.svg'), mappe), null));
test('grafForAvsnitt: başka resim ya da yazılı paragraf dokunulmaz', () => {
  assert.equal(grafForAvsnitt(p('./cover.png'), mappe), null);
  assert.equal(grafForAvsnitt(p('./graf-1.svg', [{ type: 'text', value: 'Tekst ' }]), mappe), null);
});
test('grafForAvsnitt: boşluk metni sayılmaz', () => assert.notEqual(grafForAvsnitt(p('./graf-1.svg', [{ type: 'text', value: '\n' }]), mappe), null));
test('grafForAvsnitt: geçersiz JSON derlemeyi düşürmez, null', () => {
  writeFileSync(join(mappe, 'graf-3.json'), '{"form":"yok"}');
  assert.equal(grafForAvsnitt(p('./graf-3.svg'), mappe), null);
});
test('grafForAvsnitt: resim + italik açıklama paragrafı da değişir', () => {
  const avsnitt = { type: 'element', tagName: 'p', children: [{ type: 'element', tagName: 'img', properties: { src: './graf-1.svg' }, children: [] }, { type: 'text', value: '\n' }, { type: 'element', tagName: 'em', children: [{ type: 'text', value: 'Kilde: SSB' }] }] };
  assert.notEqual(grafForAvsnitt(avsnitt, mappe), null);
});
test('grafForAvsnitt: resim + düz metin değişmez', () => {
  const avsnitt = { type: 'element', tagName: 'p', children: [{ type: 'element', tagName: 'img', properties: { src: './graf-1.svg' }, children: [] }, { type: 'text', value: ' mer tekst' }] };
  assert.equal(grafForAvsnitt(avsnitt, mappe), null);
});
