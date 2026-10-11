// Yeni sakları Telegram kanalına kapak resmiyle gönderir (finfolis/scripts/haberler/telegram.mjs'in karşılığı).
// Kullanım: node scripts/nyheter/telegram.mjs
// Ortam değişkenleri: TELEGRAM_BOT_TOKEN (secret), TELEGRAM_KANAL (ör. @tidsrost; repo değişkeni). Eksikse sessizce atlanır.
// Bir sak ancak sitede yayına girdikten sonra gönderilir (bağlantı 200 dönmeli), kanala kırık link gitmez.
// Mesajda yalnızca başlık, ingress ve tidsrøst bağlantısı vardır; kaynak ya da medya adı yoktur.
import path from 'node:path';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const TILSTAND = path.join(HER, 'telegram-sendt.json');
const SITE = 'https://tidsrost.com';
const MAKS = 10; // bir çalıştırmada kanala en fazla bu kadar sak
const VENT_MS = 20_000;
const MAKS_VENT = 8 * 60_000;

// Frontmatter'dan basit alanlar (title, description, date, draft, cover); yaml paketine gerek yok.
export function lesFrontmatter(md) {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!fm) return null;
  const felt = (n) => {
    const v = fm.match(new RegExp(`^${n}:\\s*(.*)$`, 'm'))?.[1]?.trim();
    if (v === undefined) return undefined;
    try {
      return v.startsWith('"') ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  };
  return { title: felt('title'), description: felt('description'), date: felt('date'), draft: felt('draft') === 'true', cover: felt('cover') };
}

// Telegram bildirimi (fotoğraf altı en fazla 1024 karakter).
export function tekst({ tittel, ingress, slug }) {
  const lenke = `${SITE}/artikkel/${slug}/`;
  const topp = `${tittel}\n\n`;
  const bunn = `\n\n🔗 ${lenke}`;
  const plass = 1024 - topp.length - bunn.length;
  const ing = (ingress ?? '').length > plass ? `${ingress.slice(0, plass - 1).trimEnd()}…` : ingress ?? '';
  return `${topp}${ing}${bunn}`;
}

export async function lesSaker(rot = ROT) {
  const base = path.join(rot, 'src/content/haberler');
  const saker = [];
  for (const d of await readdir(base, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const md = await readFile(path.join(base, d.name, 'index.md'), 'utf8').catch(() => null);
    const v = md && lesFrontmatter(md);
    if (!v?.title || v.draft) continue;
    saker.push({ slug: d.name, tittel: v.title, ingress: v.description, tid: new Date(v.date), bilde: v.cover ? path.join(base, d.name, v.cover) : null });
  }
  return saker.sort((a, b) => b.tid - a.tid);
}

// Sendes: aldri sendte, de nyeste MAKS, eldst først (riktig rekkefølge i kanalen).
export const velg = (saker, sendt, maks = MAKS) => saker.filter((s) => !sendt[s.slug]).slice(0, maks).reverse();

async function publisert(slug) {
  const slutt = Date.now() + MAKS_VENT;
  while (Date.now() < slutt) {
    const r = await fetch(`${SITE}/artikkel/${slug}/`, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) return true;
    await new Promise((c) => setTimeout(c, VENT_MS));
  }
  return false;
}

async function send(token, kanal, s) {
  const caption = tekst(s);
  const harBilde = s.bilde && (await access(s.bilde).then(() => true, () => false));
  let res;
  if (harBilde) {
    const form = new FormData();
    form.append('chat_id', kanal);
    form.append('caption', caption);
    form.append('photo', new Blob([await readFile(s.bilde)], { type: 'image/png' }), `${s.slug}.png`);
    res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  } else {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: kanal, text: caption }),
    });
  }
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.description ?? `HTTP ${res.status}`);
}

async function kjor() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = process.env.TELEGRAM_KANAL;
  if (!token || !kanal) return console.log('[telegram] TELEGRAM_BOT_TOKEN eller TELEGRAM_KANAL mangler; hopper over.');
  const sendt = JSON.parse(await readFile(TILSTAND, 'utf8').catch(() => '{}'));
  const liste = velg(await lesSaker(), sendt);
  if (!liste.length) return console.log('[telegram] Ingen nye saker.');
  for (const s of liste) {
    if (!(await publisert(s.slug))) {
      console.log(`[telegram] ${s.slug} er ikke publisert ennå; prøver neste kjøring.`);
      continue;
    }
    try {
      await send(token, kanal, s);
      sendt[s.slug] = new Date().toISOString();
      console.log(`[telegram] + ${s.slug}`);
    } catch (e) {
      console.error(`[telegram] ! ${s.slug}: ${e.message}`);
    }
  }
  await writeFile(TILSTAND, `${JSON.stringify(sendt, null, 2)}\n`);
}

if (path.basename(process.argv[1] ?? '') === 'telegram.mjs') await kjor();
