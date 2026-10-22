import test from 'node:test';
import assert from 'node:assert/strict';
import { kiNotat, erEierSak, erKjedeSak, BOT_NOTAT, EIER_NOTAT, KJEDE_NOTAT, LENKE_TEKST } from './kinote.mjs';

const url = 'https://tidsrost.com/artikkel/en-sak/';

test('bot haberi: bot notu, mailto konusu ve gövdesi', () => {
  const n = kiNotat({ author: 'tidsrøst', sjanger: 'nyhet', tittel: 'En sak å lese', url });
  assert.equal(n.tekst, 'Saken er skrevet automatisk med KI.');
  assert.equal(n.tekst, BOT_NOTAT);
  assert.equal(n.lenkeTekst, 'Meld fra om feil →');
  assert.equal(n.lenkeTekst, LENKE_TEKST);
  assert.equal(n.href, `mailto:redaksjon@tidsrost.com?subject=${encodeURIComponent('Feil i saken: En sak å lese')}&body=${encodeURIComponent(url)}`);
  assert.equal(n.eier, false);
});

test('Forklart ve Şenol Dak yazısı: sahip notu', () => {
  const metin = 'KI-verktøy er brukt til oversettelse og språkvask. Alle tall er hentet fra offisielle kilder og kontrollert.';
  assert.equal(EIER_NOTAT, metin);
  assert.equal(kiNotat({ author: 'Şenol Dak', sjanger: 'forklart', tittel: 't', url }).tekst, metin);
  assert.equal(kiNotat({ author: 'tidsrøst', sjanger: 'forklart', tittel: 't', url }).eier, true);
  assert.equal(erEierSak({ author: 'Şenol Dak', sjanger: 'nyhet' }), true);
});

test('canlı tablo (bot=true) sahip yazarı olsa bile bot notu alır; notlar "Ansvarlig" içermez', () => {
  assert.equal(kiNotat({ bot: true, author: 'Şenol Dak', tittel: 't', url }).tekst, BOT_NOTAT);
  for (const t of [BOT_NOTAT, EIER_NOTAT, LENKE_TEKST]) assert.doesNotMatch(t, /ansvarlig/i);
});

test('yazı işleri zinciri (produksjon ki-redigert): Şenol Dak ve forklart olsa da zincir notu; bağlantı aynı', () => {
  const metin =
    'Saken er skrevet med KI-verktøy. Tall og sitater er kontrollert mot offisielle kilder, og redaksjonen har lest og godkjent saken før publisering.';
  assert.equal(KJEDE_NOTAT, metin);
  const n = kiNotat({ author: 'Şenol Dak', sjanger: 'forklart', produksjon: 'ki-redigert', tittel: 'En sak å lese', url });
  assert.equal(n.tekst, metin);
  assert.doesNotMatch(n.tekst, /oversettelse og språkvask/);
  assert.equal(n.kjede, true);
  assert.equal(n.eier, false);
  assert.equal(n.lenkeTekst, 'Meld fra om feil →');
  assert.equal(n.href, kiNotat({ tittel: 'En sak å lese', url }).href);
  assert.equal(erKjedeSak({ produksjon: 'ki-redigert' }), true);
});

test('zincir değeri olmayan yazı eski kuralla; canlı tablo (bot=true) her zaman bot notu', () => {
  assert.equal(kiNotat({ author: 'Şenol Dak', sjanger: 'forklart', produksjon: 'manuell', tittel: 't', url }).tekst, EIER_NOTAT);
  assert.equal(kiNotat({ author: 'tidsrøst', sjanger: 'nyhet', produksjon: 'ki-kontrollert', tittel: 't', url }).tekst, BOT_NOTAT);
  assert.equal(kiNotat({ bot: true, produksjon: 'ki-redigert', tittel: 't', url }).tekst, BOT_NOTAT);
  assert.doesNotMatch(KJEDE_NOTAT, /ansvarlig/i);
});
