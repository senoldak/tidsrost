import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidligereSaker, type AnlamFn } from './tidligere.ts';
import type { Haber } from './news.ts';

const h = (id: string, dato: string, title: string, description = '', category = 'innenriks', ekstra: Record<string, unknown> = {}): Haber =>
  ({ id, body: '', data: { title, description, category, date: new Date(dato), produksjon: 'ki-medier', sjanger: 'nyhet', ...ekstra } }) as unknown as Haber;

const sak = h('na', '2026-10-30T10:00:00Z', 'Universitetet i Tromsø utsatt for målrettet dataangrep', 'Angrepet rammet universitetets systemer');
const ider = (l: Haber[]) => l.map((x) => x.id);
const ingen: AnlamFn = () => null;
const alltid = (v: number): AnlamFn => () => v;

test('med anlamsvektor: eldre sak om samme hendelse, uansett kategori, eldst først', () => {
  const alle = [
    sak,
    h('ny', '2026-10-31T10:00:00Z', 'Dataangrep mot universitetet i Tromsø etterforskes'),
    h('b', '2026-10-28T10:00:00Z', 'Universitetet i Tromsø rammet av dataangrep'),
    h('a', '2026-10-24T10:00:00Z', 'Københavns universitet rammet av dataangrep', 'Universitetet ble utsatt for angrep', 'utenriks'),
  ];
  assert.deepEqual(ider(tidligereSaker(sak, alle, 4, alltid(0.84))), ['a', 'b']);
  assert.deepEqual(tidligereSaker(sak, alle, 4, alltid(0.7)), []);
});

test('uten vektor: samme kategori, tre felles ord og et felles egennavn', () => {
  const med = h('m', '2026-10-20T10:00:00Z', 'Dataangrep rammet universitetet i Tromsø', 'Tromsø');
  const annenKat = h('k', '2026-10-20T10:00:00Z', 'Dataangrep rammet universitetet i Tromsø', 'Tromsø', 'sport');
  const svak = h('s', '2026-10-20T10:00:00Z', 'Dataangrep på sykehus i Bergen');
  assert.deepEqual(ider(tidligereSaker(sak, [sak, med, annenKat, svak], 4, ingen)), ['m']);
});

test('seg selv, serier (Farevarsler, automatisk, Forklart), samlinger og svak ordlikhet tas ikke med', () => {
  const alle = [
    sak,
    h('nyheter-2026-10-20', '2026-10-20T10:00:00Z', 'Dataangrep mot universitetet i Tromsø'),
    h('kort-fortalt-1', '2026-10-20T10:00:00Z', 'Dataangrep mot universitetet i Tromsø'),
    h('f', '2026-10-20T10:00:00Z', 'Farevarsler dataangrep universitetet', 'Tromsø'),
    h('au', '2026-10-20T10:00:00Z', 'Dataangrep mot universitetet i Tromsø', '', 'innenriks', { produksjon: 'automatisk' }),
    h('fk', '2026-10-20T10:00:00Z', 'Dataangrep mot universitetet i Tromsø', '', 'innenriks', { sjanger: 'forklart' }),
    h('svak', '2026-10-20T10:00:00Z', 'Dataangrep på sykehus i Bergen'),
  ];
  assert.deepEqual(tidligereSaker(sak, alle, 4, alltid(0.95)), []);
  assert.deepEqual(tidligereSaker(h('f2', '2026-10-31T10:00:00Z', 'Farevarsler 31. oktober'), alle, 4, alltid(0.95)), []);
});

test('maks begrenser til de nyeste eldre, vist eldst først', () => {
  const alle = [sak];
  for (let i = 1; i <= 6; i++) alle.push(h(`s${i}`, `2026-10-0${i}T10:00:00Z`, 'Universitetet i Tromsø rammet av dataangrep'));
  assert.deepEqual(ider(tidligereSaker(sak, alle, 3, alltid(0.9))), ['s4', 's5', 's6']);
});
