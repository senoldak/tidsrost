import test from 'node:test';
import assert from 'node:assert/strict';
import { innenforDager, kanVaereManset, paForsiden, velgForside } from './forside.mjs';

const NA = new Date('2026-11-17T15:00:00+01:00');
const IDAG = new Date('2026-11-17T08:00:00+01:00');
const IGAR = new Date('2026-11-16T08:00:00+01:00');
const sak = (id, data = {}) => ({ id, data: { produksjon: 'ki-medier', nyhetsverdi: 85, date: IDAG, ...data } });

test('imza şeridi sahibin en yeni yazısı, manşet resmî kaynaklı ilk haber', () => {
  const news = [
    sak('medier-1'),
    sak('kort-fortalt-17-november-2026', { produksjon: 'automatisk', nyhetsverdi: undefined }),
    sak('hytter', { author: 'Şenol Dak', sjanger: 'forklart', produksjon: 'manuell' }),
    sak('ssb-1', { produksjon: 'ki-kontrollert' }),
    sak('analyse-1', { author: 'Şenol Dak', sjanger: 'analyse', produksjon: 'ki-redigert' }),
  ];
  const { signatur, hero, rest } = velgForside(news, NA);
  assert.equal(signatur.id, 'hytter');
  assert.equal(hero.id, 'ssb-1');
  assert.deepEqual(
    rest.map((h) => h.id),
    ['medier-1', 'kort-fortalt-17-november-2026', 'analyse-1'],
  );
});

test('featured her zaman manşet', () => {
  const news = [sak('ssb-1', { produksjon: 'ki-kontrollert' }), sak('medier-1', { featured: true, nyhetsverdi: 70 })];
  assert.equal(velgForside(news, NA).hero.id, 'medier-1');
});

test('uygun haber yoksa en yeni haber manşet, imza yazısı manşet olmaz', () => {
  const news = [sak('eier', { author: 'Şenol Dak', sjanger: 'analyse' }), sak('medier-1'), sak('medier-2')];
  const { signatur, hero } = velgForside(news, NA);
  assert.equal(signatur.id, 'eier');
  assert.equal(hero.id, 'medier-1');
});

test('Kort fortalt ve ki-medier manşet olamaz', () => {
  assert.equal(kanVaereManset(sak('kort-fortalt-1-november-2026', { produksjon: 'automatisk' })), false);
  assert.equal(kanVaereManset(sak('x')), false);
  assert.equal(kanVaereManset(sak('y', { produksjon: 'automatisk' })), true);
});

test('ön sayfa süzgeci: 75 altı KI haberi ve eski Kort fortalt dışarıda', () => {
  assert.equal(paForsiden(sak('a', { nyhetsverdi: 75 }), NA), true);
  assert.equal(paForsiden(sak('b', { nyhetsverdi: 74 }), NA), false);
  assert.equal(paForsiden(sak('c', { produksjon: 'ki-kontrollert', nyhetsverdi: 72 }), NA), false);
  assert.equal(paForsiden(sak('d', { produksjon: 'automatisk', nyhetsverdi: undefined }), NA), true);
  assert.equal(paForsiden(sak('kort-fortalt-17-november-2026', { produksjon: 'automatisk' }), NA), true);
  assert.equal(paForsiden(sak('kort-fortalt-16-november-2026', { produksjon: 'automatisk', date: IGAR }), NA), false);
  assert.equal(paForsiden(sak('e', { author: 'Şenol Dak', sjanger: 'analyse', nyhetsverdi: undefined }), NA), true);
});

test('manşet olan 75 altı resmî haber listelerde değil; 75 altı ikinci resmî haber listeye girmez', () => {
  const news = [
    sak('ssb-dusuk', { produksjon: 'ki-kontrollert', nyhetsverdi: 72 }),
    sak('ssb-dusuk-2', { produksjon: 'ki-kontrollert', nyhetsverdi: 71 }),
    sak('ssb-yuksek', { produksjon: 'ki-kontrollert' }),
  ];
  const { hero, rest } = velgForside(news, NA);
  assert.equal(hero.id, 'ssb-dusuk');
  assert.deepEqual(rest.map((h) => h.id), ['ssb-yuksek']);
});

test('boş liste', () => {
  assert.deepEqual(velgForside([], NA), { signatur: undefined, hero: undefined, rest: [] });
});

test('eski resmî haber manşet olmaz; en yeni ön sayfa haberi manşet', () => {
  const eski = new Date('2026-11-13T20:00:00+01:00');
  const news = [
    sak('medier-dusuk', { nyhetsverdi: 70 }),
    sak('medier-yuksek', { nyhetsverdi: 82 }),
    sak('fn-eski', { produksjon: 'ki-kontrollert', date: eski }),
  ];
  assert.equal(velgForside(news, NA).hero.id, 'medier-yuksek');
});

test('resmî haber 24 saat içindeyse puanı 75 altı olsa da manşet', () => {
  const news = [sak('medier-1'), sak('temu', { produksjon: 'ki-kontrollert', nyhetsverdi: 72 })];
  const { hero, rest } = velgForside(news, NA);
  assert.equal(hero.id, 'temu');
  assert.deepEqual(rest.map((h) => h.id), ['medier-1']);
});

test('gün listeleri 3 gün geriye gider', () => {
  assert.equal(innenforDager(sak('a', { date: IGAR }), NA), true);
  assert.equal(innenforDager(sak('b', { date: new Date('2026-11-13T20:00:00+01:00') }), NA), false);
});
