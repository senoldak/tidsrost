import test from 'node:test';
import assert from 'node:assert/strict';
import { TİDSROST_GRAFİKLER } from './tidsrost-charts-data.ts';

test('TİDSROST_GRAFİKLER: nøyaktig 62 mebius-grafikkomponenter definert for tidsrøst', () => {
  assert.equal(TİDSROST_GRAFİKLER.length, 62, 'Nøyaktig 62 grafer må være definert');
});

test('TİDSROST_GRAFİKLER: hver graf har en unik og gyldig id-verdi', () => {
  const idler = new Set();
  for (const g of TİDSROST_GRAFİKLER) {
    assert.ok(g.id.startsWith('charts-'), `${g.id} må starte med charts-`);
    assert.ok(!idler.has(g.id), `${g.id} må være unik`);
    idler.add(g.id);
  }
  assert.equal(idler.size, 62);
});

test('TİDSROST_GRAFİKLER: tidsrøst merkevareregler og norsk bokmål gyldighet', () => {
  const GYLDIGE_KATEGORIER = new Set([
    'MAKROØKONOMI & RENTER',
    'BOLIG & EIENDOM',
    'KRAFT & ENERGI',
    'ARBEIDSLIV & LØNN',
    'OLJEFONDET & BØRS',
    'SAMFUNN & STATISTIKK',
  ]);

  for (const g of TİDSROST_GRAFİKLER) {
    assert.ok(GYLDIGE_KATEGORIER.has(g.kategori), `${g.id} kategori må være gyldig: ${g.kategori}`);
    assert.ok(g.baslik && g.baslik.trim().length > 3, `${g.id} må ha en tittel på bokmål`);
    assert.ok(g.aciklama && g.aciklama.trim().length > 10, `${g.id} må ha en forklaring`);
    assert.ok(g.metrik && g.metrik.trim().length > 0, `${g.id} må ha en metrisk verdi`);
    assert.ok(typeof g.degisim === 'number' && !Number.isNaN(g.degisim), `${g.id} må ha en numerisk endringsverdi`);
    assert.ok(g.degisimEtiket && g.degisimEtiket.trim().length > 0, `${g.id} må ha en endringsetikett`);
    assert.ok(g.kaynak && g.kaynak.trim().length > 0, `${g.id} må ha en offisiell kilde`);
    assert.ok(g.tarih && g.tarih.trim().length > 0, `${g.id} må ha en dato`);
  }
});

test('TİDSROST_GRAFİKLER: mebius kildemetadata sporbarhet', () => {
  for (const g of TİDSROST_GRAFİKLER) {
    assert.ok(g.mebiusTitle, `${g.id} må ha mebiusTitle`);
    assert.ok(g.exportName, `${g.id} må ha exportName`);
    assert.ok(g.mebiusFile.endsWith('.tsx'), `${g.id} må ha .tsx mebiusFile`);
    assert.ok(g.previewImage.endsWith('.webp'), `${g.id} må ha .webp previewImage`);
  }
});

test('TİDSROST_GRAFİKLER: dataintegritet for hver grafikktype', () => {
  for (const g of TİDSROST_GRAFİKLER) {
    switch (g.tur) {
      case 'alan':
      case 'sutun':
        assert.ok(Array.isArray(g.seri) && g.seri.length >= 3, `${g.id} (${g.tur}) må ha minst 3 datapunkter`);
        for (const pt of g.seri) {
          assert.ok(typeof pt.deger === 'number' && !Number.isNaN(pt.deger));
          assert.ok(typeof pt.etiket === 'string' && pt.etiket.length > 0);
        }
        break;
      case 'halka-pay':
        assert.ok(Array.isArray(g.dilimler) && g.dilimler.length >= 3, `${g.id} må ha minst 3 sektorer`);
        const totalAndel = g.dilimler.reduce((acc, d) => acc + d.oran, 0);
        assert.equal(totalAndel, 100, `${g.id} summen av andeler må være 100%`);
        break;
      case 'aralik-bant':
        assert.ok(Array.isArray(g.araliklar) && g.araliklar.length >= 3, `${g.id} må ha intervalliste`);
        for (const a of g.araliklar) {
          assert.ok(a.min <= a.mevcut && a.mevcut <= a.max, `${g.id} min <= gjeldende <= max`);
        }
        break;
      case 'yigilmis-sutun':
        assert.ok(Array.isArray(g.gruplar) && g.gruplar.length >= 3, `${g.id} må ha grupper`);
        for (const gr of g.gruplar) {
          assert.ok(typeof gr.varlik === 'number' && typeof gr.yukumluluk === 'number');
        }
        break;
      case 'coklu-karma':
        assert.ok(Array.isArray(g.seriler) && g.seriler.length >= 3, `${g.id} må ha serier`);
        for (const s of g.seriler) {
          assert.ok(typeof s.cubuk === 'number' && typeof s.cizgi === 'number');
        }
        break;
      case 'siralama-cubuk':
        assert.ok(Array.isArray(g.ogeler) && g.ogeler.length >= 3, `${g.id} må ha elementer`);
        for (const o of g.ogeler) {
          assert.ok(typeof o.deger === 'number' && o.etiket.length > 0);
        }
        break;
      case 'akis-selale':
        assert.ok(Array.isArray(g.adimlari) && g.adimlari.length >= 3, `${g.id} må ha trinn`);
        for (const a of g.adimlari) {
          assert.ok(['artis', 'azalis', 'net'].includes(a.tur));
        }
        break;
      case 'radyal-hedef':
        assert.ok(typeof g.oran === 'number' && g.oran >= 0 && g.oran <= 100);
        assert.ok(typeof g.hedef === 'number');
        break;
      case 'nokta-dagilim':
        assert.ok(Array.isArray(g.noktalar) && g.noktalar.length >= 4, `${g.id} må ha spredningspunkter`);
        for (const p of g.noktalar) {
          assert.ok(typeof p.x === 'number' && typeof p.y === 'number');
        }
        break;
    }
  }
});

test('TİDSROST_GRAFİKLER: gul farge strengt forbudt og N50 ekvidistanse attributter', () => {
  const GYLDIGE_DILIM_FARGER = new Set(['vann', 'blekk', 'signalrod', 'kontur', 'gra']);
  for (const g of TİDSROST_GRAFİKLER) {
    if (g.dilimler) {
      for (const d of g.dilimler) {
        assert.ok(GYLDIGE_DILIM_FARGER.has(d.renk), `${g.id} sektorfarge må være vann/blekk/signalrød/kontur/grå, aldri gul: ${d.renk}`);
      }
    }
    // N50 kartblad attributter
    if (g.hoydeKurve !== undefined) {
      assert.ok(typeof g.hoydeKurve === 'number' && g.hoydeKurve > 0, `${g.id} hoydeKurve må være et positivt tall`);
    }
    if (g.kartbladRef !== undefined) {
      assert.ok(g.kartbladRef.startsWith('N50-'), `${g.id} kartbladRef må referere til et N50-kartblad`);
    }
  }
});
