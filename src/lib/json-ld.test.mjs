import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdMetni } from './json-ld.mjs';

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

test('jsonLdMetni: başlıktaki script kapanışı <script> öğesini bitiremez', () => {
  const metin = jsonLdMetni({ headline: 'Faiz </script><a href="https://haber.example.com">tıkla</a> <!-- x -->' });
  assert.ok(!metin.includes('<'));
  assert.ok(!metin.includes('>'));
  assert.ok(metin.includes('\\u003c/script\\u003e'));
});

test('jsonLdMetni: çıktı geçerli JSON kalır ve aynı değeri verir', () => {
  const veri = { '@type': 'NewsArticle', headline: 'A & B <tez> "alıntı"', satir: `a${LS}b${PS}c` };
  const metin = jsonLdMetni(veri);
  for (const c of ['&', LS, PS]) assert.ok(!metin.includes(c));
  assert.deepEqual(JSON.parse(metin), veri);
});
