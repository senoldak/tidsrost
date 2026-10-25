// Kaynak: mecmua/site-ortak/gemini/kullanim-ayrinti.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Katman 0 (Gemini kota planı): model ve amaç başına sayaç, iş sonu dosyası ve saate rapor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { amacBul, kullanimEkle, hataEkle, ayrintiKayitlari, ayrintiSifirla, kullanimDosyasinaYaz, modelHarcamasi } from './kullanim.mjs';
import { raporla } from './gemini-rapor.mjs';

const yigin = (...satirlar) => ['Error', ...satirlar.map((s) => `    at ${s}`)].join('\n');

test('amacBul: lib ve sayaç dışındaki ilk çağıran dosya/fonksiyon; Windows yolu ve adsız fonksiyon', () => {
  assert.equal(
    amacBul(yigin('amacBul (file:///C:/r/scripts/haberler/kullanim.mjs:10:5)', 'gemini (file:///C:/r/scripts/haberler/lib.mjs:50:3)', 'yaziYaz (file:///C:/r/scripts/haberler/yazar.mjs:175:20)')),
    'yazar/yaziYaz',
  );
  assert.equal(amacBul(yigin('gemini (/home/runner/w/scripts/haberler/lib.mjs:50:3)', 'async Promise.all (index 0)', '/home/runner/w/scripts/haberler/olaylar.mjs:90:9')), 'olaylar/anonim');
  assert.equal(amacBul(yigin('gemini (lib.mjs:1:1)')), 'diger');
});

test('kullanimEkle ve hataEkle: model ve amaç başına toplar; 429 ve 5xx ayrı sayılır', () => {
  ayrintiSifirla();
  kullanimEkle({ promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 5 }, { model: 'gemini-flash-lite-latest', amac: 'yazar/yaz' });
  kullanimEkle({ promptTokenCount: 50, candidatesTokenCount: 5 }, { model: 'gemini-flash-lite-latest', amac: 'yazar/yaz' });
  hataEkle('gemini-flash-lite-latest', 'yazar/yaz', 503);
  hataEkle('gemini-flash-latest', 'olaylar/grupla', 429);
  assert.deepEqual(ayrintiKayitlari(), [
    { model: 'gemini-flash-lite-latest', amac: 'yazar/yaz', cagri: 2, giris: 150, cikis: 20, h429: 0, h503: 1 },
    { model: 'gemini-flash-latest', amac: 'olaylar/grupla', cagri: 0, giris: 0, cikis: 0, h429: 1, h503: 0 },
  ]);
});

test('ayrintiKayitlari: en fazla 40 satır; fazlası "diger" satırında toplanır', () => {
  ayrintiSifirla();
  for (let i = 0; i < 45; i++) kullanimEkle({ promptTokenCount: 1 }, { model: 'gemini-flash-lite-latest', amac: `a/${i}` });
  const k = ayrintiKayitlari();
  assert.equal(k.length, 40);
  assert.deepEqual(k.at(-1), { model: 'karisik', amac: 'diger', cagri: 6, giris: 6, cikis: 0, h429: 0, h503: 0 });
});

test('kullanimDosyasinaYaz: aynı iş içindeki önceki betiğin kayıtlarıyla birleşir', async () => {
  const dosya = path.join(await mkdtemp(path.join(os.tmpdir(), 'gk-')), 'gemini-kullanim.json');
  await writeFile(dosya, JSON.stringify([{ model: 'm', amac: 'x/y', cagri: 1, giris: 10, cikis: 1, h429: 0, h503: 0 }]));
  ayrintiSifirla();
  kullanimEkle({ promptTokenCount: 5, candidatesTokenCount: 1 }, { model: 'm', amac: 'x/y' });
  kullanimEkle({ promptTokenCount: 7 }, { model: 'm', amac: 'z/w' });
  kullanimDosyasinaYaz(dosya);
  assert.deepEqual(JSON.parse(await readFile(dosya, 'utf8')), [
    { model: 'm', amac: 'x/y', cagri: 2, giris: 15, cikis: 2, h429: 0, h503: 0 },
    { model: 'm', amac: 'z/w', cagri: 1, giris: 7, cikis: 0, h429: 0, h503: 0 },
  ]);
});

test('raporla: dosyadaki kayıtları anahtarla saate gönderir; eksik ayar ya da ağ hatası işi düşürmez', async () => {
  const dosya = path.join(await mkdtemp(path.join(os.tmpdir(), 'gr-')), 'gemini-kullanim.json');
  const kayitlar = [{ model: 'm', amac: 'x/y', cagri: 1, giris: 1, cikis: 1, h429: 0, h503: 0 }];
  await writeFile(dosya, JSON.stringify(kayitlar));
  let istek;
  const fetchFn = async (url, init) => ((istek = { url, init }), new Response('{"kayit":1}', { status: 200 }));
  assert.match(await raporla({ dosya, url: 'https://saat.example', anahtar: 'a'.repeat(32), site: 'finfolis', fetchFn }), /1 kayıt/);
  assert.equal(istek.url, 'https://saat.example/motor/finfolis/gemini');
  assert.equal(istek.init.headers.Authorization, `Bearer ${'a'.repeat(32)}`);
  assert.deepEqual(JSON.parse(istek.init.body), { kayitlar });
  assert.match(await raporla({ dosya, url: '', anahtar: 'a', site: 'finfolis', fetchFn }), /ayar yok/);
  assert.match(await raporla({ dosya: dosya + '.yok', url: 'https://saat.example', anahtar: 'a', site: 'finfolis', fetchFn }), /kayıt yok/);
  const hata = await raporla({ dosya, url: 'https://saat.example', anahtar: 'a', site: 'finfolis', fetchFn: async () => { throw new Error('ağ'); } });
  assert.match(hata, /gönderilemedi/);
  const red = await raporla({ dosya, url: 'https://saat.example', anahtar: 'a', site: 'finfolis', fetchFn: async () => new Response('{}', { status: 401 }) });
  assert.match(red, /401/);
});

test('modelHarcamasi: modelin bütün amaçlardaki başarılı + başarısız istekleri (Google RPD hepsini sayar)', () => {
  ayrintiSifirla();
  kullanimEkle({ promptTokenCount: 1 }, { model: 'm1', amac: 'a/1' });
  kullanimEkle({ promptTokenCount: 1 }, { model: 'm1', amac: 'a/2' });
  hataEkle('m1', 'a/1', 503);
  hataEkle('m1', 'a/2', 429);
  kullanimEkle({ promptTokenCount: 1 }, { model: 'm2', amac: 'a/1' });
  assert.equal(modelHarcamasi('m1'), 4);
  assert.equal(modelHarcamasi('m2'), 1);
  assert.equal(modelHarcamasi('yok'), 0);
  ayrintiSifirla();
});

test('amacBul: istemci çekirdeği de atlanır (çağrı lib → istemci üzerinden geçer)', () => {
  assert.equal(
    amacBul(yigin('amacBul (file:///C:/r/scripts/bot/kullanim.mjs:10:5)', 'geminiCagir (file:///C:/r/scripts/bot/istemci.mjs:70:3)', 'gemini (file:///C:/r/scripts/bot/lib.mjs:190:3)', 'taslakYaz (file:///C:/r/scripts/bot/yazar.mjs:40:9)')),
    'yazar/taslakYaz',
  );
});
