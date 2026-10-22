import test from 'node:test';
import assert from 'node:assert/strict';
import {
  datoTekst, innholdTall, kvartalNavn, kvartalSeksjon, ovrigeForkastede, periodeTekst, regelListe, regelnavn, sorterRapporter,
} from './standardrapport.mjs';

const RAPPORT = {
  ceyrek: '2026-c4', bas: '2026-10-01', son: '2026-12-31', defterBaslangici: '2026-10-20',
  yazildi: 100, elendi: 60, kirmizi: 10, sari: 5,
  kurallar: { kirmizi: { suc: 6, teror: 4, 'ukjent-kode': 0 }, sari: { 'olum-kaza': 3, 'suc-genel': 1, secim: 1 } },
  geminiCagri: 1234, kuralDegisiklikleri: null,
};

test('navn og periode på bokmål', () => {
  assert.equal(kvartalNavn('2026-c4'), '4. kvartal 2026');
  assert.equal(datoTekst('2026-10-20'), '20. oktober 2026');
  assert.equal(periodeTekst('2026-10-01', '2026-12-31'), '1. oktober – 31. desember 2026');
});

test('regelnavn: kjent kode oversettes, ukjent vises som den er', () => {
  assert.equal(regelnavn('olum-kaza'), 'død og ulykker');
  assert.equal(regelnavn('noe-nytt'), 'noe-nytt');
});

test('regelListe: null-tall utelates, like navn slås sammen, størst først', () => {
  assert.deepEqual(regelListe(RAPPORT.kurallar.kirmizi), [
    { navn: 'kriminalitet', antall: 6 },
    { navn: 'terror', antall: 4 },
  ]);
  assert.deepEqual(regelListe(RAPPORT.kurallar.sari).map((r) => r.navn), ['død og ulykker', 'kriminalitet', 'valg']);
  assert.deepEqual(regelListe(undefined), []);
});

test('øvrige forkastede = elendi − kirmizi, aldri negativ', () => {
  assert.equal(ovrigeForkastede({ elendi: 60, kirmizi: 10 }), 50);
  assert.equal(ovrigeForkastede({ elendi: 5, kirmizi: 10 }), 0);
  assert.equal(ovrigeForkastede({}), 0);
});

test('kvartalsgrenser følger Oslo-tid', () => {
  const art = (iso) => ({ date: new Date(iso) });
  const t = innholdTall(
    {
      artikler: [
        art('2026-09-30T21:59:59Z'), // Oslo 23:59:59 30. sep: utenfor
        art('2026-09-30T22:00:00Z'), // Oslo 00:00 1. okt: innenfor
        art('2026-12-31T22:59:59Z'), // Oslo 23:59 31. des: innenfor
        art('2026-12-31T23:00:00Z'), // Oslo 00:00 1. jan: utenfor
      ],
    },
    '2026-10-01',
    '2026-12-31'
  );
  assert.equal(t.bot, 2);
});

test('innholdTall: tom data gir nuller', () => {
  const t = innholdTall({}, '2026-10-01', '2026-12-31');
  assert.deepEqual(t, { bot: 0, eier: 0, kjede: 0, rettelser: 0, fjernet: 0, klager: { totalt: 0, yerinde: 0, kismen: 0, yerindeDegil: 0 } });
});

test('innholdTall: eier- og kjedesaker skilles fra botsaker; rettelser, fjernede og klager telles', () => {
  const d = (iso) => new Date(iso);
  const t = innholdTall(
    {
      artikler: [
        { date: d('2026-10-05T10:00:00Z') },
        { date: d('2026-10-06T10:00:00Z'), author: 'Şenol Dak' },
        { date: d('2026-10-07T10:00:00Z'), sjanger: 'forklart' },
        { date: d('2026-10-08T10:00:00Z'), produksjon: 'ki-redigert' },
        { date: d('2026-09-01T10:00:00Z'), rettelse: 'Rettet.', oppdatert: d('2026-10-09T10:00:00Z') },
        { date: d('2026-10-10T10:00:00Z'), rettelse: 'Rettet.' },
      ],
      avpublisert: [{ dato: '2026-11-01' }, { dato: '2027-01-02' }],
      klager: [
        { alindi: '2026-10-01', karar: '2026-10-20', sonuc: 'yerinde' },
        { alindi: '2026-11-01', karar: '2026-11-15', sonuc: 'kismen' },
        { alindi: '2026-11-01', karar: '2026-11-16', sonuc: 'yerinde-degil' },
        { alindi: '2026-12-20', karar: '2027-01-10', sonuc: 'yerinde' },
      ],
    },
    '2026-10-01',
    '2026-12-31'
  );
  assert.equal(t.eier, 2);
  assert.equal(t.kjede, 1);
  assert.equal(t.bot, 2); // to botsaker i kvartalet (den med rettelse i september er utenfor, 10. okt er innenfor)
  assert.equal(t.rettelser, 2);
  assert.equal(t.fjernet, 1);
  assert.deepEqual(t.klager, { totalt: 3, yerinde: 1, kismen: 1, yerindeDegil: 1 });
});

test('kvartalSeksjon: logg-notat når loggen starter etter kvartalets start; ingen registrering = null', () => {
  const s = kvartalSeksjon(RAPPORT, {});
  assert.equal(s.loggFra, '20. oktober 2026');
  assert.equal(s.regelEndringer, null);
  assert.equal(s.ovrige, 50);
  assert.equal(kvartalSeksjon({ ...RAPPORT, defterBaslangici: '2026-10-01' }, {}).loggFra, null);
  assert.deepEqual(kvartalSeksjon({ ...RAPPORT, kuralDegisiklikleri: ['2026-11-03'] }, {}).regelEndringer, ['2026-11-03']);
});

test('sorterRapporter: nyeste først, ugyldige hoppes over', () => {
  const r = sorterRapporter([{ ceyrek: 'a', bas: '2026-10-01', son: 'x' }, { ceyrek: 'b', bas: '2027-01-01', son: 'y' }, {}]);
  assert.deepEqual(r.map((x) => x.ceyrek), ['b', 'a']);
});
