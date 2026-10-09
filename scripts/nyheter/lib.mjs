// Haber botu için ortak yardımcılar: indirme, RSS okuma, HTML temizleme, Gemini, dosya yazma.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

export const USER_AGENT = 'tidsrost-nyhetsbot/1.0 (+https://github.com/senoldak/tidsrost)';

export const KATEGORIER = ['innenriks', 'utenriks', 'okonomi', 'sport', 'kultur', 'teknologi'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function hentTekst(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

export async function hentJson(url, headers = {}) {
  return JSON.parse(await hentTekst(url, { Accept: 'application/json', ...headers }));
}

// HTML varlıklarını (&#xE5; &amp; vb.) çözer.
export function decodeEntities(s = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', ndash: '–', mdash: '—', hellip: '…' };
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

// HTML'i paragraflı düz metne çevirir.
export function htmlTilTekst(html = '') {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|div)>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Basit RSS okuyucu: sadece ihtiyacımız olan alanlar.
export function lesRss(xml) {
  const felt = (item, tag) => {
    const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? decodeEntities(m[1]).trim() : '';
  };
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([item]) => ({
    guid: felt(item, 'guid'),
    title: felt(item, 'title'),
    link: felt(item, 'link'),
    description: felt(item, 'description'),
    pubDate: felt(item, 'pubDate'),
  }));
}

// Sveltia CMS ile aynı mantıkta ASCII slug.
export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

// Oslo saatine göre tarih (ör. 2026-10-10T08:15:00+02:00).
export function osloIso(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((x) => [x.type, x.value]),
  );
  const lokal = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMin = Math.round((lokal - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${hh}:${mm}`;
}

export const norskDato = (date, opts = {}) =>
  date.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', ...opts });

// Gemini'ye istek atar, JSON şemasına uygun yanıt döner.
export async function gemini({ prompt, schema }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Düşünme seviyesini düşük tutmak cevabı çok hızlandırıyor; desteklemeyen modelde kapatılır.
  let tenkning = { thinkingLevel: 'low' };
  for (let forsok = 1; forsok <= 3; forsok++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: schema,
          ...(tenkning && { thinkingConfig: tenkning }),
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (res.status === 400 && tenkning && /thinking/i.test(await res.clone().text())) {
      tenkning = null;
      forsok--;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      console.warn(`  Gemini ${res.status}, ${forsok}. deneme; bekleniyor...`);
      await sleep(20_000 * forsok);
      continue;
    }
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw.slice(0, 300);
      try {
        msg = JSON.parse(raw).error?.message ?? msg;
      } catch {}
      const feil = new Error(`Gemini ${res.status}: ${msg}`);
      // Anahtar/model hatası: haberin suçu değil, haber atlanmamalı.
      feil.konfig = [400, 401, 403, 404].includes(res.status);
      throw feil;
    }
    const data = await res.json();
    const tekst = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return JSON.parse(tekst);
  }
  throw new Error('Gemini: çok fazla deneme');
}

// YAML'da güvenli çift tırnaklı metin.
const yamlStr = (s) => JSON.stringify(String(s));

// Haberi src/content/haberler/<slug>/index.md olarak yazar, slug'ı döner.
export async function skrivSak(rot, sak) {
  const base = path.join(rot, 'src/content/haberler');
  let slug = slugify(sak.title) || 'sak';
  for (let i = 2; ; i++) {
    try {
      await access(path.join(base, slug));
      slug = `${slugify(sak.title)}-${i}`;
    } catch {
      break;
    }
  }
  const fm = [
    '---',
    `title: ${yamlStr(sak.title)}`,
    `description: ${yamlStr(sak.description)}`,
    `date: ${sak.date}`,
    `category: ${sak.category}`,
    sak.breaking ? 'breaking: true' : null,
    sak.draft ? 'draft: true' : null,
    `produksjon: ${sak.produksjon}`,
    '---',
  ].filter(Boolean);
  // Üretim şekli notu sayfada ayrıca gösterilir; burada sadece kaynak (VVP 3.1).
  const kilde = `*Kilde: [${sak.kilde.navn}](${sak.kilde.url})${sak.kilde.lisens ? ` (${sak.kilde.lisens})` : ''}*`;
  const innhold = `${fm.join('\n')}\n\n${sak.body.trim()}\n\n${kilde}\n`;
  await mkdir(path.join(base, slug), { recursive: true });
  await writeFile(path.join(base, slug, 'index.md'), innhold, 'utf8');
  return slug;
}

export async function lesJsonFil(fil, fallback) {
  try {
    return JSON.parse(await readFile(fil, 'utf8'));
  } catch {
    return fallback;
  }
}
