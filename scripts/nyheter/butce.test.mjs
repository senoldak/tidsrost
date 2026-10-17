import test from 'node:test';
import assert from 'node:assert/strict';
import { turPayi, pasifikKalanSaat, butceYukle, geminiPayiBitti, butceDurumu } from './butce.mjs';
import { kullanim } from './kullanim.mjs';

// Katman 3 (Gemini kota planı): günlük sınır × 0,8, günün kalan turlarına bölünür.
// 2026-10-17T07:00Z = Pasifik 00:00 (PDT): günün başı, 24 saat ve 12 tur kalır.
const gunBasi = new Date('2026-10-17T07:00:00Z');

test('pasifikKalanSaat: Google gününün (Pasifik) bitmesine kalan saat', () => {
  assert.equal(pasifikKalanSaat(gunBasi), 24);
  assert.equal(pasifikKalanSaat(new Date('2026-10-17T19:00:00Z')), 12); // Pasifik 12:00
  assert.equal(pasifikKalanSaat(new Date('2026-10-18T06:30:00Z')), 0.5); // Pasifik 23:30
});

test('turPayi: kalan bütçe kalan turların yarısına bölünür (ön yükleme); harcanmayan pay sonraki turlara kalır', () => {
  assert.equal(turPayi({ kullanilan: 0, simdi: gunBasi, sinir: 500 }), 66); // 400 / ⌈12/2⌉
  assert.equal(turPayi({ kullanilan: 100, simdi: new Date('2026-10-17T19:00:00Z'), sinir: 500 }), 100); // 300 / 3
  // kalan azsa sonraki turlara TABAN (10) bırakılır, ama eşit payın altına inilmez: 50 kalan, 8 tur → 50/8
  assert.equal(turPayi({ kullanilan: 350, simdi: new Date('2026-10-17T15:00:00Z'), sinir: 500 }), 6);
  // 120 kalan, 8 tur → 120/4 = 30, ama 7 tura 10'ar bırakmak için en çok 50; 30 ≤ 50 → 30
  assert.equal(turPayi({ kullanilan: 280, simdi: new Date('2026-10-17T15:00:00Z'), sinir: 500 }), 30);
  assert.equal(turPayi({ kullanilan: 0, simdi: new Date('2026-10-18T06:30:00Z'), sinir: 500 }), 400); // son tur hepsini alır
  assert.equal(turPayi({ kullanilan: 450, simdi: gunBasi, sinir: 500 }), 0); // pay aşıldı: yapay zekâ adımları atlanır
});

const cevap = (govde, durum = 200) => async () => new Response(JSON.stringify(govde), { status: durum });

test('butceYukle: saatten bugünkü ana model kullanımını okur', async () => {
  let adres;
  const fetchFn = async (url, sec) => {
    adres = `${url} ${sec.headers.Authorization}`;
    return new Response(JSON.stringify({ gun: '2026-10-17', modeller: { 'gemini-flash-lite-latest': { cagri: 100 } } }));
  };
  const m = await butceYukle({ url: 'https://saat.example/', anahtar: 'a', site: 'deneme', simdi: new Date('2026-10-17T19:00:00Z'), fetchFn });
  assert.equal(adres, 'https://saat.example/motor/deneme/gemini Bearer a');
  assert.equal(butceDurumu().pay, 100);
  assert.match(m, /100\/500/);
  assert.match(m, /payı 100/);
});

test('butceYukle: saat yoksa ya da hata verirse güvenli varsayılan (sınır × 0,8 / 12)', async () => {
  await butceYukle({ simdi: gunBasi });
  assert.equal(butceDurumu().pay, 33);
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn: cevap({}, 500) });
  assert.equal(butceDurumu().pay, 33);
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn: async () => { throw new Error('ağ yok'); } });
  assert.equal(butceDurumu().pay, 33);
});

test('GEMINI_TUR_PAYI elle çalıştırmada payı ezer', async () => {
  process.env.GEMINI_TUR_PAYI = '7';
  try {
    await butceYukle({ simdi: gunBasi });
    assert.equal(butceDurumu().pay, 7);
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
  }
});

test('geminiPayiBitti: bu süreçteki başarılı çağrı sayısı payı doldurunca doğru', async () => {
  process.env.GEMINI_TUR_PAYI = '2';
  try {
    await butceYukle({ simdi: gunBasi });
    const once = kullanim.cagri;
    kullanim.cagri = 1;
    assert.equal(geminiPayiBitti(), false);
    kullanim.cagri = 2;
    assert.equal(geminiPayiBitti(), true);
    kullanim.cagri = once;
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
  }
});

test('butceYukle yüklenmeden pay sınırsız (testler ve araçlar etkilenmez)', async () => {
  const { geminiPayiBitti: taze } = await import(`./butce.mjs?taze=${Date.now()}`);
  assert.equal(taze(), false);
});
