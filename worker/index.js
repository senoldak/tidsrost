// Worker: bare POST /api/nyttig («Var saken nyttig?») håndteres her; alt annet går til de statiske filene.
// Lagrer kun en anonym telling per dag, sak og svar. Ingen IP, ingen headere, ingen informasjonskapsler.
import { validerSvar, osloDag } from './valider.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/nyttig') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const lengde = Number(request.headers.get('content-length') || 0);
    if (lengde > 1024) return new Response(null, { status: 400 });
    const v = validerSvar(await request.text(), request.headers.get('content-type'));
    if (!v.ok) return new Response(null, { status: 400 });
    // Kun publiserte saker telles: tilfeldige slugger skal ikke kunne fylle D1 og kontoens skrivekvote.
    const side = await env.ASSETS.fetch(new Request(new URL(`/artikkel/${v.slug}/`, url)));
    if (side.status !== 200) return new Response(null, { status: 404 });
    await env.DB.prepare(
      'INSERT INTO svar (dag, slug, svar, antall) VALUES (?1, ?2, ?3, 1) ON CONFLICT(dag, slug, svar) DO UPDATE SET antall = antall + 1',
    )
      .bind(osloDag(), v.slug, v.svar)
      .run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  },
};
