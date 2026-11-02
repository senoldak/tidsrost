// Kaynak: mecmua/site-ortak/denetim/site-denetim.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { haritaOku, sayfalariSec, haritadanUrller, lycheeKiriklari, raporYaz, isoHafta, DILIM } from './site-denetim.mjs';

const SITE = 'https://site.example';
const SIMDI = new Date('2026-11-02T04:00:00Z');

test('haritaOku: dizin ve url satırları, &amp; çözülür', () => {
  const dizin = haritaOku('<sitemapindex><sitemap><loc>https://site.example/sitemap-haber-0.xml</loc></sitemap></sitemapindex>');
  assert.deepEqual(dizin.dizin, ['https://site.example/sitemap-haber-0.xml']);
  const u = haritaOku('<urlset><url><loc>https://site.example/a?x=1&amp;y=2</loc><lastmod>2026-11-01T10:00:00Z</lastmod></url><url><loc>https://site.example/b</loc></url></urlset>');
  assert.deepEqual(u.urller, [{ loc: 'https://site.example/a?x=1&y=2', lastmod: '2026-11-01T10:00:00Z' }, { loc: 'https://site.example/b', lastmod: null }]);
});

test('sayfalariSec: yeni sayfaların hepsi, eskilerin yalnız bu haftaki dilimi; dört haftada her eski sayfa bir kez', () => {
  const eski = Array.from({ length: 200 }, (_, i) => ({ loc: `${SITE}/eski-${i}`, lastmod: '2026-01-01T00:00:00Z' }));
  const yeni = [{ loc: `${SITE}/yeni-1`, lastmod: '2026-10-30T00:00:00Z' }, { loc: `${SITE}/yeni-2`, lastmod: '2026-11-01T00:00:00Z' }];
  const r = sayfalariSec([...eski, ...yeni, yeni[0]], SITE, SIMDI);
  assert.equal(r.yeni, 2);
  assert.deepEqual(r.lychee.slice(0, 3), [`${SITE}/`, `${SITE}/yeni-2`, `${SITE}/yeni-1`]);
  assert.ok(r.eski > 20 && r.eski < 100, `dilim ${r.eski}`);
  assert.deepEqual(r.axe, [`${SITE}/`, `${SITE}/yeni-2`, `${SITE}/yeni-1`]);
  const turlu = sayfalariSec([
    { loc: `${SITE}/haber/b`, lastmod: '2026-11-01T00:00:00Z' }, { loc: `${SITE}/haber/c`, lastmod: '2026-10-31T00:00:00Z' },
    { loc: `${SITE}/veri/d`, lastmod: '2026-10-30T00:00:00Z' },
  ], SITE, SIMDI);
  assert.deepEqual(turlu.axe, [`${SITE}/`, `${SITE}/haber/b`, `${SITE}/veri/d`]);
  const gorulen = new Set();
  for (let h = 0; h < DILIM; h++) {
    for (const u of sayfalariSec(eski, SITE, new Date(SIMDI.getTime() + h * 7 * 86400000)).lychee) gorulen.add(u);
  }
  assert.equal(gorulen.size, 201); // 200 eski + ana sayfa
  assert.equal(isoHafta(SIMDI), 45);
});

test('haritadanUrller: dizindeki her haritayı okur', async () => {
  const yanit = {
    [`${SITE}/sitemap-index.xml`]: `<sitemapindex><sitemap><loc>${SITE}/h-0.xml</loc></sitemap><sitemap><loc>${SITE}/v-0.xml</loc></sitemap></sitemapindex>`,
    [`${SITE}/h-0.xml`]: `<urlset><url><loc>${SITE}/haber/a</loc></url></urlset>`,
    [`${SITE}/v-0.xml`]: `<urlset><url><loc>${SITE}/veri/b</loc></url></urlset>`,
  };
  const u = await haritadanUrller(SITE, async (url) => yanit[url]);
  assert.deepEqual(u.map((x) => x.loc), [`${SITE}/haber/a`, `${SITE}/veri/b`]);
});

test('lycheeKiriklari ve raporYaz: fail_map ya da error_map, durum nesnesi; axe ihlalleri', () => {
  const lychee = { total: 120, error_map: { [`${SITE}/haber/a`]: [{ url: 'https://kurum.example/eski', status: { text: '404 Not Found', code: 404 } }] } };
  assert.deepEqual(lycheeKiriklari(lychee), [{ sayfa: `${SITE}/haber/a`, url: 'https://kurum.example/eski', durum: '404' }]);
  assert.equal(lycheeKiriklari({ fail_map: { s: [{ url: 'u', status: 'Timeout' }] } })[0].durum, 'Timeout');
  const r = raporYaz({ site: SITE, lychee, axe: [
    { url: `${SITE}/`, ihlaller: [{ kural: 'color-contrast', etki: 'serious', aciklama: 'Kontrast yetersiz', sayi: 3 }] },
    { url: `${SITE}/x`, hata: 'zaman aşımı' },
  ] });
  assert.match(r, /Kırık bağlantılar: 1 \(denetlenen bağlantı 120\)/);
  assert.match(r, /\| https:\/\/kurum\.example\/eski \| 404 \|/);
  assert.match(r, /\| serious \| color-contrast: Kontrast yetersiz \| 3 \|/);
  assert.match(r, /açılamadı/);
  assert.match(raporYaz({ site: SITE, lychee: null, axe: [] }), /lychee çıktısı yok[\s\S]*Ciddi erişilebilirlik hatası yok/);
});
