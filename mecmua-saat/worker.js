// mecmua-saat: üç sitenin (tidsrost, kifobu, finfolis) zamanlayıcısı tek Worker'da.
// Cloudflare ücretsiz paketinde hesap başına 5 cron hakkı var; üç ayrı Worker yerine bu tek Worker 1 hak kullanır.
// Eski Worker'lar: tidsrost/tidsur, kifobu/saat (HTTP tetikleme için duruyor, cron'u yok), finfolis/saat.
//
// Gizli değişkenler (npx wrangler secret put AD):
//   GITHUB_TOKEN_TIDSROST, GITHUB_TOKEN_KIFOBU, GITHUB_TOKEN_FINFOLIS — ilgili repo, izin: Actions (Read and write).
//     Üç repoya da yetkili tek token varsa sadece GITHUB_TOKEN yeterli.
//   TELEGRAM_BOT_TOKEN_TIDSROST, TELEGRAM_BOT_TOKEN_KIFOBU, TELEGRAM_BOT_TOKEN_FINFOLIS — yoksa TELEGRAM_BOT_TOKEN.

// Üç sitenin ortak yayın planı (Oslo saati): çift saatler 08–02, 03:00–07:59 gece modu.
// tidsrost :00'da, kifobu :20'de, finfolis :40'ta başlar; botlar aynı anda çalışmaz.
const YAYIN_SAATLERI = [8, 10, 12, 14, 16, 18, 20, 22, 0, 2];

import { telegramSirasi } from './telegram.js';

const SITELER = [
  { ad: 'tidsrost', repo: 'senoldak/tidsrost', bot: 'nyheter.yml', dakika: 0, site: 'https://tidsrost.com', hedefler: '@tidsrost', onek: '', kv: 'KV_TIDSROST' },
  { ad: 'kifobu', repo: 'senoldak/kifobu', bot: 'bot.yml', dakika: 20, site: 'https://kifobu.com', hedefler: '@kifobu,@fundov:24358', onek: '📰 ', kv: 'KV_KIFOBU' },
  { ad: 'finfolis', repo: 'senoldak/finfolis', bot: 'haberler.yml', dakika: 40, site: 'https://finfolis.com', hedefler: '@finfolis', onek: '🧮 ', kv: 'KV_FINFOLIS' },
];

const gizli = (env, ad, site) => env[`${ad}_${site.toUpperCase()}`] ?? env[ad];

async function tetikle(s, env, inputs) {
  // Panele/terminale yapıştırırken token'a satır sonu, boşluk ya da "Bearer " eklenebiliyor.
  const token = String(gizli(env, 'GITHUB_TOKEN', s.ad) ?? '').replace(/^\s*(Bearer|token)\s+/i, '').replace(/\s+/g, '');
  if (token.length < 20) throw new Error(`GITHUB_TOKEN_${s.ad.toUpperCase()} geçersiz (${token.length} karakter)`);
  const dosya = inputs ? 'bulten-otomasyon.yml' : s.bot;
  const res = await fetch(`https://api.github.com/repos/${s.repo}/actions/workflows/${dosya}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mecmua-saat' },
    body: JSON.stringify({ ref: 'main', ...(inputs && { inputs }) }),
  });
  if (res.status !== 204) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300) || '(boş yanıt)'}`);
  console.log(`${s.ad}: ${dosya} başlatıldı${inputs ? ` (${inputs.mod})` : ''}`);
}

async function site(s, env, zaman) {
  const oslo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(zaman);
  const osloSaat = Number(oslo.find((p) => p.type === 'hour').value);
  const haftaIci = !['Sat', 'Sun'].includes(oslo.find((p) => p.type === 'weekday').value);
  const dakika = zaman.getUTCMinutes();
  const isler = [
    telegramSirasi(
      { SITE: s.site, TELEGRAM_HEDEFLER: s.hedefler, TELEGRAM_ONEK: s.onek, TELEGRAM_BOT_TOKEN: gizli(env, 'TELEGRAM_BOT_TOKEN', s.ad), TELEGRAM_KV: env[s.kv] },
      zaman,
    ).catch((e) => console.error(`${s.ad} Telegram: ${e.message}`)),
  ];
  // Haber botu: kendi dakikasında, YAYIN_SAATLERI'nde (Oslo saati; yaz/kış saatinde kaymaz).
  if (dakika === s.dakika && YAYIN_SAATLERI.includes(osloSaat)) isler.push(tetikle(s, env));
  // kifobu bülteni: :00'da, hafta içi. Canlı 09:00–16:00, kapanış 17:00 (Oslo).
  if (s.ad === 'kifobu' && dakika === 0 && haftaIci) {
    if (osloSaat >= 9 && osloSaat <= 16) isler.push(tetikle(s, env, { mod: 'canli' }));
    else if (osloSaat === 17) isler.push(tetikle(s, env, { mod: 'kapanis' }));
  }
  for (const r of await Promise.allSettled(isler)) if (r.status === 'rejected') console.error(`${s.ad}: ${r.reason?.message}`);
}

export default {
  // Cron 10 dakikada bir (UTC). Siteler birbirinden bağımsız işlenir; biri hata verirse öbürleri etkilenmez.
  async scheduled(event, env, ctx) {
    const zaman = new Date(event.scheduledTime);
    ctx.waitUntil(Promise.allSettled(SITELER.map((s) => site(s, env, zaman))));
  },
};
