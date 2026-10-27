// Kaynak: mecmua/site-ortak/gemini/vektorler.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yayımlanan haberlerin vektör dosyası (Faz 2, 27 Ekim 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { kodla } from './gomme.mjs';
import { vektorDosyasiOku, vektorDosyasiGuncelle } from './vektorler.mjs';

const dosyaYap = (satirlar = null) => {
  const d = path.join(mkdtempSync(path.join(tmpdir(), 'vek-')), 'vektorler.jsonl');
  if (satirlar) writeFileSync(d, satirlar.join('\n') + '\n');
  return d;
};
const V = kodla([1, 0, 0]);
const sahte = (kayit = []) => async (metinler) => {
  kayit.push(...metinler);
  return metinler.map(() => new Int8Array([127, 0, 0]));
};

test('guncelle: eksikleri ekler, satırlar kimliğe göre sıralı', async () => {
  const dosya = dosyaYap([JSON.stringify({ id: 'b', v: V })]);
  const istenen = [];
  const r = await vektorDosyasiGuncelle({ dosya, haberler: [{ id: 'c', metin: 'C' }, { id: 'b', metin: 'B' }, { id: 'a', metin: 'A' }], vektorle: sahte(istenen) });
  assert.deepEqual(r, { eklenen: 2, eksik: 0 });
  assert.deepEqual(istenen, ['C', 'A']);
  const satirlar = readFileSync(dosya, 'utf8').trim().split('\n').map((s) => JSON.parse(s).id);
  assert.deepEqual(satirlar, ['a', 'b', 'c']);
});

test('guncelle: azami kadar, en yeniden başlayarak', async () => {
  const dosya = dosyaYap();
  const haberler = Array.from({ length: 40 }, (_, i) => ({ id: `h${String(i).padStart(2, '0')}`, metin: `M${i}` }));
  const r = await vektorDosyasiGuncelle({ dosya, haberler, azami: 25, vektorle: sahte() });
  assert.deepEqual(r, { eklenen: 25, eksik: 15 });
  assert.ok(vektorDosyasiOku(dosya).has('h00'));
  assert.ok(!vektorDosyasiOku(dosya).has('h39'));
});

test('guncelle: artık olmayan kimlik silinir', async () => {
  const dosya = dosyaYap([JSON.stringify({ id: 'eski', v: V }), JSON.stringify({ id: 'a', v: V })]);
  await vektorDosyasiGuncelle({ dosya, haberler: [{ id: 'a', metin: 'A' }], vektorle: sahte() });
  assert.deepEqual([...vektorDosyasiOku(dosya).keys()], ['a']);
});

test('guncelle: gömme yoksa dosyaya dokunmaz', async () => {
  const dosya = dosyaYap([JSON.stringify({ id: 'eski', v: V })]);
  const once = readFileSync(dosya, 'utf8');
  const r = await vektorDosyasiGuncelle({ dosya, haberler: [{ id: 'a', metin: 'A' }], vektorle: async () => null });
  assert.deepEqual(r, { eklenen: 0, eksik: 1 });
  assert.equal(readFileSync(dosya, 'utf8'), once);
  const yok = dosyaYap();
  await vektorDosyasiGuncelle({ dosya: yok, haberler: [{ id: 'a', metin: 'A' }], vektorle: async () => null });
  assert.equal(existsSync(yok), false);
});

test('guncelle: vektörü null gelen haber eklenmez, eksik sayılır', async () => {
  const dosya = dosyaYap();
  const r = await vektorDosyasiGuncelle({ dosya, haberler: [{ id: 'a', metin: 'A' }, { id: 'b', metin: 'B' }], vektorle: async (m) => [new Int8Array([127]), null] });
  assert.deepEqual(r, { eklenen: 1, eksik: 1 });
});

test('guncelle: 2 MB sınırı aşılırsa en eski haberler atılır', async () => {
  const dosya = dosyaYap();
  const haberler = Array.from({ length: 5 }, (_, i) => ({ id: `h${i}`, metin: `M${i}` }));
  await vektorDosyasiGuncelle({ dosya, haberler, vektorle: sahte(), azamiBayt: 80 });
  const kalan = [...vektorDosyasiOku(dosya).keys()];
  assert.ok(kalan.length < 5 && kalan.length > 0);
  assert.ok(kalan.includes('h0')); // en yeni korunur
  assert.ok(!kalan.includes('h4'));
});

test('oku: dosya yoksa boş, bozuk satır atlanır', () => {
  assert.equal(vektorDosyasiOku(dosyaYap()).size, 0);
  const dosya = dosyaYap([JSON.stringify({ id: 'a', v: V }), '{bozuk', JSON.stringify({ id: 'b' })]);
  assert.deepEqual([...vektorDosyasiOku(dosya).keys()], ['a']);
});
