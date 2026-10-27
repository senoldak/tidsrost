// medier: gömme ölçümü ve ön eleme (Gemini Faz 2, 27 Ekim 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coz, kodla } from './gomme.mjs';
import { gommeOnEleme, gommeOlcumu, gommeMetni } from './kilder/medier.mjs';

// Başlığın ilk harfi konu: A/a yakın, B/b yakın, C ve D yalnız.
const KONU = { A: [1, 0, 0, 0], a: [1, 0.1, 0, 0], B: [0, 1, 0, 0], b: [0, 1, 0.1, 0], C: [0, 0, 1, 0], D: [0, 0, 0, 1] };
const vektorle = async (metinler) => metinler.map((m) => (KONU[m[0]] ? coz(kodla(KONU[m[0]])) : null));
const sak = (tittel, medie = 'Gizlimedya') => ({ id: `medier:${tittel}`, medie, tittel, ingress: 'ingress' });
const ayar = (kip, ek = {}) => ({ kip, alt: 0.5, vektorle, log: () => {}, ...ek });

test('gommeMetni: medya adı vektör metnine girmez', () => {
  const m = gommeMetni(sak('A olay', 'Gizlimedya'));
  assert.doesNotMatch(m, /Gizlimedya/);
  assert.match(m, /^A olay\ningress/);
});

test('açık: komşusuz başlık istemden çıkar; yayımlanmışa benzeyen kalır; yayımlanmışlardan yalnız yakınlar gider', async () => {
  const saker = [sak('A bir'), sak('a iki'), sak('C yalnız'), sak('B yayımlanmışa benzer')];
  const publisert = [{ tittel: 'b eski haber', tekst: 'b eski haber\nx' }, { tittel: 'D ilgisiz', tekst: 'D ilgisiz\nx' }];
  const r = await gommeOnEleme(saker, publisert, ayar('acik'));
  assert.deepEqual(r.secilen, [0, 1, 3]);
  assert.deepEqual(r.publisert.map((p) => p.tittel), ['b eski haber']);
});

test('açık: hepsi komşusuzsa seçilen boş', async () => {
  const r = await gommeOnEleme([sak('C bir'), sak('D iki')], [], ayar('acik'));
  assert.deepEqual(r.secilen, []);
});

test('gölge: hiçbir başlık çıkmaz', async () => {
  const saker = [sak('A bir'), sak('C yalnız')];
  const r = await gommeOnEleme(saker, [], ayar('golge'));
  assert.deepEqual(r.secilen, [0, 1]);
});

test('vektör yoksa null (bugünkü yol)', async () => {
  assert.equal(await gommeOnEleme([sak('A')], [], ayar('acik', { vektorle: async () => null })), null);
});

test('gommeOlcumu: grup içi aynı, kjente aynı, metin ve medya adı yok', async () => {
  const saker = [sak('A bir'), sak('a iki'), sak('B üç'), sak('C dört')];
  const publisert = [{ tittel: 'b eski', tekst: 'b eski\nx' }];
  const r = await gommeOnEleme(saker, publisert, ayar('golge'));
  const satirlar = [];
  gommeOlcumu({ grupper: [[0, 1]], kjente: new Set([2]) }, r, (s) => satirlar.push(s));
  const j = satirlar.map((s) => JSON.parse(s.slice(12)));
  assert.deepEqual(j.filter((x) => x.karar === 'ayni').map((x) => x.tur).sort(), ['grup', 'kjent']);
  assert.ok(j.some((x) => x.karar === 'farkli'));
  for (const s of satirlar) assert.doesNotMatch(s, /Gizlimedya|bir|eski/);
});

test('gommeOlcumu: metin verilirse yerel gölge çiftleri metinleriyle döner, medya adı yok', async () => {
  const saker = [sak('A bir'), sak('a iki'), sak('B üç'), sak('C dört')];
  const publisert = [{ tittel: 'b eski', tekst: 'b eski\nx' }];
  const r = await gommeOnEleme(saker, publisert, ayar('golge'));
  const metin = { s: saker.map(gommeMetni), p: publisert.map((p) => p.tekst) };
  const ciftler = gommeOlcumu({ grupper: [[0, 1]], kjente: new Set([2]) }, r, () => {}, metin);
  const grup = ciftler.find((c) => c.tur === 'grup');
  assert.deepEqual([grup.a, grup.b, grup.karar, grup.dil], [metin.s[0], metin.s[1], 'ayni', 'no']);
  assert.equal(ciftler.find((c) => c.tur === 'kjent').b, 'b eski\nx');
  for (const c of ciftler) assert.doesNotMatch(`${c.a}${c.b}`, /Gizlimedya/);
  assert.deepEqual(gommeOlcumu({ grupper: [[0, 1]], kjente: new Set() }, r, () => {}), []);
});
