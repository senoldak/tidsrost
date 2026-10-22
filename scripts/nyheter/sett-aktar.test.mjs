import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aktarimKayitlari, aktar } from './sett-aktar.mjs';
import { motorKimlik } from './motor.mjs';

const ISO = '2026-10-12T00:00:00.000Z';
const A = 'regjeringen:aaaaaaaa';
const C = 'https://haber.example.com/x';

test('kimlik motorKimlik(id) ile aynı, durum elendi, gerekçe sabit', () => {
  const [k] = aktarimKayitlari({ sett: { [A]: ISO } });
  assert.equal(k.kimlik, motorKimlik(A));
  assert.equal(k.durum, 'elendi');
  assert.equal(k.gerekce, 'aktarım: eski düzende karar verildi');
  assert.match(k.kimlik, /^[A-Za-z0-9:_-]{1,128}$/);
});

test('sett yoksa boş', () => {
  assert.deepEqual(aktarimKayitlari({}), []);
});

test('gövde 35 kayıtta bölünür', async () => {
  const sett = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k1:${String(i).padStart(4, '0')}`, ISO]));
  const govdeler = [];
  const fetchFn = async (url, init) => {
    govdeler.push(JSON.parse(init.body).haberler.length);
    return { ok: true, status: 200 };
  };
  const n = await aktar({ durum: { sett }, url: 'https://motor.example.com/', anahtar: 't', fetchFn });
  assert.deepEqual(govdeler, [35, 35, 10]);
  assert.equal(n, 80);
});

test('istekte ham id ve adres yok; adres tidsrost yolu', async () => {
  const istekler = [];
  const fetchFn = async (url, init) => {
    istekler.push({ url, init });
    return { ok: true, status: 200 };
  };
  await aktar({ durum: { sett: { [C]: ISO, [A]: ISO } }, url: 'https://motor.example.com', anahtar: 't', fetchFn });
  assert.equal(istekler[0].url, 'https://motor.example.com/motor/tidsrost/kaydet');
  assert.equal(istekler[0].init.headers.Authorization, 'Bearer t');
  assert.ok(!istekler[0].init.body.includes('haber.example.com'));
  assert.ok(!istekler[0].init.body.includes('regjeringen'));
});

test('2xx olmayan yanıtta hata fırlatır', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 });
  await assert.rejects(aktar({ durum: { sett: { [A]: ISO } }, url: 'https://m.example.com', anahtar: 't', fetchFn }), /500/);
});

test('url ya da anahtar yoksa hata', async () => {
  await assert.rejects(aktar({ durum: { sett: {} }, url: '', anahtar: '' }), /MOTOR_URL/);
});
