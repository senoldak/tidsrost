// Telegram sırası: sitenin RSS akışındaki gönderilmemiş haberleri kanala tek tek, aralıklı gönderir.
// Worker 10 dakikada bir çağırır; her çağrıda en fazla 1 haber gider, böylece bir vardiyanın (2 saat)
// haberleri vardiyaya yayılır. Gece modunda (Oslo 03:00–07:59) gönderim yok.
// Durum: KV'de "gonderilen" anahtarı ({ slug: zaman }), 7 günden eskiler silinir.
// Kapak: haber sayfasının og:image'ı (Telegram görseli adresinden kendisi indirir).
// Ayarlar (wrangler.jsonc vars): SITE, TELEGRAM_HEDEFLER ("@kanal" ya da "@grup:konu", virgülle), TELEGRAM_ONEK,
// TELEGRAM_YALNIZ (isteğe bağlı RegExp: yalnız slug'ı buna uyan yazılar gider; kifobu'da günün bültenleri; gece modu uygulanmaz).
// Gizli: TELEGRAM_BOT_TOKEN. Yoksa sessizce atlanır.

const ANAHTAR = 'gonderilen';
const AZAMI_YAS_MS = 24 * 3600e3; // bundan eski haber kanala gönderilmez
const SAKLA_MS = 7 * 24 * 3600e3;

const varlik = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();

export function rssOgeleri(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, i]) => {
    const alan = (a) => varlik(i.match(new RegExp(`<${a}>([\\s\\S]*?)</${a}>`))?.[1] ?? '');
    const link = alan('link');
    return { baslik: alan('title'), ozet: alan('description'), link, slug: link.split('/').filter(Boolean).pop(), tarih: new Date(alan('pubDate')) };
  });
}

const kacis = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// kifobu sabah/öğle/akşam/gece bülteni: başlıklar haberlere bağlantılı (HTML). Telegram sınırı görünen metne uygulanır.
export function bultenBaglantilari(html, site) {
  const bas = html.indexOf('<article');
  if (bas < 0) return [];
  return [...html.slice(bas).matchAll(/<li[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, m]) => ({
    link: new URL(varlik(href), site).href,
    baslik: etiketsiz(m),
  }));
}

export function bultenAciklamasi({ onek, baslik, ogeler, link }) {
  const bas = `${onek}${baslik}\n\n`;
  const son = `\n\n🔗 ${link}`;
  let gorunen = bas.length + son.length;
  const satirlar = [];
  for (const o of ogeler) {
    const satir = `• ${o.baslik}`;
    if (gorunen + satir.length + 1 > 1000) break;
    gorunen += satir.length + 1;
    satirlar.push(`• <a href="${kacis(o.link)}">${kacis(o.baslik)}</a>`);
  }
  if (satirlar.length < ogeler.length) satirlar.push('…');
  return `${kacis(bas)}${satirlar.join('\n')}${kacis(son)}`;
}

const etiketsiz = (s) => varlik(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Bülten sayfasından ilk 3 madde (Göstergeler bölümünden önce); yoksa boş.
export function bultenMaddeleri(html) {
  const bas = html.indexOf('<article');
  if (bas < 0) return [];
  let govde = html.slice(bas);
  const g = govde.search(/<h2[^>]*>\s*Göstergeler/);
  if (g > 0) govde = govde.slice(0, g);
  return [...govde.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
    .map(([, l]) => etiketsiz(l).replace(/\s*\(Ayrıntı\)\s*$/, ''))
    .filter((l) => l.includes(':'))
    .slice(0, 3);
}

export function aciklama({ onek, baslik, metin, link }) {
  const bas = `${onek}${baslik}\n\n`;
  const son = `\n\n🔗 ${link}`;
  const yer = 1024 - bas.length - son.length;
  return `${bas}${metin.length > yer ? `${metin.slice(0, yer - 1).trimEnd()}…` : metin}${son}`;
}

const hedefler = (s) =>
  String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [chat, konu] = x.split(':');
      return { chat: chat.trim(), konu: konu?.trim() };
    });

async function gonder(token, hedef, { foto, metin, html }) {
  const govde = { chat_id: hedef.chat, ...(hedef.konu && { message_thread_id: Number(hedef.konu) }), ...(html && { parse_mode: 'HTML' }) };
  const yol = foto ? 'sendPhoto' : 'sendMessage';
  const res = await fetch(`https://api.telegram.org/bot${token}/${yol}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(foto ? { ...govde, photo: foto, caption: metin } : { ...govde, text: metin }),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${hedef.chat}: ${j.description ?? res.status}`);
}

export async function telegramSirasi(env, simdi = new Date()) {
  const token = String(env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!token) return 'HATA: TELEGRAM_BOT_TOKEN yok';
  if (!env.TELEGRAM_KV) return 'HATA: TELEGRAM_KV bağlı değil';
  const osloSaat = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(simdi));
  if (!env.TELEGRAM_YALNIZ && osloSaat >= 3 && osloSaat < 8) return `Gece modu (${osloSaat}:00 Oslo), gönderim yapılmadı`;

  const gonderilen = (await env.TELEGRAM_KV.get(ANAHTAR, 'json')) ?? {};
  const rssRes = await fetch(`${env.SITE}/rss.xml`, { headers: { 'cache-control': 'no-cache' } });
  if (!rssRes.ok) throw new Error(`RSS ${rssRes.status}: ${env.SITE}/rss.xml`);
  const tumu = rssOgeleri(await rssRes.text());
  const sira = tumu
    .filter((o) => o.slug && !gonderilen[o.slug] && simdi - o.tarih <= AZAMI_YAS_MS && (!env.TELEGRAM_YALNIZ || env.TELEGRAM_YALNIZ.test(o.slug)))
    .sort((a, b) => a.tarih - b.tarih);
  
  if (sira.length === 0) {
    return `Kuyrukta yeni haber yok (Toplam RSS: ${tumu.length}, Gönderilenler KV: ${Object.keys(gonderilen).length})`;
  }
  const o = sira[0];

  const sayfa = await fetch(o.link);
  if (!sayfa.ok) return `${o.slug} sayfasına erişilemedi (${sayfa.status})`;
  const html = await sayfa.text();
  const foto = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  // finfolis piyasa bülteni: ilk 3 madde. kifobu sabah/öğle/akşam/gece bülteni: başlıklar haberlere bağlantılı.
  const baglantilar = /^(sabah|ogle|aksam|gece)-bulteni-/.test(o.slug) ? bultenBaglantilari(html, env.SITE) : [];
  let ileti;
  if (baglantilar.length) {
    ileti = { foto, html: true, metin: bultenAciklamasi({ onek: env.TELEGRAM_ONEK ?? '', baslik: o.baslik, ogeler: baglantilar, link: o.link }) };
  } else {
    const maddeler = o.slug.startsWith('piyasa-bulteni') ? bultenMaddeleri(html) : [];
    const metin = maddeler.length ? maddeler.map((m) => `• ${m}`).join('\n') : o.ozet;
    ileti = { foto, metin: aciklama({ onek: env.TELEGRAM_ONEK ?? '', baslik: o.baslik, metin, link: o.link }) };
  }

  let basarili = false;
  const hatalar = [];
  for (const h of hedefler(env.TELEGRAM_HEDEFLER)) {
    try {
      await gonder(token, h, ileti);
      basarili = true;
    } catch (e) {
      hatalar.push(`${h.chat}: ${e.message}`);
    }
  }
  if (basarili) {
    gonderilen[o.slug] = simdi.toISOString();
    for (const [s, t] of Object.entries(gonderilen)) if (simdi - new Date(t) > SAKLA_MS) delete gonderilen[s];
    await env.TELEGRAM_KV.put(ANAHTAR, JSON.stringify(gonderilen));
    return `Başarıyla gönderildi: ${o.slug} -> ${env.TELEGRAM_HEDEFLER}`;
  }
  throw new Error(`Gönderilemedi: ${hatalar.join('; ')}`);
}
