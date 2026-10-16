// tidsrost Worker'ı: /api/bulten/* uç noktaları ve haftalık ukesbrev (bkz. worker/bulten.mjs).
// Statik site (dist/) ASSETS üzerinden sunulur; wrangler.jsonc'de run_worker_first yalnız /api/* içindir.
import { planla, yonlendirIstek } from './bulten.mjs';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  BULTEN_GONDEREN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
