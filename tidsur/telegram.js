// Telegram sırası: sitenin RSS akışındaki gönderilmemiş haberleri kanala tek tek, aralıklı gönderir.
// Worker 10 dakikada bir çağırır; her çağrıda en fazla 1 haber gider, böylece bir vardiyanın (2 saat)
// haberleri vardiyaya yayılır. Gece modunda (Oslo 03:00–07:59) gönderim yok.
// Durum: KV'de "gonderilen" anahtarı ({ slug: zaman }), 7 günden eskiler silinir.
// Kapak: haber sayfasının og:image'ı (Telegram görseli adresinden kendisi indirir).
// Ayarlar (wrangler.jsonc vars): SITE, TELEGRAM_HEDEFLER ("@kanal" ya da "@grup:konu", virgülle), TELEGRAM_ONEK.
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

async function gonder(token, hedef, { foto, metin }) {
  const govde = { chat_id: hedef.chat, ...(hedef.konu && { message_thread_id: Number(hedef.konu) }) };
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
  if (!token || !env.TELEGRAM_KV) return console.log('Telegram: token ya da KV yok, atlandı');
  const osloSaat = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(simdi));
  if (osloSaat >= 3 && osloSaat < 8) return; // gece modu

  const gonderilen = (await env.TELEGRAM_KV.get(ANAHTAR, 'json')) ?? {};
  const rss = await fetch(`${env.SITE}/rss.xml`, { headers: { 'cache-control': 'no-cache' } });
  if (!rss.ok) throw new Error(`RSS ${rss.status}`);
  const sira = rssOgeleri(await rss.text())
    .filter((o) => o.slug && !gonderilen[o.slug] && simdi - o.tarih <= AZAMI_YAS_MS)
    .sort((a, b) => a.tarih - b.tarih); // eskiden yeniye: kanalda sıra doğru görünsün
  const o = sira[0];
  if (!o) return;

  const sayfa = await fetch(o.link);
  if (!sayfa.ok) return console.log(`Telegram: ${o.slug} henüz yayında değil (${sayfa.status})`);
  const html = await sayfa.text();
  const foto = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const maddeler = bultenMaddeleri(html);
  const metin = o.slug.startsWith('piyasa-bulteni') && maddeler.length ? maddeler.map((m) => `• ${m}`).join('\n') : o.ozet;
  const ileti = { foto, metin: aciklama({ onek: env.TELEGRAM_ONEK ?? '', baslik: o.baslik, metin, link: o.link }) };

  let basarili = false;
  for (const h of hedefler(env.TELEGRAM_HEDEFLER)) {
    try {
      await gonder(token, h, ileti);
      basarili = true;
    } catch (e) {
      console.error(e.message);
    }
  }
  // En az bir hedefe gittiyse gönderildi sayılır (biri sürekli hata verirse kuyruk tıkanmasın).
  if (basarili) {
    gonderilen[o.slug] = simdi.toISOString();
    for (const [s, t] of Object.entries(gonderilen)) if (simdi - new Date(t) > SAKLA_MS) delete gonderilen[s];
    await env.TELEGRAM_KV.put(ANAHTAR, JSON.stringify(gonderilen));
    console.log(`Telegram: + ${o.slug} (kuyrukta ${sira.length - 1} kaldı)`);
  }
}
