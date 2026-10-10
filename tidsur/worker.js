// tidsur: haber botunu (GitHub Actions, nyheter.yml) zamanında çalıştıran Cloudflare Worker.
// GitHub'ın kendi zamanlayıcısı çalışmaları geciktiriyor ya da atlıyor; Cloudflare'in cron'u dakikasında çalışır.
// Kurulum: tidsur/README.md. Sitenin Worker'ından ayrıdır; siteye dokunmaz.
//
// Gizli değişken: GITHUB_TOKEN — sadece senoldak/tidsrost, izin: Actions (Read and write).

const DISPATCH = 'https://api.github.com/repos/senoldak/tidsrost/actions/workflows/nyheter.yml/dispatches';

export default {
  async scheduled(event, env) {
    const res = await fetch(DISPATCH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tidsrost-tidsur',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    // Hata Cloudflare'de Worker'ın "Logs" sekmesinde görünür.
    if (res.status !== 204) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
    console.log(`Nyhetsbot startet (${event.cron})`);
  },
};
