// tidsur: haber botunu (GitHub Actions, nyheter.yml) zamanında çalıştıran Cloudflare Worker.
// GitHub'ın kendi zamanlayıcısı çalışmaları geciktiriyor ya da atlıyor; Cloudflare'in cron'u dakikasında çalışır.
// Kurulum: tidsur/README.md. Sitenin Worker'ından ayrıdır; siteye dokunmaz.
//
// Gizli değişken: GITHUB_TOKEN — sadece senoldak/tidsrost, izin: Actions (Read and write).

// Üç sitenin ortak yayın planı (Oslo saati): çift saatler 08–02, 03:00–07:59 gece modu.
// tidsrost :00'da, kifobu :20'de, finfolis :40'ta başlar; botlar aynı anda çalışmaz.
const YAYIN_SAATLERI = [8, 10, 12, 14, 16, 18, 20, 22, 0, 2];

const DISPATCH = 'https://api.github.com/repos/senoldak/tidsrost/actions/workflows/nyheter.yml/dispatches';

export default {
  async scheduled(event, env) {
    // Cron her saat başı (UTC) çalışır; bot sadece YAYIN_SAATLERI'nde (Oslo saati) başlar.
    // Böylece yaz/kış saati değişince de saatler kaymaz.
    const osloSaat = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(event.scheduledTime)));
    if (!YAYIN_SAATLERI.includes(osloSaat)) return;
    // Panele/terminale yapıştırırken token'a satır sonu, boşluk ya da "Bearer " eklenebiliyor;
    // bu durumda GitHub başlığı bozuk sayıp gövdesiz 400 döner.
    const token = String(env.GITHUB_TOKEN ?? '').replace(/^\s*(Bearer|token)\s+/i, '').replace(/\s+/g, '');
    // Terminalde Ctrl+V bazen yapıştırmaz, Ctrl+V karakterini (kod 22) kaydeder; gerçek token 40+ karakterdir.
    if (token.length < 20) throw new Error(`GITHUB_TOKEN geçersiz (${token.length} karakter); wrangler secret put ile yeniden girin`);
    const res = await fetch(DISPATCH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tidsrost-tidsur',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    // Hata Cloudflare'de Worker'ın "Logs" sekmesinde görünür.
    if (res.status !== 204) throw new Error(`GitHub ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300) || "(boş yanıt)"}`);
    console.log(`Nyhetsbot startet (${event.cron})`);
  },
};
