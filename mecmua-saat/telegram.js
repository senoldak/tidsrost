// Telegram sırası: sitenin RSS akışındaki gönderilmemiş haberleri kanala tek tek, aralıklı gönderir.
// Worker 10 dakikada bir çağırır; her çağrıda en fazla 1 haber gider, böylece bir vardiyanın (2 saat)
// haberleri vardiyaya yayılır. Gece modunda (Oslo 03:00–07:59) gönderim yok.
// Durum: KV'de "gonderilen" anahtarı ({ slug: zaman }), 7 günden eskiler silinir.
// Kapak: haber sayfasının og:image'ı (Telegram görseli adresinden kendisi indirir).
// Ayarlar (wrangler.jsonc vars): SITE, TELEGRAM_HEDEFLER ("@kanal" ya da "@grup:konu", virgülle), TELEGRAM_ONEK,
// TELEGRAM_BULTEN_HEDEFLER (isteğe bağlı: bülten yazılarının gideceği hedefler; yoksa TELEGRAM_HEDEFLER kullanılır),
// TELEGRAM_BULTEN (isteğe bağlı RegExp: bülten yazısı tespiti için ek kural),
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

// Telegram bağlantısına UTM (utm_source=telegram&utm_medium=social&utm_campaign=<haber|bulten>). Zaten utm_source'u olan adrese dokunmaz.
export function utmLink(url, kampanya) {
  const u = new URL(url);
  if (!u.searchParams.has('utm_source')) {
    u.searchParams.set('utm_source', 'telegram');
    u.searchParams.set('utm_medium', 'social');
    u.searchParams.set('utm_campaign', kampanya);
  }
  return u.href;
}

// kifobu sabah/öğle/akşam/gece bülteni: başlıklar haberlere bağlantılı (HTML). Telegram sınırı görünen metne uygulanır.
export function bultenBaglantilari(html, site) {
  const bas = html.indexOf('<article');
  if (bas < 0) return [];
  // Yalnız sitenin kendi haber bağlantıları: sayfadaki sosyal medya listesi (X, Instagram …) bülten maddesi sayılmaz.
  return [...html.slice(bas).matchAll(/<li[^>]*>\s*<a href="(\/haber\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, m]) => ({
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
    // etiketsiz() bağlantı etiketlerini boşluğa çevirir: "(Ayrıntı)" bağlantısı "( Ayrıntı )" olarak gelir.
    .map(([, l]) => etiketsiz(l).replace(/\s*\(\s*Ayrıntı\s*\)\s*$/i, ''))
    .filter((l) => l.includes(':'))
    .slice(0, 3);
}

export function aciklama({ onek, baslik, metin, link }) {
  const bas = `${onek}${baslik}\n\n`;
  const son = `\n\n🔗 ${link}`;
  const yer = 1024 - bas.length - son.length;
  return `${bas}${metin.length > yer ? `${metin.slice(0, yer - 1).trimEnd()}…` : metin}${son}`;
}

// Kayıt "tamam" (ISO tarih) ya da "vazgeçildi" olduysa haber bir daha denenmez.
const bitmis = (v) => typeof v === 'string' || Boolean(v?.vazgecildi);

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
  const istek = (y, b) =>
    fetch(`https://api.telegram.org/bot${token}/${y}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(b),
    });
  let res = await istek(yol, foto ? { ...govde, photo: foto, caption: metin } : { ...govde, text: metin });
  let j = await res.json().catch(() => ({}));
  // Kapak görseli Telegram'ca çekilemezse (bozuk/erişilemez og:image) haber düz metin olarak gönderilir.
  if (!j.ok && foto) {
    res = await istek('sendMessage', { ...govde, text: metin });
    j = await res.json().catch(() => ({}));
  }
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
    .filter((o) => o.slug && !bitmis(gonderilen[o.slug]) && simdi - o.tarih <= AZAMI_YAS_MS && (!env.TELEGRAM_YALNIZ || env.TELEGRAM_YALNIZ.test(o.slug)))
    .sort((a, b) => a.tarih - b.tarih);
  
  if (sira.length === 0) {
    return `Kuyrukta yeni haber yok (Toplam RSS: ${tumu.length}, Gönderilenler KV: ${Object.keys(gonderilen).length})`;
  }
  // Yalnız bülten gönderen sitede birikmiş eski bültenler art arda gitmez: en yenisi gider, öncekiler atlanmış sayılır.
  if (env.TELEGRAM_YALNIZ && sira.length > 1) {
    for (const eski of sira.slice(0, -1)) gonderilen[eski.slug] = simdi.toISOString();
    sira.splice(0, sira.length - 1);
  }
  const o = sira[0];

  const sayfa = await fetch(o.link);
  if (!sayfa.ok) {
    // Sayfa açılmıyorsa kuyruk başı tıkanmasın: deneme sayılır, 5. denemede bu haber atlanır.
    const d = (typeof gonderilen[o.slug] === 'object' && gonderilen[o.slug]?.deneme || 0) + 1;
    gonderilen[o.slug] = { bitti: [], deneme: d, ...(d >= 5 && { vazgecildi: true }) };
    await env.TELEGRAM_KV.put(ANAHTAR, JSON.stringify(gonderilen));
    return `${o.slug} sayfasına erişilemedi (${sayfa.status}, deneme ${d})`;
  }
  const html = await sayfa.text();
  const bultenMi = Boolean(
    (env.TELEGRAM_BULTEN && env.TELEGRAM_BULTEN.test(o.slug)) ||
    /^(sabah|ogle|aksam|gece)-bulteni-/.test(o.slug) ||
    o.slug.startsWith('piyasa-bulteni')
  );
  // Yalnız indekslenebilir haberler paylaşılır: noindex (kısa haber) sayfası kanala gitmez, bir daha denenmez.
  // Bülten yazılarının indeks durumu bu kuralın dışındadır (bülten sayfaları başka sitelerde de kullanılır).
  if (!bultenMi && /<meta name="robots" content="[^"]*noindex/.test(html)) {
    gonderilen[o.slug] = simdi.toISOString();
    await env.TELEGRAM_KV.put(ANAHTAR, JSON.stringify(gonderilen));
    return `${o.slug}: noindex (kısa haber), kanala gönderilmedi`;
  }
  // Telegram'daki her bağlantıya UTM: bülten ya da haber kampanyası.
  const kampanya = bultenMi ? 'bulten' : 'haber';
  const foto = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  // finfolis piyasa bülteni: ilk 3 madde. kifobu sabah/öğle/akşam/gece bülteni: başlıklar haberlere bağlantılı.
  const baglantilar = /^(sabah|ogle|aksam|gece)-bulteni-/.test(o.slug) ? bultenBaglantilari(html, env.SITE) : [];
  const link = utmLink(o.link, kampanya);
  let ileti;
  if (baglantilar.length) {
    const ogeler = baglantilar.map((b) => ({ ...b, link: utmLink(b.link, kampanya) }));
    ileti = { foto, html: true, metin: bultenAciklamasi({ onek: env.TELEGRAM_ONEK ?? '', baslik: o.baslik, ogeler, link }) };
  } else {
    const maddeler = o.slug.startsWith('piyasa-bulteni') ? bultenMaddeleri(html) : [];
    const metin = maddeler.length ? maddeler.map((m) => `• ${m}`).join('\n') : o.ozet;
    ileti = { foto, metin: aciklama({ onek: env.TELEGRAM_ONEK ?? '', baslik: o.baslik, metin, link }) };
  }

  const hedefDizesi = (bultenMi && env.TELEGRAM_BULTEN_HEDEFLER) ? env.TELEGRAM_BULTEN_HEDEFLER : env.TELEGRAM_HEDEFLER;

  // Her hedef ayrı takip edilir: biri gitmişse diğerine yeniden gönderilmez, eksik hedef sonraki turda denenir.
  // KV'de kayıt iki biçimde: ISO tarih (tamamı gitti) ya da { bitti: [hedef], deneme } (kısmi / denenen).
  const kayit = gonderilen[o.slug];
  const bitti = new Set(typeof kayit === 'object' && kayit ? kayit.bitti : []);
  const deneme = (typeof kayit === 'object' && kayit ? kayit.deneme : 0) + 1;
  const hatalar = [];
  for (const h of hedefler(hedefDizesi)) {
    const etiket = h.konu ? `${h.chat}:${h.konu}` : h.chat;
    if (bitti.has(etiket)) continue;
    try {
      await gonder(token, h, ileti);
      bitti.add(etiket);
    } catch (e) {
      hatalar.push(`${etiket}: ${e.message}`);
    }
  }
  const hepsi = hedefler(hedefDizesi).every((h) => bitti.has(h.konu ? `${h.chat}:${h.konu}` : h.chat));
  // Telegram'ın kalıcı olarak reddettiği haber (ör. yanlış kanal) kuyruğu sonsuza dek tıkamasın: en fazla 5 deneme.
  if (hepsi || deneme >= 5) {
    gonderilen[o.slug] = hepsi ? simdi.toISOString() : { bitti: [...bitti], deneme, vazgecildi: true };
  } else {
    gonderilen[o.slug] = { bitti: [...bitti], deneme };
  }
  for (const [s, t] of Object.entries(gonderilen)) if (typeof t === 'string' && simdi - new Date(t) > SAKLA_MS) delete gonderilen[s];
  await env.TELEGRAM_KV.put(ANAHTAR, JSON.stringify(gonderilen));
  if (hepsi) return `Başarıyla gönderildi: ${o.slug} -> ${hedefDizesi}`;
  if (deneme >= 5) return `Vazgeçildi (5 deneme): ${o.slug}: ${hatalar.join('; ')}`;
  throw new Error(`Gönderilemedi (deneme ${deneme}): ${hatalar.join('; ')}`);
}
