// Ukesbrev testleri: saf yardımcılar, uç noktalar ve zamanlanmış gönderim.
// Veritabanı: node:sqlite ile gerçek SQLite (migrations/0001_bulten.sql uygulanır); D1 arayüzü ince bir sarmalayıcıdır.
// Ağ: Resend ve ASSETS çağrıları sahte fetch ile yakalanır; gerçek e-posta gönderilmez.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  bultenEpostasi,
  gecerliBelirtec,
  isoHafta,
  normaliserEpost,
  onayEpostasi,
  parcala,
  utm,
} from './lib.mjs';
import { abone, onay, planla, yonlendirIstek } from './bulten.mjs';

const sqlite = await import('node:sqlite').catch(() => null);
const HER = path.dirname(fileURLToPath(import.meta.url));
const MIGRASYON = readFileSync(path.join(HER, '..', 'migrations', '0001_bulten.sql'), 'utf8');
const GONDEREN = 'tidsrøst <nyhetsbrev@tidsrost.com>';

// node:sqlite üzerinde D1 benzeri arayüz (prepare -> bind -> first/all/run).
function d1(db) {
  return {
    prepare(sql) {
      const st = db.prepare(sql);
      return {
        bind(...args) {
          return {
            first: async () => st.get(...args) ?? null,
            all: async () => ({ results: st.all(...args) }),
            run: async () => ({ meta: { changes: st.run(...args).changes } }),
          };
        },
      };
    },
  };
}

const ornek = {
  haberler: [
    { tittel: 'Første sak', ingress: 'Kort ingress.', url: 'https://tidsrost.com/artikkel/a/', dato: '2026-10-14' },
    { tittel: 'Andre sak', ingress: 'Mer tekst.', url: 'https://tidsrost.com/artikkel/b/', dato: '2026-10-15' },
  ],
  forklart: [{ tittel: 'Forklart', ingress: 'Tall.', url: 'https://tidsrost.com/artikkel/c/', dato: '2026-10-13' }],
};

let db;
let env;
let calls;
let realFetch;

function sahteFetch(yanit = {}) {
  realFetch = globalThis.fetch;
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/nyhetsbrev/ukentlig.json')) {
      return new Response(JSON.stringify(yanit.icerik ?? ornek), { status: 200 });
    }
    if (String(url).startsWith('https://api.resend.com')) {
      return new Response(JSON.stringify({ data: [] }), { status: yanit.resendStatus ?? 200 });
    }
    return new Response('yok', { status: 500 });
  };
}

function formIstegi(alanlar) {
  return new Request('https://tidsrost.com/api/bulten/abone', {
    method: 'POST',
    body: new URLSearchParams(alanlar),
  });
}

beforeEach(() => {
  db = new sqlite.DatabaseSync(':memory:');
  db.exec(MIGRASYON);
  env = {
    DB: d1(db),
    RESEND_API_KEY: 're_test_anahtar',
    BULTEN_GONDEREN: GONDEREN,
    ASSETS: { fetch: (u) => globalThis.fetch(u) },
  };
  sahteFetch();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  db?.close();
});

// node:sqlite satırları null-prototip nesnedir; karşılaştırma için düz nesneye çevrilir.
const satirlar = (sorgu, ...args) => db.prepare(sorgu).all(...args).map((r) => ({ ...r }));
const yer = (yanit) => yanit.headers.get('Location');

test('normaliserEpost küçük harfe çevirir ve geçersizi reddeder', { skip: !sqlite }, () => {
  assert.equal(normaliserEpost(' Ola@Ornek.NO '), 'ola@ornek.no');
  assert.equal(normaliserEpost('ola@ornek'), null);
  assert.equal(normaliserEpost('a b@ornek.no'), null);
  assert.equal(normaliserEpost(undefined), null);
  assert.equal(normaliserEpost(`${'a'.repeat(250)}@x.no`), null);
});

test('isoHafta ISO hafta numarasını verir', () => {
  assert.equal(isoHafta(new Date('2026-10-19T06:00:00Z')), '2026-W43');
  assert.equal(isoHafta(new Date('2026-01-01T12:00:00Z')), '2026-W01');
  assert.equal(isoHafta(new Date('2025-12-29T12:00:00Z')), '2026-W01');
});

test('utm bülten parametrelerini ekler', () => {
  const u = new URL(utm('https://tidsrost.com/artikkel/a/', 'haftalik-2026-W43'));
  assert.equal(u.searchParams.get('utm_source'), 'bulten');
  assert.equal(u.searchParams.get('utm_medium'), 'email');
  assert.equal(u.searchParams.get('utm_campaign'), 'haftalik-2026-W43');
});

test('parcala diziyi boyutlara böler', () => {
  assert.deepEqual(parcala([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('gecerliBelirtec yalnız UUID kabul eder', () => {
  assert.equal(gecerliBelirtec(crypto.randomUUID()), true);
  assert.equal(gecerliBelirtec("' OR 1=1 --"), false);
  assert.equal(gecerliBelirtec(null), false);
});

test('onay e-postası bağlantıyı içerir', () => {
  const t = crypto.randomUUID();
  const m = onayEpostasi(t);
  assert.ok(m.html.includes(`/api/bulten/onay?t=${t}`));
  assert.ok(m.text.includes(`/api/bulten/onay?t=${t}`));
});

test('bülten e-postası kişiye özel ayrılma bağlantısı ve UTM taşır, kaynak adı içermez', () => {
  const t = crypto.randomUUID();
  const m = bultenEpostasi({ ...ornek, hafta: '2026-W43', belirtec: t });
  assert.ok(m.html.includes(`/api/bulten/ayril?t=${t}`));
  assert.ok(m.text.includes(`/api/bulten/ayril?t=${t}`));
  assert.ok(m.html.includes('utm_campaign=haftalik-2026-W43'));
  assert.ok(m.subject.includes('uke 43'));
  assert.ok(m.html.includes('Nye forklaringer'));
});

test('abone: tuzak doluysa hiçbir şey yapılmaz', async () => {
  const yanit = await abone(formIstegi({ eposta: 'ola@ornek.no', web: 'bot' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=kontrol');
  assert.equal(calls.length, 0);
  assert.equal(satirlar('SELECT * FROM abone').length, 0);
});

test('abone: geçersiz adres ugyldig durumuna yönlenir', async () => {
  const yanit = await abone(formIstegi({ eposta: 'yok' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=ugyldig');
  assert.equal(calls.length, 0);
});

test('abone: RESEND_API_KEY yoksa kapali', async () => {
  delete env.RESEND_API_KEY;
  const yanit = await abone(formIstegi({ eposta: 'ola@ornek.no' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=kapali');
});

test('abone: yeni adrese onay e-postası gider ve bekleyen kayıt yazılır', async () => {
  const yanit = await abone(formIstegi({ eposta: 'Ola@Ornek.no' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=kontrol');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ['ola@ornek.no']);
  const [kayit] = satirlar("SELECT eposta, durum, belirtec, dil FROM abone");
  assert.equal(kayit.eposta, 'ola@ornek.no');
  assert.equal(kayit.durum, 'bekliyor');
  assert.equal(kayit.dil, 'nb');
  assert.ok(body.html.includes(`/api/bulten/onay?t=${kayit.belirtec}`));
});

test('abone: 10 dakika içinde aynı adrese ikinci e-posta gitmez', async () => {
  const simdi = new Date('2026-10-16T10:00:00Z');
  await abone(formIstegi({ eposta: 'ola@ornek.no' }), env, simdi);
  await abone(formIstegi({ eposta: 'ola@ornek.no' }), env, new Date(simdi.getTime() + 5 * 60_000));
  assert.equal(calls.length, 1);
  await abone(formIstegi({ eposta: 'ola@ornek.no' }), env, new Date(simdi.getTime() + 11 * 60_000));
  assert.equal(calls.length, 2);
  assert.equal(satirlar('SELECT * FROM abone').length, 1);
});

test('abone: onaylı adrese hiçbir şey gönderilmez', async () => {
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma, onay) VALUES ('ola@ornek.no', 'onayli', ?, ?, ?)").run(
    crypto.randomUUID(),
    '2026-10-01T00:00:00Z',
    '2026-10-01T00:00:00Z',
  );
  const yanit = await abone(formIstegi({ eposta: 'ola@ornek.no' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=kontrol');
  assert.equal(calls.length, 0);
});

test('abone: Resend hatasında kullanıcıya aynı yanıt verilir, kayıt yazılmaz', async () => {
  sahteFetch({ resendStatus: 500 });
  env.ASSETS = { fetch: (u) => globalThis.fetch(u) };
  const yanit = await abone(formIstegi({ eposta: 'ola@ornek.no' }), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=kontrol');
  assert.equal(satirlar('SELECT * FROM abone').length, 0);
});

test('onay: geçerli belirteç aboneliği onaylar', async () => {
  const t = crypto.randomUUID();
  const simdi = new Date('2026-10-16T10:00:00Z');
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('ola@ornek.no', 'bekliyor', ?, ?)").run(t, simdi.toISOString());
  const yanit = await onay(new URL(`https://tidsrost.com/api/bulten/onay?t=${t}`), env, new Date(simdi.getTime() + 60_000));
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=onaylandi');
  assert.equal(satirlar("SELECT durum FROM abone")[0].durum, 'onayli');
});

test('onay: 7 günden eski belirteç geçersiz ve kayıt silinir', async () => {
  const t = crypto.randomUUID();
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('ola@ornek.no', 'bekliyor', ?, ?)").run(t, '2026-10-01T00:00:00Z');
  const yanit = await onay(new URL(`https://tidsrost.com/api/bulten/onay?t=${t}`), env, new Date('2026-10-16T00:00:00Z'));
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=gecersiz');
  assert.equal(satirlar('SELECT * FROM abone').length, 0);
});

test('onay: bilinmeyen ya da bozuk belirteç gecersiz', async () => {
  const yanit = await onay(new URL('https://tidsrost.com/api/bulten/onay?t=abc'), env);
  assert.equal(yer(yanit), '/nyhetsbrev/?durum=gecersiz');
});

test('ayril: GET yalnız onay sayfasını gösterir, silmez; POST siler', async () => {
  const t = crypto.randomUUID();
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('ola@ornek.no', 'onayli', ?, ?)").run(t, '2026-10-01T00:00:00Z');
  const get = await yonlendirIstek(new Request(`https://tidsrost.com/api/bulten/ayril?t=${t}`), env);
  assert.equal(get.status, 200);
  assert.ok((await get.text()).includes(`action="/api/bulten/ayril?t=${t}"`));
  assert.equal(satirlar('SELECT * FROM abone').length, 1);

  const post = await yonlendirIstek(
    new Request(`https://tidsrost.com/api/bulten/ayril?t=${t}`, {
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
    env,
  );
  assert.equal(post.status, 303);
  assert.equal(yer(post), '/nyhetsbrev/?durum=ayrildi');
  assert.equal(satirlar('SELECT * FROM abone').length, 0);
});

test('yönlendirme: eşleşmeyen /api/* 404 döner ve önbelleğe alınmaz', async () => {
  const yanit = await yonlendirIstek(new Request('https://tidsrost.com/api/baska'), env);
  assert.equal(yanit.status, 404);
  assert.equal(yanit.headers.get('Cache-Control'), 'no-store');
});

test('planla: pazartesi haftalık bülteni onaylı abonelere parti halinde gönderir ve kaydeder', async () => {
  const ekle = db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES (?, 'onayli', ?, ?)");
  for (let i = 0; i < 3; i++) ekle.run(`a${i}@ornek.no`, crypto.randomUUID(), '2026-10-01T00:00:00Z');
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('bekle@ornek.no', 'bekliyor', ?, ?)").run(crypto.randomUUID(), '2026-10-15T00:00:00Z');
  const pazartesi = new Date('2026-10-19T06:00:00Z');
  const sonuc = await planla({ cron: '0 6 * * 1' }, env, pazartesi);
  assert.equal(sonuc, '2026-W43: 3 alıcı');
  const gonderimler = calls.filter((c) => c.url.endsWith('/emails/batch'));
  assert.equal(gonderimler.length, 1);
  const liste = JSON.parse(gonderimler[0].init.body);
  assert.equal(liste.length, 3);
  assert.ok(liste.every((m) => m.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click'));
  assert.ok(liste.every((m) => m.headers['List-Unsubscribe'].includes('/api/bulten/ayril?t=')));
  assert.equal(new Set(liste.map((m) => m.headers['List-Unsubscribe'])).size, 3);
  assert.ok(gonderimler[0].init.headers['Idempotency-Key']);
  assert.deepEqual(satirlar('SELECT hafta, dil, adet FROM gonderim'), [{ hafta: '2026-W43', dil: 'nb', adet: 3 }]);

  const ikinci = await planla({ cron: '0 6 * * 1' }, env, pazartesi);
  assert.equal(ikinci, '2026-W43 zaten gönderildi');
  assert.equal(calls.filter((c) => c.url.endsWith('/emails/batch')).length, 1);
});

test('planla: 100den fazla alıcı birden fazla batch çağrısına bölünür', async () => {
  const ekle = db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES (?, 'onayli', ?, ?)");
  for (let i = 0; i < 150; i++) ekle.run(`k${i}@ornek.no`, crypto.randomUUID(), '2026-10-01T00:00:00Z');
  await planla({ cron: '0 6 * * 1' }, env, new Date('2026-10-19T06:00:00Z'));
  const parti = calls.filter((c) => c.url.endsWith('/emails/batch')).map((c) => JSON.parse(c.init.body).length);
  assert.deepEqual(parti, [100, 50]);
});

test('planla: gönderilecek haber yoksa e-posta gitmez ve gonderim yazılmaz', async () => {
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('ola@ornek.no', 'onayli', ?, ?)").run(crypto.randomUUID(), '2026-10-01T00:00:00Z');
  sahteFetch({ icerik: { haberler: [], forklart: [] } });
  env.ASSETS = { fetch: (u) => globalThis.fetch(u) };
  const sonuc = await planla({ cron: '0 6 * * 1' }, env, new Date('2026-10-19T06:00:00Z'));
  assert.match(sonuc, /gönderilecek sak yok/);
  assert.equal(calls.filter((c) => c.url.endsWith('/emails/batch')).length, 0);
  assert.equal(satirlar('SELECT * FROM gonderim').length, 0);
});

test('planla: süresi dolan bekleyen kayıtlar her gün silinir, salı günü gönderim yapılmaz', async () => {
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('eski@ornek.no', 'bekliyor', ?, ?)").run(crypto.randomUUID(), '2026-10-01T00:00:00Z');
  db.prepare("INSERT INTO abone (eposta, durum, belirtec, olusturma) VALUES ('yeni@ornek.no', 'bekliyor', ?, ?)").run(crypto.randomUUID(), '2026-10-15T00:00:00Z');
  const sonuc = await planla({ cron: '30 5 * * *' }, env, new Date('2026-10-16T05:30:00Z'));
  assert.equal(sonuc, 'bekleyen kayıtlar temizlendi');
  assert.deepEqual(satirlar('SELECT eposta FROM abone'), [{ eposta: 'yeni@ornek.no' }]);
  assert.equal(calls.length, 0);
});
