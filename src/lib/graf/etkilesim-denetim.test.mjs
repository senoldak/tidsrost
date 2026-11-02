import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { grafHtml } from './html.mjs';
import { grafEtkilesimDenetle, sayfaEksikleri } from './etkilesim-denetim.mjs';

const kart = grafHtml({ form: 'soyle', tittel: 'T', enhet: 'prosent', kilde: { navn: 'SSB' }, serier: [{ navn: 'A', punkter: [{ x: 'a', y: 1 }] }] }, { id: 'g1' });
const betik = '<script type="module" src="/_astro/Graf.abc.js"></script>';
const evet = (src) => src === '_astro/Graf.abc.js';

test('sayfaEksikleri: grafiksiz sayfa ve tam sayfa temiz', () => {
  assert.deepEqual(sayfaEksikleri('<main><p>Tekst</p></main>', evet), []);
  assert.deepEqual(sayfaEksikleri(`<main>${kart}</main>${betik}`, evet), []);
});

test('sayfaEksikleri: betik yoksa yakalanır', () => {
  assert.deepEqual(sayfaEksikleri(`<main>${kart}</main><script type="module" src="/_astro/Sok.x.js"></script>`, evet), ['etkileşim betiği yüklenmiyor']);
});

test('sayfaEksikleri: ipucu verisi olmayan kart yakalanır', () => {
  const kuru = kart.replace(/<script type="application\/json" data-graf-punkter>.*?<\/script>/, '');
  assert.deepEqual(sayfaEksikleri(`<main>${kart}${kuru}</main>${betik}`, evet), ['1/2 grafikte ipucu verisi yok']);
});

test('grafEtkilesimDenetle: import zinciri izlenir, eksik sayfa adıyla raporlanır', async () => {
  const kok = await mkdtemp(path.join(tmpdir(), 'graf-denetim-'));
  try {
    await mkdir(path.join(kok, '_astro'));
    await mkdir(path.join(kok, 'tall'));
    await writeFile(path.join(kok, '_astro', 'graf.1.js'), 'document.querySelectorAll("[data-graf-punkter]")');
    await writeFile(path.join(kok, '_astro', 'Graf.abc.js'), 'import"./graf.1.js";');
    await writeFile(path.join(kok, 'index.html'), `<main>${kart}</main>${betik}`);
    await writeFile(path.join(kok, 'tall', 'index.html'), `<main>${kart}</main>`);
    await writeFile(path.join(kok, 'om.html'), '<main>Om</main>');
    const r = await grafEtkilesimDenetle(kok);
    assert.equal(r.sayfa, 2);
    assert.equal(r.grafik, 2);
    assert.deepEqual(r.hatalar, ['tall/index.html: etkileşim betiği yüklenmiyor']);
  } finally {
    await rm(kok, { recursive: true, force: true });
  }
});
