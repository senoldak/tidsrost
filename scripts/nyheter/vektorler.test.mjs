// Kaynak: mecmua/site-ortak/gemini/vektorler.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yayımlanan haberlerin vektör dosyası (Faz 2, 27 Ekim 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { kodla, onbellekYukle } from './gomme.mjs';

process.env.GOMME_ANAHTARI = 'test-anahtari';
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

// Tur sonu (Task 4): içerik klasöründen haber listesi, vektör dosyası ve önbellek kaydı.
import { mkdirSync } from 'node:fs';
const { haberMetinleri, gommeTurSonu, ortakOnbellek } = await import('./vektorler.mjs');

function site() {
  const kok = mkdtempSync(path.join(tmpdir(), 'site-'));
  const yaz = (yol, fm) => {
    mkdirSync(path.dirname(path.join(kok, yol)), { recursive: true });
    writeFileSync(path.join(kok, yol), `---\ntitle: "${fm.t}"\ndescription: "${fm.d}"\ndate: ${fm.z}\n---\nGövde\n`);
  };
  yaz('src/content/haberler/eski-haber/index.md', { t: 'Eski', d: 'Eski açıklama', z: '2026-10-01T10:00:00Z' });
  yaz('src/content/haberler/yeni-haber/index.md', { t: 'Yeni', d: 'Yeni açıklama', z: '2026-10-26T10:00:00+03:00' });
  yaz('src/content/haberler/tr/duz-dosya.md', { t: 'Düz', d: 'Düz açıklama', z: '2026-10-20T10:00:00Z' });
  return kok;
}

test('haberMetinleri: klasör/index.md ve düz .md, en yeniden eskiye, başlık + açıklama', () => {
  const kok = site();
  const a = haberMetinleri(path.join(kok, 'src/content/haberler'));
  assert.deepEqual(a.map((h) => h.id), ['yeni-haber', 'eski-haber']);
  assert.equal(a[0].metin, 'Yeni\nYeni açıklama');
  assert.deepEqual(haberMetinleri(path.join(kok, 'src/content/haberler/tr')).map((h) => h.id), ['duz-dosya']);
  assert.deepEqual(haberMetinleri(path.join(kok, 'yok')), []);
});

test('gommeTurSonu: GOMME_VEKTOR=1 iken dosyayı doldurur, önbelleği kaydeder; kapalıyken dokunmaz', async () => {
  const kok = site();
  const onbellekDosyasi = path.join(kok, 'o.json');
  const kapali = await gommeTurSonu({ kok, icerik: 'src/content/haberler', onbellekDosyasi, env: {}, vektorle: sahte() });
  assert.equal(kapali, null);
  assert.equal(existsSync(path.join(kok, 'src/data/vektorler.jsonl')), false);
  const r = await gommeTurSonu({ kok, icerik: 'src/content/haberler', onbellekDosyasi, env: { GOMME_VEKTOR: '1' }, vektorle: sahte() });
  assert.deepEqual(r, { eklenen: 2, eksik: 0 });
  assert.deepEqual([...vektorDosyasiOku(path.join(kok, 'src/data/vektorler.jsonl')).keys()], ['eski-haber', 'yeni-haber']);
  assert.ok(existsSync(onbellekDosyasi));
});

test('gommeTurSonu: hata turu düşürmez', async () => {
  const kok = site();
  const r = await gommeTurSonu({ kok, icerik: 'src/content/haberler', onbellekDosyasi: path.join(kok, 'o.json'), env: { GOMME_VEKTOR: '1' }, vektorle: async () => { throw new Error('patladı'); } });
  assert.equal(r, null);
});

test('ortakOnbellek: aynı dosya için aynı nesne', () => {
  const d = path.join(mkdtempSync(path.join(tmpdir(), 'ob-')), 'o.json');
  assert.equal(ortakOnbellek(d), ortakOnbellek(d));
});

test('ortakOnbellek: göreli ve mutlak yol aynı nesne; tur sonu eşlemenin önbelleğini kaydeder', async () => {
  const dizin = mkdtempSync(path.join(tmpdir(), 'ob2-'));
  const mutlak = path.join(dizin, 'o.json');
  const goreli = path.relative(process.cwd(), mutlak);
  const o = ortakOnbellek(goreli);
  assert.equal(o, ortakOnbellek(mutlak));
  o.kayitlar.x = { v: 'AA==', z: new Date().toISOString() };
  await gommeTurSonu({ kok: dizin, icerik: 'yok', onbellekDosyasi: mutlak, env: {} });
  assert.ok(onbellekYukle(mutlak).kayitlar.x);
});

test('gommeAyari: kapalıyken null, gölgede kip ve önbellek', () => {
  return import('./vektorler.mjs').then(({ gommeAyari }) => {
    assert.equal(gommeAyari({ onbellekDosyasi: 'x.json', env: {} }), null);
    const a = gommeAyari({ onbellekDosyasi: 'x.json', env: { GOMME_ON_ELEME: 'golge' } });
    assert.equal(a.kip, 'golge');
    assert.equal(a.alt, null);
    assert.equal(a.onbellek, ortakOnbellek('x.json'));
  });
});

test('gommeTurSonu: birden çok içerik klasörü (jendume tr/en) kimlikleri klasörle önekler', async () => {
  const kok = site();
  const r = await gommeTurSonu({ kok, icerik: ['src/content/haberler/tr', 'src/content/haberler'], onbellekDosyasi: path.join(kok, 'o.json'), env: { GOMME_VEKTOR: '1' }, vektorle: sahte() });
  assert.equal(r.eklenen, 3);
  assert.deepEqual([...vektorDosyasiOku(path.join(kok, 'src/data/vektorler.jsonl')).keys()], ['haberler/eski-haber', 'haberler/yeni-haber', 'tr/duz-dosya']);
});
