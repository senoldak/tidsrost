// Faz 4: motorun kalan türlerinin sitedeki karşılıkları (büyük rakam, mini tablo, yatay şelale, eşik serisi, halter hedefi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tegnGraf } from '../index.mjs';
import { validerGraf } from '../sema.mjs';

const T = { tittel: 'T', kilde: { navn: 'SSB' } };
const p = (par) => par.map(([x, y]) => ({ x, y }));

test('nokkeltall: büyük rakam, karşılaştırma çubukları, künye hücreleri; hepsi ipucu taşır', () => {
  const t = tegnGraf({ ...T, form: 'nokkeltall', enhet: 'personer', desimaler: 0, valg: { fremhev: ['Mai 2026'] }, serier: [
    { navn: 'Nå', rol: 'ana', punkter: p([['I mai 2026', 109724]]) },
    { navn: 'Sammenligning', rol: 'sammenligning', punkter: p([['Mai 2026', 109724], ['Desember 2023', 230000]]) },
    { navn: 'Fakta', rol: 'kunye', punkter: p([['Leger', 5100], ['Lister', 4300]]) },
  ] });
  assert.match(t.svg, />109 724</);
  assert.match(t.svg, />I MAI 2026</);
  assert.equal(t.punkter.length, 1 + 2 + 2);
  assert.match(t.svg, /data-i="1"[^>]*class="g-f-su"/); // fremhev
  assert.match(t.punkter[2].tekst, /Desember 2023\n230 000/);
});
test('nokkeltall: tam bir ana seri ve tek nokta zorunlu', () => {
  assert.match(validerGraf({ ...T, form: 'nokkeltall', enhet: '', serier: [{ navn: 'A', rol: 'sammenligning', punkter: p([['a', 1]]) }] }).join(), /ana/);
  assert.match(validerGraf({ ...T, form: 'nokkeltall', enhet: '', serier: [{ navn: 'A', rol: 'ana', punkter: p([['a', 1], ['b', 2]]) }] }).join(), /ana/);
});

test('minitabell: satır başına etiket, değer, çubuk, işaretli değişim; seri kendi ondalığıyla', () => {
  const t = tegnGraf({ ...T, form: 'minitabell', enhet: 'millioner', desimaler: 1, serier: [
    { navn: 'Passasjerer', punkter: p([['Buss', 391.2], ['Tog', 85.4]]) },
    { navn: 'Endring', prosent: true, desimaler: 1, punkter: p([['Buss', 2.4], ['Tog', -1.1]]) },
  ] });
  assert.equal(t.punkter.length, 2);
  assert.match(t.svg, />PASSASJERER</);
  assert.match(t.svg, />\+2,4 %</);
  assert.match(t.svg, />−1,1 %</);
  assert.match(t.punkter[0].tekst, /^Buss\nPassasjerer: 391,2\nEndring: \+2,4 %/);
});
test('minitabell: iki seri ve aynı etiketler zorunlu', () => assert.match(validerGraf({ ...T, form: 'minitabell', enhet: '', serier: [{ navn: 'A', punkter: p([['a', 1]]) }] }).join(), /minitabell/));

test('bidrag: parçalar sıfırdan birikerek, toplam satırı kanıttaki toplamla; değişim kipinde işaret ve ok', () => {
  const t = tegnGraf({ ...T, form: 'bidrag', enhet: 'prosentpoeng', desimaler: 1, serier: [
    { navn: 'Endring', punkter: p([['sep.–des.', -0.4], ['des.–mar.', 0.4], ['mar.–jun.', -0.9], ['jun.–sep.', 0.7]]) },
    { navn: 'Hele året', punkter: p([['Hele året', -0.2]]) },
  ] });
  assert.equal(t.punkter.length, 5);
  assert.match(t.svg, />▼ −0,4</);
  assert.match(t.svg, />▲ \+0,7</);
  assert.match(t.svg, />Hele året</);
  assert.match(t.svg, />−0,2</);
  assert.ok(!t.svg.includes('NaN'));
  assert.ok(!/>0,0</.test(t.svg)); // ara birikim yazılmaz
  assert.deepEqual(t.tabell.rader.at(-1), ['Hele året', '−0,2']);
});
test('bidrag: hepsi artıysa bileşim kipi, işaretsiz', () => {
  const t = tegnGraf({ ...T, form: 'bidrag', enhet: 'tonn', desimaler: 0, serier: [
    { navn: 'Behandling', punkter: p([['Gjenvinning', 500], ['Forbrenning', 300]]) }, { navn: 'Totalt', punkter: p([['Totalt', 800]]) }] });
  assert.match(t.svg, />500</);
  assert.doesNotMatch(t.svg, /[▲▼+]/);
});
test('bidrag: toplam serisi tek nokta olmalı', () => assert.match(validerGraf({ ...T, form: 'bidrag', enhet: '', serier: [{ navn: 'A', punkter: p([['a', 1]]) }] }).join(), /bidrag/));

test('linje: stil esik serisi kesik çizgi, son değer halkası yok, ipucunda yine var', () => {
  const t = tegnGraf({ ...T, form: 'linje', enhet: 'prosent', serier: [
    { navn: 'KPI', punkter: p([['a', 3], ['b', 4]]) }, { navn: 'Mål', stil: 'esik', punkter: p([['a', 2], ['b', 2]]) }] });
  assert.match(t.svg, /<g class="g-serie g-esik">/);
  assert.match(t.punkter[1].tekst, /Mål: 2,0 %/);
});
test('manual: nokta hedefi (mal) dikey çentik, ipucunda adıyla', () => {
  const t = tegnGraf({ ...T, form: 'manual', enhet: 'prosent', valg: { gruppenavn: ['Median', '2026'], malnavn: 'Mål' }, serier: [{ navn: 'Fylling', punkter: [{ x: 'NO1', y: 70, y2: 80, mal: 75 }] }] });
  assert.match(t.svg, /class="g-mal-tikk"/);
  assert.match(t.punkter[0].tekst, /Mål: 75,0 %/);
});
