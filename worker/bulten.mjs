// Ukesbrev: uç noktalar (abone, onay, ayril) ve haftalık zamanlanmış gönderim.
// Ortam: env.DB (D1), env.ASSETS (statik JSON), env.RESEND_API_KEY (secret), env.BULTEN_GONDEREN (var).
// Kurallar: IP/tarayıcı verisi yok; e-posta ve haber başlığı log'a yazılmaz; her yanıt Cache-Control: no-store.
import {
  ALICI_PARTI,
  DIL,
  FORKLART_MAKS,
  HABER_MAKS,
  ONAY_ARALIGI_MS,
  ONAY_SURESI_MS,
  SITE,
  ayrilmaUrl,
  bultenEpostasi,
  esc,
  gecerliBelirtec,
  isoHafta,
  normaliserEpost,
  onayEpostasi,
  parcala,
  utm,
  yeniBelirtec,
} from './lib.mjs';

const UKE_CRON = '0 6 * * 1'; // pazartesi 06:00 UTC: haftalık gönderim

const yonlendir = (durum) =>
  new Response(null, { status: 303, headers: { Location: `/nyhetsbrev/?durum=${durum}`, 'Cache-Control': 'no-store' } });

async function resend(env, yol, govde, ek = {}) {
  const res = await fetch(`https://api.resend.com${yol}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json', ...ek },
    body: JSON.stringify(govde),
  });
  // Hata metni alıcı bilgisi içerebilir; yalnız durum kodu döner.
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return res.json();
}

/** POST /api/bulten/abone */
export async function abone(request, env, now = new Date()) {
  const form = await request.formData().catch(() => null);
  if (!form) return yonlendir('ugyldig');
  // Tuzak alanı doluysa bot'tur: hiçbir şey yapılmaz, başarı gibi davranılır.
  if (form.get('web')) return yonlendir('kontrol');
  const eposta = normaliserEpost(form.get('eposta'));
  if (!eposta) return yonlendir('ugyldig');
  if (!env.RESEND_API_KEY) return yonlendir('kapali');

  const mevcut = await env.DB.prepare('SELECT durum, olusturma FROM abone WHERE eposta = ?').bind(eposta).first();
  // Onaylı adrese bir şey gönderilmez; bekleyen adrese 10 dakikada bir fazla e-posta gitmez.
  if (mevcut?.durum === 'onayli') return yonlendir('kontrol');
  if (mevcut && now.getTime() - new Date(mevcut.olusturma).getTime() < ONAY_ARALIGI_MS) return yonlendir('kontrol');

  const belirtec = yeniBelirtec();
  const ileti = onayEpostasi(belirtec);
  try {
    await resend(env, '/emails', { from: env.BULTEN_GONDEREN, to: [eposta], ...ileti });
  } catch (e) {
    // Gönderim hatası kullanıcıya belli edilmez (adres var mı sızdırılmaz); kayıt da yazılmaz.
    console.error('bulten: onay e-postası gönderilemedi', e.message);
    return yonlendir('kontrol');
  }
  // Bekleyen kayıt yenilenir (belirtec ve olusturma); onaylı kayıtlara bu sorgu dokunmaz.
  await env.DB.prepare(
    `INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES (?, ?, 'bekliyor', ?, ?)
     ON CONFLICT(eposta) DO UPDATE SET belirtec = excluded.belirtec, olusturma = excluded.olusturma
     WHERE abone.durum = 'bekliyor'`,
  )
    .bind(eposta, DIL, belirtec, now.toISOString())
    .run();
  return yonlendir('kontrol');
}

/** GET /api/bulten/onay?t= */
export async function onay(url, env, now = new Date()) {
  const t = url.searchParams.get('t');
  if (!gecerliBelirtec(t)) return yonlendir('gecersiz');
  const satir = await env.DB.prepare('SELECT durum, olusturma FROM abone WHERE belirtec = ?').bind(t).first();
  if (!satir) return yonlendir('gecersiz');
  if (satir.durum === 'onayli') return yonlendir('onaylandi');
  if (now.getTime() - new Date(satir.olusturma).getTime() > ONAY_SURESI_MS) {
    await env.DB.prepare("DELETE FROM abone WHERE belirtec = ? AND durum = 'bekliyor'").bind(t).run();
    return yonlendir('gecersiz');
  }
  await env.DB.prepare("UPDATE abone SET durum = 'onayli', onay = ? WHERE belirtec = ? AND durum = 'bekliyor'")
    .bind(now.toISOString(), t)
    .run();
  return yonlendir('onaylandi');
}

const AYRIL_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

/** GET /api/bulten/ayril?t= : tek tuşlu onay sayfası. Bağlantı tarayıcı ön yüklemesi aboneliği silmesin diye GET'te silinmez. */
export function ayrilSayfasi(url) {
  const t = url.searchParams.get('t');
  if (!gecerliBelirtec(t)) return yonlendir('gecersiz');
  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Meld av ukesbrevet</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#1a1a1a}button{font:inherit;padding:.6rem 1.1rem;cursor:pointer}</style>
</head>
<body>
<h1>Meld av ukesbrevet</h1>
<p>Vil du slutte å få ukesbrevet fra tidsrøst? Adressen din slettes når du trykker på knappen.</p>
<form method="post" action="/api/bulten/ayril?t=${esc(t)}">
<button type="submit">Meld meg av</button>
</form>
<p><a href="/nyhetsbrev/">Tilbake til ukesbrevet</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'Content-Security-Policy': AYRIL_CSP,
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** POST /api/bulten/ayril?t= : hem tek tıkla (RFC 8058) hem sayfadaki form. Satır silinir. */
export async function ayril(url, env) {
  const t = url.searchParams.get('t');
  if (gecerliBelirtec(t)) await env.DB.prepare('DELETE FROM abone WHERE belirtec = ?').bind(t).run();
  return yonlendir('ayrildi');
}

/** Gönderilecek haftalık içerik: derlemede üretilen /nyhetsbrev/ukentlig.json. */
async function haftalikIcerik(env) {
  const res = await env.ASSETS.fetch(new URL('/nyhetsbrev/ukentlig.json', SITE));
  if (!res.ok) throw new Error(`ukentlig.json ${res.status}`);
  const veri = await res.json();
  const haberler = (veri.haberler ?? []).slice(0, HABER_MAKS);
  const forklart = (veri.forklart ?? []).slice(0, FORKLART_MAKS);
  return { haberler, forklart };
}

/**
 * Zamanlanmış görev. Her gün: süresi dolan bekleyen kayıtları sil.
 * Pazartesi: haftalık bülten (aynı hafta bir kez; gönderim satırı yazılınca tekrar edilmez).
 */
export async function planla(event, env, now = new Date()) {
  const sinir = new Date(now.getTime() - ONAY_SURESI_MS).toISOString();
  await env.DB.prepare("DELETE FROM abone WHERE durum = 'bekliyor' AND olusturma < ?").bind(sinir).run();
  if (event.cron !== UKE_CRON) return 'bekleyen kayıtlar temizlendi';

  const hafta = isoHafta(now);
  const gonderildi = await env.DB.prepare('SELECT 1 AS var FROM gonderim WHERE hafta = ? AND dil = ?').bind(hafta, DIL).first();
  if (gonderildi) return `${hafta} zaten gönderildi`;

  const { haberler, forklart } = await haftalikIcerik(env);
  if (haberler.length === 0 && forklart.length === 0) return `${hafta}: gönderilecek sak yok`;

  const { results } = await env.DB.prepare("SELECT eposta, belirtec FROM abone WHERE durum = 'onayli' AND dil = ? ORDER BY id").bind(DIL).all();
  if (!results.length) return `${hafta}: onaylı abone yok`;

  const hazir = (s) => ({ ...s, url: utm(s.url, `haftalik-${hafta}`) });
  const partiler = parcala(results, ALICI_PARTI);
  for (let i = 0; i < partiler.length; i++) {
    const ileti = partiler[i].map((a) => {
      const { subject, html, text } = bultenEpostasi({
        haberler: haberler.map(hazir),
        forklart: forklart.map(hazir),
        hafta,
        belirtec: a.belirtec,
      });
      return {
        from: env.BULTEN_GONDEREN,
        to: [a.eposta],
        subject,
        html,
        text,
        headers: { 'List-Unsubscribe': `<${ayrilmaUrl(a.belirtec)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      };
    });
    // Aynı parti yeniden denenirse Resend mükerrer göndermez (anahtar 24 saat geçerli).
    await resend(env, '/emails/batch', ileti, { 'Idempotency-Key': `bulten-${hafta}-${DIL}-${i}` });
  }
  await env.DB.prepare('INSERT INTO gonderim (hafta, dil, zaman, adet) VALUES (?, ?, ?, ?)')
    .bind(hafta, DIL, now.toISOString(), results.length)
    .run();
  return `${hafta}: ${results.length} alıcı`;
}

/** Tüm /api/bulten/* yönlendirmesi. Eşleşmeyen /api/* 404 döner. */
export async function yonlendirIstek(request, env, now = new Date()) {
  const url = new URL(request.url);
  const yol = url.pathname;
  const m = request.method;
  let yanit;
  if (yol === '/api/bulten/abone' && m === 'POST') yanit = await abone(request, env, now);
  else if (yol === '/api/bulten/onay' && m === 'GET') yanit = await onay(url, env, now);
  else if (yol === '/api/bulten/ayril' && m === 'GET') yanit = ayrilSayfasi(url);
  else if (yol === '/api/bulten/ayril' && m === 'POST') yanit = await ayril(url, env);
  else yanit = new Response('Ikke funnet', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  yanit.headers.set('Cache-Control', 'no-store');
  return yanit;
}
