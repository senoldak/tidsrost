// Kaynak: mecmua/site-ortak/lib/src/lib/anlam.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Derlemede ilgili haberler için vektör okuyucu (Faz 2, 27 Ekim 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vektorleriOku, anlamBenzerligi } from './anlam.mjs';

const b64 = (dizi) => Buffer.from(Int8Array.from(dizi).buffer).toString('base64');

function kok(satirlar) {
  const k = mkdtempSync(path.join(tmpdir(), 'anlam-'));
  if (satirlar) {
    mkdirSync(path.join(k, 'src/data'), { recursive: true });
    writeFileSync(path.join(k, 'src/data/vektorler.jsonl'), satirlar.join('\n'));
  }
  return k;
}

test('vektorleriOku: dosya yoksa boş, bozuk satır atlanır', () => {
  assert.equal(vektorleriOku(kok()).size, 0);
  const h = vektorleriOku(kok([JSON.stringify({ id: 'a', v: b64([127, 0]) }), '{bozuk', JSON.stringify({ id: 'b', v: b64([90, 90]) })]));
  assert.deepEqual([...h.keys()], ['a', 'b']);
});

test('anlamBenzerligi: kosinüs; bilinmeyen kimlik null', () => {
  const h = vektorleriOku(kok([JSON.stringify({ id: 'a', v: b64([127, 0]) }), JSON.stringify({ id: 'b', v: b64([90, 90]) }), JSON.stringify({ id: 'c', v: b64([0, 127]) })]));
  assert.ok(Math.abs(anlamBenzerligi(h, 'a', 'b') - Math.SQRT1_2) < 0.01);
  assert.ok(Math.abs(anlamBenzerligi(h, 'a', 'c')) < 0.01);
  assert.equal(anlamBenzerligi(h, 'a', 'yok'), null);
});
