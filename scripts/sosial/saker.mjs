// Facebook/Instagram'a gidecek haberler ve paylaşım metni (sahibin kararı 2026-10-18: her tam haber post + story).
// Seçim kuralı Telegram'la aynı: taslak değil, yayın saati gelmiş, son PENCERE içinde ve arama motorlarına açık
// (çok kısa haberler noindex'tir ve paylaşılmaz). Metinde bağlantı yok; kaynak/haber sitesi adı eklenmez.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { indekserbar } from '../../src/lib/ordtelling.mjs';

export const DIZIN = 'src/content/haberler';
export const SITE = 'https://tidsrost.com';
export const PENCERE_MS = 24 * 3600e3;

const KATEGORI_ETIKET = { innenriks: 'innenriks', utenriks: 'utenriks', okonomi: 'økonomi', sport: 'sport', kultur: 'kultur', teknologi: 'teknologi' };

/** Markdown dosyasından haber kaydı; frontmatter yoksa null. */
export function sakOku(id, md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = parse(m[1]) ?? {};
  return {
    id,
    tittel: fm.title,
    ingress: fm.description ?? '',
    punkter: Array.isArray(fm.key_points) ? fm.key_points : [],
    kategori: fm.category,
    forfatter: fm.author,
    sjanger: fm.sjanger,
    dato: new Date(fm.date),
    taslak: fm.draft === true,
    // Editoryal kapak değilse (harita, grafik) sosyal görselde üstte kullanılır.
    gorselKapak: fm.cover === './cover.png' && fm.coverKreditt !== 'Illustrasjon: tidsrøst',
    indeks: indekserbar(m[2]),
  };
}

/** Paylaşılabilir mi: yayında, pencerenin içinde, tam haber. */
export const paylasilir = (s, simdi = Date.now(), pencere = PENCERE_MS) =>
  Boolean(s && !s.taslak && s.indeks && s.tittel && s.dato.getTime() <= simdi && s.dato.getTime() > simdi - pencere);

export async function sakerOku(dizin = DIZIN) {
  const out = [];
  for (const f of await readdir(dizin, { recursive: true })) {
    if (!f.endsWith('index.md')) continue;
    const id = path.dirname(f).split(path.sep).join('/');
    const s = sakOku(id, await readFile(path.join(dizin, f), 'utf8'));
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.dato - b.dato || a.id.localeCompare(b.id));
}

/** Instagram/Facebook açıklaması: başlık, özet, ana noktalar, yönlendirme, etiketler. Bağlantı yok. */
export function bildetekst(s) {
  const satirlar = [s.tittel, '', s.ingress];
  if (s.punkter.length) satirlar.push('', ...s.punkter.slice(0, 3).map((p) => `• ${p}`));
  satirlar.push('', 'Les hele saken på tidsrost.com', '', ['#nyheter', '#norge', KATEGORI_ETIKET[s.kategori] && `#${KATEGORI_ETIKET[s.kategori]}`].filter(Boolean).join(' '));
  return satirlar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Yayında servis edilen görsellerin adı (bilder.mjs üretir, public/sosial/). */
export const bildeFil = (id, bicim) => `${id.replace(/\//g, '-')}-${bicim}.png`;
export const bildeUrl = (id, bicim) => `${SITE}/sosial/${bildeFil(id, bicim)}`;
