// Ukesbrev: saf yardımcılar (ağ ve veritabanı yok, testte doğrudan çalışır).
// Kullanılan yerler: worker/bulten.mjs (uç noktalar, zamanlanmış gönderim) ve worker/bulten.test.mjs.

export const SITE = 'https://tidsrost.com';
export const DIL = 'nb';
export const ONAY_ARALIGI_MS = 10 * 60_000; // aynı adrese en sık bu aralıkla onay e-postası
export const ONAY_SURESI_MS = 7 * 86_400_000; // bekleyen kayıt ve onay bağlantısının geçerlilik süresi
export const HABER_MAKS = 10;
export const FORKLART_MAKS = 5;
export const ALICI_PARTI = 100; // Resend batch: bir çağrıda en fazla 100 e-posta

const EPOST = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** E-posta adresini doğrular ve küçük harfe çevirir; geçersizse null. */
export function normaliserEpost(deger) {
  const e = String(deger ?? '').trim().toLowerCase();
  return e.length <= 254 && EPOST.test(e) ? e : null;
}

export const gecerliBelirtec = (t) => typeof t === 'string' && UUID.test(t);
export const yeniBelirtec = () => crypto.randomUUID();

/** ISO hafta anahtarı, ör. 2026-10-19 -> "2026-W43". */
export function isoHafta(tarih) {
  const d = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
  const gun = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - gun);
  const yil = d.getUTCFullYear();
  const ilk = Date.UTC(yil, 0, 1);
  const hafta = Math.ceil(((d.getTime() - ilk) / 86_400_000 + 1) / 7);
  return `${yil}-W${String(hafta).padStart(2, '0')}`;
}

/** "2026-W43" -> "43" (e-posta başlığında gösterilir). */
export const haftaNo = (hafta) => hafta.slice(-2);

/** Bağlantıya UTM parametreleri ekler (bülten e-postası için). */
export function utm(url, kampanya) {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'bulten');
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', kampanya);
  return u.href;
}

export const ayrilmaUrl = (belirtec) => `${SITE}/api/bulten/ayril?t=${belirtec}`;
export const onayUrl = (belirtec) => `${SITE}/api/bulten/onay?t=${belirtec}`;

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parcala(dizi, boyut) {
  const parcalar = [];
  for (let i = 0; i < dizi.length; i += boyut) parcalar.push(dizi.slice(i, i + boyut));
  return parcalar;
}

const sayfa = (govde) => `<!doctype html>
<html lang="nb">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f6f5f2;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:24px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;">tidsrøst</td></tr>
<tr><td style="padding:8px 24px 24px 24px;font-size:17px;line-height:1.5;">${govde}</td></tr>
</table>
</body>
</html>`;

/** Onay e-postası: aboneliği bekleyen adrese gider. */
export function onayEpostasi(belirtec) {
  const lenke = onayUrl(belirtec);
  const html = sayfa(`
<p>Hei!</p>
<p>Bekreft at du vil få ukesbrevet fra tidsrøst, ved å klikke på knappen under.</p>
<p><a href="${esc(lenke)}" style="display:inline-block;padding:10px 18px;background:#1a1a1a;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Bekreft abonnementet</a></p>
<p style="font-size:14px;color:#555555;">Lenken gjelder i 7 dager. Har du ikke meldt deg på, kan du se bort fra denne e-posten.</p>`);
  const text = `Hei!

Bekreft at du vil få ukesbrevet fra tidsrøst, ved å åpne denne lenken:
${lenke}

Lenken gjelder i 7 dager. Har du ikke meldt deg på, kan du se bort fra denne e-posten.
`;
  return { subject: 'Bekreft ukesbrevet fra tidsrøst', html, text };
}

/**
 * Haftalık bülten. haberler/forklart: { tittel, ingress, url, dato } (url mutlak, UTM'siz).
 * Her alıcıya kendi ayrılma bağlantısı yazılır.
 */
export function bultenEpostasi({ haberler, forklart = [], hafta, belirtec }) {
  const kampanya = `haftalik-${hafta}`;
  const ayril = ayrilmaUrl(belirtec);
  const baslik = `Uke ${haftaNo(hafta)}`;
  const blok = (liste) =>
    liste
      .map(
        (s) => `<p style="margin:0 0 18px 0;"><a href="${esc(utm(s.url, kampanya))}" style="color:#1a1a1a;font-weight:bold;">${esc(s.tittel)}</a><br><span style="font-size:15px;color:#444444;">${esc(s.ingress)}</span></p>`,
      )
      .join('');
  const forklartHtml = forklart.length
    ? `<h2 style="font-size:19px;margin:28px 0 12px 0;">Nye forklaringer</h2>${blok(forklart)}<p style="font-size:15px;"><a href="${esc(utm(`${SITE}/forklart/`, kampanya))}">Se alle forklaringene</a></p>`
    : '';
  const html = sayfa(`
<h1 style="font-size:24px;margin:0 0 12px 0;">Ukens saker</h1>
<p style="font-size:14px;color:#555555;margin:0 0 20px 0;">${esc(baslik)}</p>
${blok(haberler)}
${forklartHtml}
<hr style="border:none;border-top:1px solid #dddddd;margin:28px 0 12px 0;">
<p style="font-size:13px;color:#555555;">Du får denne e-posten fordi du meldte deg på ukesbrevet på tidsrost.com.
<a href="${esc(ayril)}" style="color:#555555;">Meld meg av</a>. Adressen din slettes da med en gang.
Les om hvordan vi behandler personopplysninger på <a href="${esc(utm(`${SITE}/personvern/`, kampanya))}" style="color:#555555;">personvernsiden</a>.</p>`);

  const text = [
    `Ukens saker fra tidsrøst (${baslik})`,
    '',
    ...haberler.flatMap((s) => [s.tittel, s.ingress, utm(s.url, kampanya), '']),
    ...(forklart.length
      ? ['Nye forklaringer', '', ...forklart.flatMap((s) => [s.tittel, s.ingress, utm(s.url, kampanya), '']),`Se alle forklaringene: ${utm(`${SITE}/forklart/`, kampanya)}`, '']
      : []),
    '---',
    `Du får denne e-posten fordi du meldte deg på ukesbrevet på tidsrost.com.`,
    `Meld meg av: ${ayril}`,
    `Personvern: ${utm(`${SITE}/personvern/`, kampanya)}`,
  ].join('\n');

  return { subject: `Ukens saker fra tidsrøst – uke ${haftaNo(hafta)}`, html, text };
}
