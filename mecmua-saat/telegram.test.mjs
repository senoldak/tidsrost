import test from 'node:test';
import assert from 'node:assert/strict';
import { rssOgeleri, aciklama, bultenMaddeleri, bultenAciklamasi, telegramSirasi } from './telegram.js';

test('rssOgeleri parses items properly', () => {
  const xml = `
    <rss version="2.0">
      <channel>
        <item>
          <title><![CDATA[Test Başlık]]></title>
          <description>Özet metni</description>
          <link>https://finfolis.com/haber/test-haberi/</link>
          <pubDate>Wed, 14 Oct 2026 12:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>
  `;
  const items = rssOgeleri(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].baslik, 'Test Başlık');
  assert.equal(items[0].ozet, 'Özet metni');
  assert.equal(items[0].slug, 'test-haberi');
  assert.equal(items[0].tarih.toISOString(), '2026-10-14T12:00:00.000Z');
});

test('telegramSirasi: normal haber kanala, bülten bultenHedefler hedefine gider', async () => {
  const gonderilenler = [];
  const kvDepo = {};
  const sahteKv = {
    get: async (k) => kvDepo[k] ?? null,
    put: async (k, v) => { kvDepo[k] = JSON.parse(v); },
  };

  const sahteRss = `
    <rss version="2.0">
      <channel>
        <item>
          <title>Normal Haber</title>
          <description>Normal haber özeti</description>
          <link>https://finfolis.com/haber/normal-haber/</link>
          <pubDate>${new Date(Date.now() - 3600e3).toUTCString()}</pubDate>
        </item>
        <item>
          <title>Piyasa Bülteni</title>
          <description>Bülten özeti</description>
          <link>https://finfolis.com/haber/piyasa-bulteni-14-ekim/</link>
          <pubDate>${new Date().toUTCString()}</pubDate>
        </item>
      </channel>
    </rss>
  `;

  // Sahte fetch
  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.endsWith('/rss.xml')) {
      return { ok: true, text: async () => sahteRss };
    }
    if (typeof url === 'string' && url.includes('/haber/')) {
      return {
        ok: true,
        text: async () => `<html><head><meta property="og:image" content="https://finfolis.com/img.jpg"></head><body><article><ul><li>Madde 1: Detay</li><li>Madde 2: Detay 2</li></ul></article></body></html>`,
      };
    }
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      gonderilenler.push(body);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 404 };
  };

  try {
    const env = {
      SITE: 'https://finfolis.com',
      TELEGRAM_BOT_TOKEN: 'fake_token',
      TELEGRAM_KV: sahteKv,
      TELEGRAM_HEDEFLER: '@finfolis',
      TELEGRAM_BULTEN_HEDEFLER: '@fundov:5472',
      TELEGRAM_BULTEN: /^piyasa-bulteni-/,
    };

    // 1. çağrı: İlk (en eski) haber normal haber, @finfolis kanalına gitmeli
    const sonuc1 = await telegramSirasi(env, new Date());
    assert.match(sonuc1, /Başarıyla gönderildi: normal-haber -> @finfolis/);
    assert.equal(gonderilenler.length, 1);
    assert.equal(gonderilenler[0].chat_id, '@finfolis');
    assert.equal(gonderilenler[0].message_thread_id, undefined);

    // 2. çağrı: İkinci haber bülten, @fundov:5472 hedefine gitmeli
    const sonuc2 = await telegramSirasi(env, new Date());
    assert.match(sonuc2, /Başarıyla gönderildi: piyasa-bulteni-14-ekim -> @fundov:5472/);
    assert.equal(gonderilenler.length, 2);
    assert.equal(gonderilenler[1].chat_id, '@fundov');
    assert.equal(gonderilenler[1].message_thread_id, 5472);

    // 3. çağrı: Kuyrukta başka haber kalmadı
    const sonuc3 = await telegramSirasi(env, new Date());
    assert.match(sonuc3, /Kuyrukta yeni haber yok/);
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});

test('telegramSirasi: TELEGRAM_YALNIZ tanımlıysa yalnız ona uyan haberler gider', async () => {
  const gonderilenler = [];
  const kvDepo = {};
  const sahteKv = {
    get: async (k) => kvDepo[k] ?? null,
    put: async (k, v) => { kvDepo[k] = JSON.parse(v); },
  };

  const sahteRss = `
    <rss version="2.0">
      <channel>
        <item>
          <title>Normal Haber</title>
          <description>Normal haber özeti</description>
          <link>https://kifobu.com/haber/normal-haber/</link>
          <pubDate>${new Date(Date.now() - 3600e3).toUTCString()}</pubDate>
        </item>
        <item>
          <title>Sabah Bülteni</title>
          <description>Bülten özeti</description>
          <link>https://kifobu.com/haber/sabah-bulteni-14-ekim/</link>
          <pubDate>${new Date().toUTCString()}</pubDate>
        </item>
      </channel>
    </rss>
  `;

  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.endsWith('/rss.xml')) {
      return { ok: true, text: async () => sahteRss };
    }
    if (typeof url === 'string' && url.includes('/haber/')) {
      return {
        ok: true,
        text: async () => `<html><head><meta property="og:image" content="https://kifobu.com/img.jpg"></head><body><article><ul><li><a href="/haber/1">Haber 1</a></li></ul></article></body></html>`,
      };
    }
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      gonderilenler.push(body);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 404 };
  };

  try {
    const env = {
      SITE: 'https://kifobu.com',
      TELEGRAM_BOT_TOKEN: 'fake_token',
      TELEGRAM_KV: sahteKv,
      TELEGRAM_HEDEFLER: '@kifobu,@fundov:24358',
      TELEGRAM_YALNIZ: /^(sabah|ogle|aksam|gece)-bulteni-/,
    };

    // Yalnız bülten gitmeli, normal haber atlanmalı
    const sonuc = await telegramSirasi(env, new Date());
    assert.match(sonuc, /Başarıyla gönderildi: sabah-bulteni-14-ekim/);
    assert.equal(gonderilenler.length, 2); // hem @kifobu hem @fundov:24358
    assert.equal(gonderilenler[0].chat_id, '@kifobu');
    assert.equal(gonderilenler[1].chat_id, '@fundov');
    assert.equal(gonderilenler[1].message_thread_id, 24358);
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});

test('telegramSirasi: bir hedef başarısızsa yalnız o hedef sonraki turda yeniden denenir', async () => {
  const gonderilenler = [];
  const kvDepo = {};
  const sahteKv = {
    get: async (k) => kvDepo[k] ?? null,
    put: async (k, v) => { kvDepo[k] = JSON.parse(v); },
  };
  const sahteRss = `<rss><channel><item><title>Gece Bülteni</title><description>x</description>
    <link>https://kifobu.com/haber/gece-bulteni-14-ekim/</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
  let fundovBozuk = true;
  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url.endsWith('/rss.xml')) return { ok: true, text: async () => sahteRss };
    if (url.includes('/haber/')) return { ok: true, text: async () => '<html><article><ul><li><a href="/haber/1">Haber 1</a></li></ul></article></html>' };
    const body = JSON.parse(opts.body);
    gonderilenler.push(body.chat_id);
    const ok = !(body.chat_id === '@fundov' && fundovBozuk);
    return { ok: true, json: async () => (ok ? { ok: true } : { ok: false, description: 'Bad Request' }) };
  };
  try {
    const env = {
      SITE: 'https://kifobu.com',
      TELEGRAM_BOT_TOKEN: 'fake_token',
      TELEGRAM_KV: sahteKv,
      TELEGRAM_HEDEFLER: '@kifobu,@fundov:24358',
      TELEGRAM_YALNIZ: /^(sabah|ogle|aksam|gece)-bulteni-/,
    };
    await assert.rejects(telegramSirasi(env, new Date()), /fundov/);
    assert.deepEqual(kvDepo.gonderilen['gece-bulteni-14-ekim'], { bitti: ['@kifobu'], deneme: 1 });
    fundovBozuk = false;
    gonderilenler.length = 0;
    assert.match(await telegramSirasi(env, new Date()), /Başarıyla gönderildi/);
    assert.deepEqual(gonderilenler, ['@fundov']); // @kifobu'ya ikinci kez gitmedi
    assert.equal(typeof kvDepo.gonderilen['gece-bulteni-14-ekim'], 'string');
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});

test('telegramSirasi: yalnız bülten gönderen sitede birikmiş bültenlerden yalnız en yenisi gider', async () => {
  const gonderilenler = [];
  const kvDepo = {};
  const sahteKv = { get: async (k) => kvDepo[k] ?? null, put: async (k, v) => { kvDepo[k] = JSON.parse(v); } };
  const oge = (slug, saatOnce) =>
    `<item><title>${slug}</title><description>d</description><link>https://finfolis.com/haber/${slug}/</link><pubDate>${new Date(Date.now() - saatOnce * 3600e3).toUTCString()}</pubDate></item>`;
  const sahteRss = `<rss><channel>${oge('piyasa-bulteni-14-ekim-2', 6)}${oge('piyasa-bulteni-14-ekim-3', 4)}${oge('piyasa-bulteni-14-ekim-4', 2)}</channel></rss>`;
  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url.endsWith('/rss.xml')) return { ok: true, text: async () => sahteRss };
    if (url.includes('/haber/')) return { ok: true, text: async () => '<html><head></head><body></body></html>' };
    if (url.includes('api.telegram.org')) {
      gonderilenler.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 404 };
  };
  try {
    const env = { SITE: 'https://finfolis.com', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_KV: sahteKv, TELEGRAM_HEDEFLER: '@finfolis', TELEGRAM_YALNIZ: /^piyasa-bulteni-/ };
    assert.match(await telegramSirasi(env, new Date()), /gönderildi: piyasa-bulteni-14-ekim-4/);
    assert.equal(gonderilenler.length, 1);
    assert.ok(kvDepo.gonderilen['piyasa-bulteni-14-ekim-2'] && kvDepo.gonderilen['piyasa-bulteni-14-ekim-3']);
    assert.match(await telegramSirasi(env, new Date()), /Kuyrukta yeni haber yok/);
    assert.equal(gonderilenler.length, 1);
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});

test('utmLink: telegram UTM ekler, mevcut UTM\'e dokunmaz', async () => {
  const { utmLink } = await import('./telegram.js');
  const u = new URL(utmLink('https://tidsrost.com/artikkel/a/', 'haber'));
  assert.equal(u.searchParams.get('utm_source'), 'telegram');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
  assert.equal(u.searchParams.get('utm_campaign'), 'haber');
  assert.equal(utmLink(u.href, 'bulten'), u.href);
});

function noindexSenaryosu(sayfaHtml) {
  const gonderilenler = [];
  const kvDepo = {};
  const sahteKv = { get: async (k) => kvDepo[k] ?? null, put: async (k, v) => { kvDepo[k] = JSON.parse(v); } };
  const sahteRss = `<rss version="2.0"><channel><item><title>Kısa Haber</title><description>Özet</description><link>https://tidsrost.com/artikkel/kisa-haber/</link><pubDate>${new Date(Date.now() - 3600e3).toUTCString()}</pubDate></item></channel></rss>`;
  return { gonderilenler, kvDepo, sahteKv, sahteRss, sayfaHtml };
}

test('telegramSirasi: noindex haber kanala gönderilmez ve bir daha denenmez', async () => {
  const s = noindexSenaryosu('<html><head><meta name="robots" content="noindex, follow"></head><body><article>kısa</article></body></html>');
  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).endsWith('/rss.xml')) return { ok: true, text: async () => s.sahteRss };
    if (String(url).includes('/artikkel/')) return { ok: true, text: async () => s.sayfaHtml };
    if (String(url).includes('api.telegram.org')) { s.gonderilenler.push(JSON.parse(opts.body)); return { ok: true, json: async () => ({ ok: true }) }; }
    return { ok: false, status: 404 };
  };
  try {
    const env = { SITE: 'https://tidsrost.com', TELEGRAM_BOT_TOKEN: 'fake_token', TELEGRAM_KV: s.sahteKv, TELEGRAM_HEDEFLER: '@tidsrost' };
    const sonuc = await telegramSirasi(env, new Date());
    assert.match(sonuc, /noindex/);
    assert.equal(s.gonderilenler.length, 0);
    assert.equal(typeof s.kvDepo.gonderilen['kisa-haber'], 'string');
    assert.match(await telegramSirasi(env, new Date()), /Kuyrukta yeni haber yok/);
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});

test('telegramSirasi: indekslenebilir haber UTM\'li bağlantıyla gider', async () => {
  const s = noindexSenaryosu('<html><head><meta name="robots" content="index, follow"><meta property="og:image" content="https://tidsrost.com/img.jpg"></head><body><article>Uzun haber</article></body></html>');
  const orjinalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).endsWith('/rss.xml')) return { ok: true, text: async () => s.sahteRss };
    if (String(url).includes('/artikkel/')) return { ok: true, text: async () => s.sayfaHtml };
    if (String(url).includes('api.telegram.org')) { s.gonderilenler.push(JSON.parse(opts.body)); return { ok: true, json: async () => ({ ok: true }) }; }
    return { ok: false, status: 404 };
  };
  try {
    const env = { SITE: 'https://tidsrost.com', TELEGRAM_BOT_TOKEN: 'fake_token', TELEGRAM_KV: s.sahteKv, TELEGRAM_HEDEFLER: '@tidsrost' };
    const sonuc = await telegramSirasi(env, new Date());
    assert.match(sonuc, /Başarıyla gönderildi/);
    const metin = s.gonderilenler[0].caption ?? s.gonderilenler[0].text;
    assert.match(metin, /utm_source=telegram&utm_medium=social&utm_campaign=haber/);
  } finally {
    globalThis.fetch = orjinalFetch;
  }
});
