// Ren validering for POST /api/nyttig (testes i valider.test.mjs).
export const MAKS_BYTES = 1024;
const SLUG = /^[a-z0-9-]{1,160}$/;

// Returnerer { ok: true, slug, svar } eller { ok: false }.
export function validerSvar(tekst, contentType) {
  if (!/^application\/json(\s*;|$)/i.test(String(contentType || ''))) return { ok: false };
  if (typeof tekst !== 'string' || new TextEncoder().encode(tekst).length > MAKS_BYTES) return { ok: false };
  let d;
  try {
    d = JSON.parse(tekst);
  } catch {
    return { ok: false };
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false };
  if (typeof d.slug !== 'string' || !SLUG.test(d.slug)) return { ok: false };
  if (d.svar !== 'ja' && d.svar !== 'nei') return { ok: false };
  return { ok: true, slug: d.slug, svar: d.svar };
}

// Dagen etter Oslo-tid, ÅÅÅÅ-MM-DD.
export function osloDag(dato = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dato);
}
