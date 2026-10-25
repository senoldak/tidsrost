// Kaynak: mecmua/site-ortak/gemini/butce.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { turPayi, pasifikKalanSaat, butceYukle, geminiPayiBitti, butceDurumu, modelPayiVar } from './butce.mjs';
import { kullanimEkle, hataEkle, ayrintiSifirla, gunlukDolu } from './kullanim.mjs';

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
const L35 = 'gemini-3.5-flash-lite';
const L31 = 'gemini-3.1-flash-lite';
const temiz = () => {
  ayrintiSifirla();
  gunlukDolu.clear();
};

test('butceYukle: saatten iki Flash-Lite\'ı ayrı okur; takma ad ve başarısızlar 3.5\'e sayılır', async () => {
  temiz();
  let adres;
  const fetchFn = async (url, sec) => {
    adres = `${url} ${sec.headers.Authorization}`;
    return new Response(JSON.stringify({
      gun: '2026-10-17',
      modeller: {
        'gemini-flash-lite-latest': { cagri: 100, h429: 0, h503: 10 },
        [L35]: { cagri: 50, h503: 0 },
        [L31]: { cagri: 0 },
      },
    }));
  };
  const m = await butceYukle({ url: 'https://saat.example/', anahtar: 'a', site: 'deneme', simdi: new Date('2026-10-17T19:00:00Z'), fetchFn });
  assert.equal(adres, 'https://saat.example/motor/deneme/gemini Bearer a');
  // 3.5: 160 kullanıldı → (400 − 160) / 3 = 80; 3.1: 400 / 3 = 133
  assert.equal(butceDurumu().pay[L35], 80);
  assert.equal(butceDurumu().pay[L31], 133);
  assert.match(m, /160\/500/);
  assert.match(m, /0\/500/);
});

test('butceYukle: rpd\'sine ulaşmış modeller tur başında gunlukDolu\'ya girer', async () => {
  temiz();
  const fetchFn = cevap({ gun: '2026-10-17', modeller: { 'gemini-3.6-flash': { cagri: 18, h429: 2 }, 'gemini-3-flash-preview': { cagri: 5 } } });
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn });
  assert.ok(gunlukDolu.has('gemini-3.6-flash'));
  assert.ok(!gunlukDolu.has('gemini-3-flash-preview'));
  temiz();
});

test('butceYukle: saat yoksa ya da hata verirse güvenli varsayılan (sınır × 0,8 / 12), her kapasite modeline', async () => {
  temiz();
  await butceYukle({ simdi: gunBasi });
  assert.deepEqual(butceDurumu().pay, { [L35]: 33, [L31]: 33 });
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn: cevap({}, 500) });
  assert.equal(butceDurumu().pay[L35], 33);
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn: async () => { throw new Error('ağ yok'); } });
  assert.equal(butceDurumu().pay[L31], 33);
});

test('GEMINI_TUR_PAYI elle çalıştırmada her kapasite modelinin payını ezer', async () => {
  process.env.GEMINI_TUR_PAYI = '7';
  try {
    await butceYukle({ simdi: gunBasi });
    assert.deepEqual(butceDurumu().pay, { [L35]: 7, [L31]: 7 });
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
  }
});

test('modelPayiVar ve geminiPayiBitti: iki Flash-Lite da bitince yeni habere başlanmaz', async () => {
  temiz();
  process.env.GEMINI_TUR_PAYI = '2';
  try {
    await butceYukle({ simdi: gunBasi });
    kullanimEkle({}, { model: L35, amac: 'a' });
    hataEkle(L35, 'a', 503); // başarısız da paydan düşer
    assert.equal(modelPayiVar(L35), false);
    assert.equal(modelPayiVar(L31), true);
    assert.equal(modelPayiVar('gemini-3.6-flash'), true); // kapasite dışı: bütçeye girmez
    assert.equal(geminiPayiBitti(), false);
    kullanimEkle({}, { model: L31, amac: 'a' });
    kullanimEkle({}, { model: L31, amac: 'a' });
    assert.equal(geminiPayiBitti(), true);
    assert.deepEqual(butceDurumu().harcanan, { [L35]: 2, [L31]: 2 });
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
    temiz();
  }
});

test('geminiPayiBitti: 3.5 günlük kotası dolu ama 3.1 açıksa devam', async () => {
  temiz();
  await butceYukle({ simdi: gunBasi });
  gunlukDolu.add(L35);
  assert.equal(geminiPayiBitti(), false);
  gunlukDolu.add(L31);
  assert.equal(geminiPayiBitti(), true);
  temiz();
});

test('butceYukle yüklenmeden pay sınırsız (testler ve araçlar etkilenmez)', async () => {
  const { geminiPayiBitti: taze } = await import(`./butce.mjs?taze=${Date.now()}`);
  assert.equal(taze(), false);
});

test('takma adla yapılan çağrılar (GEMINI_ZINCIR=0) hedef modelin payından düşer', async () => {
  temiz();
  process.env.GEMINI_TUR_PAYI = '2';
  try {
    await butceYukle({ simdi: gunBasi });
    kullanimEkle({}, { model: 'gemini-flash-lite-latest', amac: 'a' });
    hataEkle('gemini-flash-lite-latest', 'a', 503);
    assert.equal(modelPayiVar(L35), false);
    assert.equal(modelPayiVar('gemini-flash-lite-latest'), false);
    assert.equal(butceDurumu().harcanan[L35], 2);
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
    temiz();
  }
});

test('takma adın günlük kotası dolunca hedef model dolu sayılır', async () => {
  temiz();
  await butceYukle({ simdi: gunBasi });
  gunlukDolu.add('gemini-flash-lite-latest');
  gunlukDolu.add(L31);
  assert.equal(geminiPayiBitti(), true);
  temiz();
});

test('GEMINI_ZINCIR=0: kapasite yalnız ana model; takma adın günlük kotası dolunca yeni habere başlanmaz', async () => {
  temiz();
  process.env.GEMINI_ZINCIR = '0';
  try {
    await butceYukle({ simdi: gunBasi });
    assert.deepEqual(Object.keys(butceDurumu().pay), [L35]);
    assert.equal(geminiPayiBitti(), false);
    gunlukDolu.add('gemini-flash-lite-latest');
    assert.equal(geminiPayiBitti(), true);
  } finally {
    delete process.env.GEMINI_ZINCIR;
    temiz();
  }
});

test('GEMINI_ZINCIR=0: pay bitince yeni habere başlanmaz (3.1 kullanılmadığı için kapıyı açık tutmaz)', async () => {
  temiz();
  process.env.GEMINI_ZINCIR = '0';
  process.env.GEMINI_TUR_PAYI = '1';
  try {
    await butceYukle({ simdi: gunBasi });
    kullanimEkle({}, { model: 'gemini-flash-lite-latest', amac: 'a' });
    assert.equal(geminiPayiBitti(), true);
  } finally {
    delete process.env.GEMINI_ZINCIR;
    delete process.env.GEMINI_TUR_PAYI;
    temiz();
  }
});

test('sınırına ulaşmış model takma adıyla da gunlukDolu\'ya girer (eski düzen 429 harcamasın)', async () => {
  temiz();
  const fetchFn = cevap({ gun: '2026-10-17', modeller: { 'gemini-flash-lite-latest': { cagri: 500 } } });
  await butceYukle({ url: 'https://saat.example', anahtar: 'a', site: 'deneme', simdi: gunBasi, fetchFn });
  assert.ok(gunlukDolu.has(L35));
  assert.ok(gunlukDolu.has('gemini-flash-lite-latest'));
  temiz();
});
