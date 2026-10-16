// tidsrost Worker'ı: /api/bulten/* uç noktaları ve haftalık ukesbrev (bkz. worker/bulten.mjs).
// Statik site (dist/) ASSETS üzerinden sunulur; wrangler.jsonc'de run_worker_first yalnız /api/* içindir.
import { planla, yonlendirIstek } from './bulten.mjs';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  BULTEN_GONDEREN: string;
  GOREV_ANAHTARI?: string; // Worker secret; mecmua-saat ile ortak
}

// Günlük bülten görevi mecmua-saat Worker'ından service binding ile tetiklenir (POST /api/bulten/gorev).
// Cloudflare ücretsiz planında hesap başına 5 cron sınırı olduğu için sitelerin kendi cron'u yok.
// İstek GOREV_ANAHTARI Worker secret'ı ile doğrulanır; anahtar yoksa uç nokta kapalıdır.
async function gorevYetkili(istek: Request, anahtar?: string): Promise<boolean> {
  if (!anahtar || istek.method !== 'POST') return false;
  if (new URL(istek.url).pathname.replace(/\/+$/, '') !== '/api/bulten/gorev') return false;
  const gelen = new TextEncoder().encode(istek.headers.get('Authorization') ?? '');
  const beklenen = new TextEncoder().encode('Bearer ' + anahtar);
  if (gelen.byteLength !== beklenen.byteLength) return false;
  return (crypto.subtle as any).timingSafeEqual(gelen, beklenen);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (await gorevYetkili(request, env.GOREV_ANAHTARI)) {
      const sonuc = await planla({ cron: 'mecmua-saat' }, env);
      console.log('bulten: ' + sonuc);
      return new Response(String(sonuc), { headers: { 'Cache-Control': 'no-store' } });
    }
    const yol = new URL(request.url).pathname;
    if (yol.startsWith('/api/')) return yonlendirIstek(request, env);
    return env.ASSETS.fetch(request);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      planla(event, env).then(
        (sonuc) => console.log(`bulten: ${sonuc}`),
        (e) => console.error('bulten: zamanlanmış görev hatası', e?.name ?? 'bilinmeyen'),
      ),
    );
  },
};
