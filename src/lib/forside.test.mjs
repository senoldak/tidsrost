import test from 'node:test';
import assert from 'node:assert/strict';
import { kanVaereManset, velgForside } from './forside.mjs';

const sak = (id, data = {}) => ({ id, data: { produksjon: 'ki-medier', ...data } });

test('imza şeridi sahibin en yeni yazısı, manşet resmî kaynaklı ilk haber', () => {
  const news = [
    sak('medier-1'),
    sak('kort-fortalt-17-november-2026', { produksjon: 'automatisk' }),
    sak('hytter', { author: 'Şenol Dak', sjanger: 'forklart', produksjon: 'manuell' }),
    sak('ssb-1', { produksjon: 'ki-kontrollert' }),
    sak('analyse-1', { author: 'Şenol Dak', sjanger: 'analyse', produksjon: 'ki-redigert' }),
  ];
  const { signatur, hero, rest } = velgForside(news);
  assert.equal(signatur.id, 'hytter');
  assert.equal(hero.id, 'ssb-1');
  assert.deepEqual(
    rest.map((h) => h.id),
    ['medier-1', 'kort-fortalt-17-november-2026', 'analyse-1'],
  );
});

test('featured her zaman manşet', () => {
  const news = [sak('ssb-1', { produksjon: 'ki-kontrollert' }), sak('medier-1', { featured: true })];
  assert.equal(velgForside(news).hero.id, 'medier-1');
});

test('uygun haber yoksa en yeni haber manşet, imza yazısı manşet olmaz', () => {
  const news = [sak('eier', { author: 'Şenol Dak', sjanger: 'analyse' }), sak('medier-1'), sak('medier-2')];
  const { signatur, hero } = velgForside(news);
  assert.equal(signatur.id, 'eier');
  assert.equal(hero.id, 'medier-1');
});

test('Kort fortalt ve ki-medier manşet olamaz', () => {
  assert.equal(kanVaereManset(sak('kort-fortalt-1-november-2026', { produksjon: 'automatisk' })), false);
  assert.equal(kanVaereManset(sak('x')), false);
  assert.equal(kanVaereManset(sak('y', { produksjon: 'automatisk' })), true);
});

test('boş liste', () => {
  assert.deepEqual(velgForside([]), { signatur: undefined, hero: undefined, rest: [] });
});
