import test from 'node:test';
import assert from 'node:assert/strict';

// Standartlar Faz 0: yayın kapısı, acil durdurma ve vaktsjef onayı yokken yayımlamama.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { yayinKapisi, acilDurdurma, sakDenetimGirdisi } = await import('./kapi.mjs');
const { motorKaydet, kirmiziKayit, sariKayit, motorKimlik } = await import('./motor.mjs');
const { redigerSak } = await import('./redaktor.mjs');

const sessiz = () => {};
const sak = { title: 'Regjeringen foreslår ny ordning', description: 'Forslaget gjelder alle kommuner.', body: 'Teksten er nøytral og handler om kommunene.' };
const ortam = { MOTOR_URL: 'https://saat.example', MOTOR_ANAHTARI: 'x'.repeat(20) };
const hav = () => {
  const kayitlar = [];
  return { kayitlar, kaydet: async (a) => kayitlar.push(a) };
};

test('kırmızı haber yazılmaz; motora elendi + gerekçe gider', async () => {
  const { kayitlar, kaydet } = hav();
  const kirmizi = () => ({ karar: 'kirmizi', kirmizi: [{ kural: 'suc', ham: 'x' }], sari: [], gerekce: 'standart:kirmizi:suc' });
  const r = await yayinKapisi({ girdi: sakDenetimGirdisi(sak), kimlik: 'regjeringen:1', ortam, denetle: kirmizi, kaydet, log: sessiz });
  assert.equal(r.karar, 'elendi');
  assert.equal(kayitlar.length, 1);
  assert.deepEqual(kayitlar[0].kayit, { kimlik: motorKimlik('regjeringen:1'), durum: 'elendi', gerekce: 'standart:kirmizi:suc' });
  assert.equal(kayitlar[0].url, ortam.MOTOR_URL);
});

test('sarı haber yazılır ve gerekçe çağırana döner (yazildi kaydı için)', async () => {
  const { kayitlar, kaydet } = hav();
  const sari = () => ({ karar: 'sari', kirmizi: [], sari: [{ kural: 'olum-kaza', ham: 'x' }], gerekce: 'standart:sari:olum-kaza' });
  const r = await yayinKapisi({ girdi: sakDenetimGirdisi(sak), kimlik: 'a:1', ortam, denetle: sari, kaydet, log: sessiz });
  assert.equal(r.karar, 'yaz');
  assert.equal(r.s.gerekce, 'standart:sari:olum-kaza');
  assert.equal(kayitlar.length, 0);
  assert.deepEqual(sariKayit('a:1', 'bir-slug', r.s), { kimlik: motorKimlik('a:1'), durum: 'yazildi', slug: 'bir-slug', gerekce: 'standart:sari:olum-kaza' });
});

test('temiz haber yazılır; gerçek süzgeç sakin metinde temiz verir', async () => {
  const r = await yayinKapisi({ girdi: sakDenetimGirdisi(sak), kimlik: 'a:2', ortam, log: sessiz });
  assert.equal(r.karar, 'yaz');
  assert.equal(r.s.karar, 'temiz');
});

test('denetim hatası haberi bekletir: yazılmaz, elendi kaydı gitmez', async () => {
  const { kayitlar, kaydet } = hav();
  const r = await yayinKapisi({
    girdi: sakDenetimGirdisi(sak),
    kimlik: 'a:3',
    ortam,
    denetle: () => {
      throw new Error('kural dosyası bozuk');
    },
    kaydet,
    log: sessiz,
  });
  assert.equal(r.karar, 'bekle');
  assert.equal(kayitlar.length, 0);
  const bos = await yayinKapisi({ girdi: sakDenetimGirdisi(sak), kimlik: 'a:4', ortam, denetle: () => undefined, kaydet, log: sessiz });
  assert.equal(bos.karar, 'bekle');
});

test('denetim girdisi: ek alanlar ve kaynak metni taşınır, dil nb', () => {
  const g = sakDenetimGirdisi({ ...sak, why_matters: 'W', key_points: ['k1', 'k2'], kildeTekst: 'KAYNAK' });
  assert.equal(g.dil, 'nb');
  assert.deepEqual(g.ekler, ['W', 'k1', 'k2']);
  assert.equal(g.kaynakMetni, 'KAYNAK');
});

test('motorKaydet: doğru uç ve gövde; kimlikte adres karakterleri temizlenir; hatada tur durmaz', async () => {
  let istek;
  const ok = await motorKaydet({
    url: ortam.MOTOR_URL,
    anahtar: ortam.MOTOR_ANAHTARI,
    kayit: kirmiziKayit('medier:a/b?c', { gerekce: 'standart:kirmizi:suc' }),
    fetchFn: async (u, i) => {
      istek = { u, i };
      return new Response('{}');
    },
  });
  assert.equal(ok, true);
  assert.equal(istek.u, 'https://saat.example/motor/tidsrost/kaydet');
  // Kimlik özetlenir: adres karakteri ve kaynak adı deftere gitmez.
  assert.equal(JSON.parse(istek.i.body).haberler[0].kimlik, motorKimlik('medier:a/b?c'));
  assert.match(motorKimlik('a b'), /^t:[0-9a-f]{24}$/);
  const kotu = await motorKaydet({
    url: ortam.MOTOR_URL,
    anahtar: ortam.MOTOR_ANAHTARI,
    kayit: { kimlik: 'x', durum: 'elendi' },
    fetchFn: async () => {
      throw new Error('ağ');
    },
  });
  assert.equal(kotu, false);
});

test('acil durdurma açıksa tur biter (true) ve neden loglanır; kapalıyken sürer', async () => {
  const log = [];
  const acik = await acilDurdurma({ ortam, log: (m) => log.push(m), fetchFn: async () => new Response(JSON.stringify({ durdu: true, zaman: 'Z' })) });
  assert.equal(acik, true);
  assert.match(log[0], /^Acil durdurma açık: /);
  const kapali = await acilDurdurma({ ortam, log: (m) => log.push(m), fetchFn: async () => new Response(JSON.stringify({ durdu: false })) });
  assert.equal(kapali, false);
  assert.match(log[1], /^Acil durdurma: /);
});

// ── vaktsjef onayı: iki turda onay yoksa yayımlanmaz (bekle) ─────────────────────────────
const avsnitt = 'Regjeringen la fram forslaget onsdag og la vekt på at ordningen skal gjelde alle kommuner i landet fra neste år. ';
const body = avsnitt.repeat(20).trim();
const kilde = `${body}\n\nKilde.`;
const utkast = { title: 'Regjeringen foreslår ny ordning for kommunene', description: 'Forslaget gjelder alle kommuner.', body };

async function kjor(svarFn) {
  const kall = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    kall.push(prompt);
    const svar = svarFn(kall.length);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    return { r: await redigerSak(utkast, kilde, {}), kall };
  } finally {
    globalThis.fetch = gercek;
  }
}

test('vaktsjef iki turda da reddederse haber yayımlanmaz (bekle)', async () => {
  const { r } = await kjor(() => ({ godkjent: false, problemer: ['Tilskriving mangler'], ...utkast }));
  assert.equal(r.bekle, true);
  assert.ok(r.merknader.includes('Tilskriving mangler'));
});

test('vaktsjef onaylayınca bekle yok', async () => {
  const { r } = await kjor(() => ({ godkjent: true, problemer: [], redigert: utkast }));
  assert.equal(r.bekle, false);
  assert.equal(r.stopp.length, 0);
});
