// Kaynak: mecmua/site-ortak/gemini/istemci.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gemini yönlendirici (Faz 1): zincir üzerinde dönen çağrı çekirdeği.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
for (const k of ['GEMINI_MODEL', 'GEMINI_YEDEK_MODEL', 'GEMINI_DENETIM_YEDEK_MODEL', 'GEMINI_ZINCIR', 'GEMINI_GOLGE']) delete process.env[k];
const { geminiCagir, istemciSifirla } = await import('./istemci.mjs');
const { gunlukDolu, ayrintiSifirla, ayrintiKayitlari } = await import('./kullanim.mjs');
const { golgeKur } = await import('./golge.mjs');

const L35 = 'gemini-3.5-flash-lite';
const L31 = 'gemini-3.1-flash-lite';
const F36 = 'gemini-3.6-flash';
const F3 = 'gemini-3-flash-preview';
const GEMMA = 'gemma-4-26b-a4b-it';

const tamam = (metin = '{"ok":true}', ek = {}) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: metin }] }, ...ek }], usageMetadata: {} }));
const kota = (sinir) =>
  new Response(JSON.stringify({ error: { code: 429, details: [{ violations: [{ quotaId: `GenerateRequests${sinir}PerProjectPerModel-FreeTier` }] }] } }), { status: 429 });
const durum = (n, metin = 'x') => new Response(metin, { status: n });
const zamanAsimi = () => {
  throw new DOMException('süre doldu', 'TimeoutError');
};

// cevaplar: sırayla döndürülecek Response üreticileri ya da sayı (durum kodu); bitince 503.
function ag(cevaplar) {
  const istekler = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, sec) => {
    istekler.push({ model: String(url).match(/models\/([^:]+):/)[1], govde: JSON.parse(sec.body) });
    const c = cevaplar.shift() ?? 503;
    return typeof c === 'number' ? (c === 200 ? tamam() : durum(c)) : c();
  };
  return { istekler, modeller: () => istekler.map((i) => i.model), geri: () => (globalThis.fetch = gercek) };
}
async function ile(cevaplar, fn) {
  const a = ag(cevaplar);
  try {
    await fn(a);
  } finally {
    a.geri();
  }
  return a;
}
const yaz = (ek = {}) => geminiCagir({ istem: 'x', sema: { type: 'OBJECT' }, ...ek });

beforeEach(() => {
  istemciSifirla();
  gunlukDolu.clear();
  ayrintiSifirla();
  golgeKur(0);
});

test('zincir sırası: 503 veren modelden beklemeden sıradakine', async () => {
  const a = await ile([503, 200], async () => assert.deepEqual(await yaz(), { ok: true }));
  assert.deepEqual(a.modeller(), [L35, L31]);
});

test('zaman aşımı sıradakine geçer ve 5xx sayılır', async () => {
  const a = await ile([zamanAsimi, 200], async () => assert.deepEqual(await yaz(), { ok: true }));
  assert.deepEqual(a.modeller(), [L35, L31]);
  assert.equal(ayrintiKayitlari().find((s) => s.model === L35).h503, 1);
});

test('kapasite modelleri 180 sn, yedek halka modelin süresi kadar bekler', async () => {
  const sureler = [];
  const gercek = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => (sureler.push(ms), new AbortController().signal);
  try {
    await ile([503, 503, 200], async () => yaz());
  } finally {
    AbortSignal.timeout = gercek;
  }
  assert.deepEqual(sureler, [180_000, 180_000, 90_000]);
});

test('günlük 429 (PerDay): model kapanır, beklemeden sıradaki; sonraki çağrı onu hiç denemez', async () => {
  let a = await ile([() => kota('PerDay'), 200], async () => yaz());
  assert.deepEqual(a.modeller(), [L35, L31]);
  assert.ok(gunlukDolu.has(L35));
  a = await ile([200], async () => yaz());
  assert.deepEqual(a.modeller(), [L31]);
});

test('dakikalık 429: aynı model bir kez daha denenir', async () => {
  const a = await ile([() => kota('PerMinute'), 200], async () => yaz());
  assert.deepEqual(a.modeller(), [L35, L35]);
});

test('bütün zincir günlük dolu: kota hatası, her model bir kez', async () => {
  const a = await ile(Array(4).fill(() => kota('PerDay')), async () => {
    await assert.rejects(yaz(), (e) => e.kota === true && /günlük kotası dolu/.test(e.message));
  });
  assert.equal(a.istekler.length, 4);
});

test('400: ayar hatası, zincir denenmez; alan adı sitenin seçimi', async () => {
  let a = await ile([400], async () => assert.rejects(yaz(), (e) => e.konfig === true));
  assert.equal(a.istekler.length, 1);
  a = await ile([403], async () => assert.rejects(geminiCagir({ istem: 'x', sema: {} }, { ayarAlani: 'ayar' }), (e) => e.ayar === true && !e.konfig));
  assert.equal(a.istekler.length, 1);
});

test('hep 503: yazımda 4 model × 3 tur; sonraki çağrı tek tur; başarı sınırı sıfırlar', async () => {
  let a = await ile([], async () => assert.rejects(yaz(), /çok fazla deneme/));
  assert.equal(a.istekler.length, 12);
  assert.deepEqual(a.modeller().slice(0, 4), [L35, L31, F36, F3]);
  a = await ile([], async () => assert.rejects(yaz(), /çok fazla deneme/));
  assert.equal(a.istekler.length, 4);
  a = await ile([200, ...Array(12).fill(503)], async () => {
    await yaz();
    await assert.rejects(yaz(), /çok fazla deneme/);
  });
  assert.equal(a.istekler.length, 13);
});

test('soğuma: 5xx veren model 10 dk atlanır, sonra yeniden ilk sıraya döner', async () => {
  let t = 0;
  istemciSifirla({ saat: () => t });
  let a = await ile([503, 200], async () => yaz());
  assert.deepEqual(a.modeller(), [L35, L31]);
  t = 5 * 60_000;
  a = await ile([200], async () => yaz());
  assert.deepEqual(a.modeller(), [L31]);
  t = 11 * 60_000;
  a = await ile([200], async () => yaz());
  assert.deepEqual(a.modeller(), [L35]);
});

test('payı biten kapasite modeli öbür kapasite modelinden sonra ama 20 RPD’li yedeklerden önce', async () => {
  process.env.GEMINI_TUR_PAYI = '1';
  const { butceYukle } = await import('./butce.mjs');
  const { kullanimEkle } = await import('./kullanim.mjs');
  try {
    await butceYukle({});
    kullanimEkle({}, { model: L35, amac: 'a' }); // 3.5'in payı bitti, 3.1'inki duruyor
    let a = await ile([503, 200], async () => yaz());
    assert.deepEqual(a.modeller(), [L31, L35]);
    kullanimEkle({}, { model: L31, amac: 'a' }); // ikisi de bitti: süren haber yine Flash-Lite'la
    istemciSifirla();
    a = await ile([200], async () => yaz());
    assert.deepEqual(a.modeller(), [L35]);
  } finally {
    delete process.env.GEMINI_TUR_PAYI;
    await butceYukle({});
  }
});

test('GEMINI_ZINCIR=0: ana modelin payı bitse de önce ana model, 20 RPD’li Flash sonra', async () => {
  process.env.GEMINI_ZINCIR = '0';
  process.env.GEMINI_TUR_PAYI = '0';
  const { butceYukle } = await import('./butce.mjs');
  try {
    await butceYukle({});
    const a = await ile([200], async () => yaz());
    assert.deepEqual(a.modeller(), ['gemini-flash-lite-latest']);
  } finally {
    delete process.env.GEMINI_ZINCIR;
    delete process.env.GEMINI_TUR_PAYI;
    await butceYukle({});
  }
});

test('3.5 atlanınca ilk denenen kapasite modeli de 180 sn bekler (uzun meşru yanıt)', async () => {
  gunlukDolu.add(L35);
  const sureler = [];
  const gercek = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => (sureler.push(ms), new AbortController().signal);
  try {
    await ile([503, 200], async () => yaz({ denetim: true }));
  } finally {
    AbortSignal.timeout = gercek;
  }
  assert.deepEqual(sureler, [180_000, 60_000]);
});

test('Gemma şemasız: responseSchema ve düşünme gönderilmez, biçim istemde; çitli JSON ayıklanır', async () => {
  const a = await ile([503, 503, () => tamam(' []\n```')], async () => {
    assert.deepEqual(await yaz({ denetim: true, sema: { type: 'ARRAY' } }), []);
  });
  assert.deepEqual(a.modeller(), [L35, L31, GEMMA]);
  const g = a.istekler[2].govde;
  assert.equal(g.generationConfig.responseSchema, undefined);
  assert.equal(g.generationConfig.thinkingConfig, undefined);
  assert.match(g.contents[0].parts[0].text, /Yalnız geçerli JSON döndür[\s\S]*"ARRAY"/);
  assert.ok(a.istekler[0].govde.generationConfig.responseSchema);
});

// 27 Ekim: Gemma 4 cevabın başına düşünme parçaları koyuyor; içlerinde süslü parantez geçince JSON ayıklanamıyordu.
const parcali = (parts) => () => new Response(JSON.stringify({ candidates: [{ content: { parts } }], usageMetadata: {} }));

test('Gemma düşünme parçaları cevaba karışmaz', async () => {
  const cevap = parcali([
    { thought: true, text: 'Biçim: {"onay": boolean, "sorunlar": [...]} olmalı' },
    { thought: true, text: '`' },
    { text: '```json\n{"onay": true, "sorunlar": []}\n```' },
  ]);
  await ile([cevap], async () => {
    assert.deepEqual(await yaz({ denetim: true, _model: GEMMA }), { onay: true, sorunlar: [] });
  });
});

test('şemalı modelde de düşünme parçası JSON.parse\'a girmez', async () => {
  const cevap = parcali([{ thought: true, text: 'düşünüyorum' }, { text: '{"ok":true}' }]);
  await ile([cevap], async () => {
    assert.deepEqual(await yaz(), { ok: true });
  });
});

test('Gemma JSON dışı cevap: bozuk hatası', async () => {
  await ile([503, 503, () => tamam('merhaba')], async () => {
    await assert.rejects(yaz({ denetim: true }), (e) => e.bozuk === true);
  });
});

test('uzun istem Gemma\'yı atlar (uzun zincir)', async () => {
  const a = await ile([], async () => assert.rejects(yaz({ denetim: true, istem: 'x'.repeat(70_000) })));
  assert.ok(!a.modeller().includes(GEMMA));
  assert.deepEqual(a.modeller().slice(0, 3), [L35, L31, F36]);
});

test('düşünme desteklenmezse aynı model düşünmesiz, deneme sayılmaz', async () => {
  const a = await ile([() => durum(400, 'thinking is not supported'), 200], async () => assert.deepEqual(await yaz(), { ok: true }));
  assert.deepEqual(a.modeller(), [L35, L35]);
  assert.equal(a.istekler[1].govde.generationConfig.thinkingConfig, undefined);
});

test('MAX_TOKENS: maksCikis verilmişse bir kez yeniden; verilmemişse tek deneme ve bozuk', async () => {
  const kesik = () => tamam('{"ok":', { finishReason: 'MAX_TOKENS' });
  let a = await ile([kesik, 200], async () => assert.deepEqual(await geminiCagir({ istem: 'x', sema: {} }, { maksCikis: 16384 }), { ok: true }));
  assert.equal(a.istekler.length, 2);
  assert.equal(a.istekler[0].govde.generationConfig.maxOutputTokens, 16384);
  a = await ile([kesik], async () => assert.rejects(yaz(), (e) => e.bozuk === true));
  assert.equal(a.istekler.length, 1);
  assert.equal(a.istekler[0].govde.generationConfig.maxOutputTokens, undefined);
});

test('gölge: denetim kararı Gemma\'ya şemasız sorulur; gölgenin 429\'u sayaçlara girmez', async () => {
  golgeKur(1);
  const a = await ile([() => tamam('{"uygun":true}'), () => kota('PerMinute')], async () => {
    assert.deepEqual(await yaz({ denetim: true }), { uygun: true });
  });
  assert.deepEqual(a.modeller(), [L35, GEMMA]);
  assert.equal(a.istekler[1].govde.generationConfig.responseSchema, undefined);
  assert.ok(ayrintiKayitlari().every((s) => s.h429 === 0));
});

test('GEMINI_ZINCIR=0: eski düzen', async () => {
  process.env.GEMINI_ZINCIR = '0';
  try {
    const a = await ile([503, 200], async () => yaz());
    assert.deepEqual(a.modeller(), ['gemini-flash-lite-latest', 'gemini-flash-latest']);
  } finally {
    delete process.env.GEMINI_ZINCIR;
  }
});

test('zincir geçişi log satırı', async () => {
  const satirlar = [];
  const gercek = console.warn;
  console.warn = (s) => satirlar.push(s);
  try {
    await ile([503, 200], async () => yaz());
  } finally {
    console.warn = gercek;
  }
  assert.ok(satirlar.some((s) => s.includes(`Gemini zincir: ${L35} 503 → ${L31}`)), satirlar.join('\n'));
});

test('anahtar yoksa null', async () => {
  const k = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.equal(await yaz(), null);
  } finally {
    process.env.GEMINI_API_KEY = k;
  }
});
