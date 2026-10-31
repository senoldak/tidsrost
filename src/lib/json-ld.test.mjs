import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdMetni, haberAlanlari, KI_REDAKSJON_URL, EIER_URL } from './json-ld.mjs';

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

const D = new Date('2026-10-30T08:00:00Z');
const K = [{ navn: 'Kilde A', url: 'https://a.example/x' }];

test('haberAlanlari: ki-medier kilder NewsArticle + NewsMediaOrganization', () => {
  const a = haberAlanlari({ produksjon: 'ki-medier', kilder: K, date: D });
  assert.deepEqual(a.isBasedOn, [{ '@type': 'NewsArticle', url: 'https://a.example/x', publisher: { '@type': 'NewsMediaOrganization', name: 'Kilde A' } }]);
});
test('haberAlanlari: resmi kaynak CreativeWork + Organization', () => {
  const a = haberAlanlari({ produksjon: 'ki-kontrollert', kilder: K, date: D });
  assert.equal(a.isBasedOn[0]['@type'], 'CreativeWork');
  assert.equal(a.isBasedOn[0].publisher['@type'], 'Organization');
});
test('haberAlanlari: sted -> Place + GeoCoordinates; koordinatsiz yalniz ad', () => {
  const a = haberAlanlari({ date: D, sted: { navn: 'Bergen', lat: 60.39, lon: 5.32 } });
  assert.deepEqual(a.contentLocation, { '@type': 'Place', name: 'Bergen', geo: { '@type': 'GeoCoordinates', latitude: 60.39, longitude: 5.32 } });
  assert.equal(haberAlanlari({ date: D, sted: { navn: 'Bergen' } }).contentLocation.geo, undefined);
});
test('haberAlanlari: rettelse + oppdatert -> CorrectionComment ve dateModified', () => {
  const a = haberAlanlari({ date: D, rettelse: ' Feil tall rettet. ', oppdatert: new Date('2026-10-31T10:00:00Z') });
  assert.deepEqual(a.correction, { '@type': 'CorrectionComment', text: 'Feil tall rettet.', datePublished: '2026-10-31T10:00:00.000Z' });
  assert.equal(a.dateModified, '2026-10-31T10:00:00.000Z');
});
test('haberAlanlari: dateModified oppdatert ?? date; yayindan onceki oppdatert yok sayilir', () => {
  assert.equal(haberAlanlari({ date: D }).dateModified, D.toISOString());
  assert.equal(haberAlanlari({ date: D, oppdatert: new Date('2026-10-01') }).dateModified, D.toISOString());
});
test('haberAlanlari: bot yazar Organization KI-redaksjon', () => {
  for (const p of ['ki-medier', 'ki-kontrollert', 'automatisk', 'ki-automatisk']) {
    const a = haberAlanlari({ produksjon: p, date: D, forfatter: 'Şenol Dak' }).author;
    assert.deepEqual(a, { '@type': 'Organization', name: 'tidsrøst KI-redaksjon', url: KI_REDAKSJON_URL });
  }
});
test('haberAlanlari: sahibin yazisi Person + sameAs kunyeden', () => {
  const a = haberAlanlari({ produksjon: 'manuell', date: D, forfatter: 'Şenol Dak' }).author;
  assert.equal(a['@type'], 'Person');
  assert.equal(a.url, EIER_URL);
  assert.equal(a.jobTitle, 'Journalist');
  assert.ok(a.sameAs.includes('https://tidsrost.com/') && a.sameAs.includes('https://kifobu.com/'));
});
test('haberAlanlari: veri yoksa alan yok', () => {
  assert.deepEqual(Object.keys(haberAlanlari({ produksjon: 'manuell', date: D })), ['dateModified']);
  assert.deepEqual(Object.keys(haberAlanlari({ date: D, kilder: [], rettelse: '  ', sted: {} })), ['dateModified']);
});
