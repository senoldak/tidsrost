// Haber botu için ortak yardımcılar: indirme, RSS okuma, HTML temizleme, Gemini, dosya yazma.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { kullanimEkle, hataEkle, amacBul, gunlukDolu } from './kullanim.mjs';
import { sakKapagi, kapakCiz, tilPng } from './bilde.mjs';

export const USER_AGENT = 'tidsrost-nyhetsbot/1.0 (+https://github.com/senoldak/tidsrost)';

export const KATEGORIER = ['innenriks', 'utenriks', 'okonomi', 'sport', 'kultur', 'teknologi'];
const KATEGORI_NAVN = { innenriks: 'Innenriks', utenriks: 'Utenriks', okonomi: 'Økonomi', sport: 'Sport', kultur: 'Kultur', teknologi: 'Teknologi' };
export const kategoriNavn = (slug) => KATEGORI_NAVN[slug] ?? slug;

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
  // Büyük/küçük harf ayrımı önemli (&aring; → å, &Aring; → Å).
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', laquo: '«', raquo: '»', ndash: '–', mdash: '—', hellip: '…',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€',
    aring: 'å', Aring: 'Å', oslash: 'ø', Oslash: 'Ø', aelig: 'æ', AElig: 'Æ',
    eacute: 'é', Eacute: 'É', auml: 'ä', Auml: 'Ä', ouml: 'ö', Ouml: 'Ö', uuml: 'ü', Uuml: 'Ü',
  };
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n] ?? named[n.toLowerCase()] ?? m);
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

// ASCII slug.
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

// Ücretsiz katmanın dakikalık sınırını aşmamak için istekler arasında en az bu kadar beklenir.
const GEMINI_ARALIK_MS = Number(process.env.GEMINI_ARALIK_MS || 4500);
// Google "meşgul" (5xx) ya da istek sınırı (429) dönerse ana ve yedek model sırayla, giderek uzayan aralıklarla
// denenir (iki model ayrı kapasite ve ayrı ücretsiz kotadır). Bir çağrı tümüyle düşerse aynı çalışmadaki sonraki
// çağrılar yalnız iki kez dener: Google uzun süre kapalıysa iş zaman aşımına düşmesin. İlk başarı bunu sıfırlar.
const GEMINI_BEKLEMELER_SN = [15, 30, 60, 90, 120];
let geminiKesik = false;
let sonGeminiKall = 0;

// Gemini'ye istek atar, JSON şemasına uygun yanıt döner.
// Katman 4 (Gemini kota planı): ücretsiz katmanda Flash günde 20 çağrı, Gemma 26B 14.400 (dakikada 16 bin token).
// Denemede (2026-10-17) Gemma denetim kararlarında Flash Lite kadar isabetliydi, puanlamada çok daha sıkıydı;
// bu yüzden yalnız evet/hayır denetimlerinde yedektir.
export const DENETIM_YEDEK_MODEL = 'gemma-4-26b-a4b-it';

// denetim: evet/hayır denetim çağrısı; yedek model Gemma olur (Katman 4, bkz. DENETIM_YEDEK_MODEL).
export async function gemini({ prompt, schema, tenkning: niva = 'low', denetim = false }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const bekle = sonGeminiKall + GEMINI_ARALIK_MS - Date.now();
  if (bekle > 0) await sleep(bekle);
  sonGeminiKall = Date.now();
  const yedek = denetim
    ? process.env.GEMINI_DENETIM_YEDEK_MODEL || DENETIM_YEDEK_MODEL
    : process.env.GEMINI_YEDEK_MODEL || 'gemini-flash-latest';
  const modeller = [process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', yedek];
  const carpan = Number(process.env.GEMINI_BEKLE_CARPAN ?? 1);
  const enFazla = geminiKesik ? 2 : GEMINI_BEKLEMELER_SN.length + 1;
  const amac = amacBul(); // Katman 0: çağıran dosya/fonksiyon

  // Düşünme seviyesini düşük tutmak cevabı çok hızlandırıyor; desteklemeyen modelde kapatılır.
  let tenkning = { thinkingLevel: niva };
  for (let forsok = 1; forsok <= enFazla; forsok++) {
    // 429 disiplini (Gemini kota planı): günlük kotası dolan model bu süreçte bir daha denenmez.
    const acik = modeller.filter((m) => !gunlukDolu.has(m));
    if (!acik.length) {
      const hata = new Error('Gemini: bütün modellerin günlük kotası dolu');
      hata.kota = true;
      throw hata;
    }
    const model = acik[(forsok - 1) % acik.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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
      tenkning = tenkning.thinkingLevel === 'low' ? null : { thinkingLevel: 'low' };
      forsok--;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      hataEkle(model, amac, res.status);
      if (res.status === 429 && /PerDay/i.test(await res.clone().text())) {
        gunlukDolu.add(model);
        console.warn(`  Gemini 429 (${model}): günlük kota doldu; bu turda bir daha denenmez`);
        continue;
      }
      console.warn(`  Gemini ${res.status} (${model}), ${forsok}. deneme; bekleniyor...`);
      if (forsok < enFazla) await sleep(GEMINI_BEKLEMELER_SN[forsok - 1] * 1000 * carpan);
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
    geminiKesik = false;
    const data = await res.json();
    kullanimEkle(data.usageMetadata, { model, amac });
    const tekst = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return JSON.parse(tekst);
  }
  geminiKesik = true;
  throw new Error('Gemini: çok fazla deneme');
}

// YAML'da güvenli çift tırnaklı metin.
const yamlStr = (s) => JSON.stringify(String(s));

// Dışarıdan gelen ya da yapay zekânın ürettiği metni güvenli Markdown'a çevirir:
// ham HTML, resimler ve https dışındaki linkler (javascript: vb.) kaldırılır (XSS'e karşı).
export function trygg(tekst = '') {
  return String(tekst)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/\[([^\]]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))*)[^)]*\)/g, (m, txt, url) => (/^https:\/\/[^\s"'<>]+$/i.test(url) ? `[${txt}](${url})` : txt));
}

// Dış kaynaktan gelen adresi güvenli https adresine çevirir; geçersizse null.
// new URL(...).href boşluk, <, >, " karakterlerini kodlar; Markdown linkini bozabilecek ( ) ' ` [ ] | \ de kodlanır.
export function normaliserUrl(x) {
  try {
    const u = new URL(String(x ?? '').trim());
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.href.replace(/[()'`\[\]|\\]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch {
    return null;
  }
}

// Markdown link metninde köşeli parantezleri ve satır sonlarını etkisizleştirir.
export const mdMetin = (s = '') => String(s).replace(/[\[\]\\<>]/g, '').replace(/\s+/g, ' ').trim();

// GitHub Actions özeti (Markdown) için üçüncü taraf metni: HTML/Markdown özel karakterleri kaçırılır, tek satıra indirilir.
export const mdKacir = (s = '') =>
  String(s).replace(/\s+/g, ' ').trim().replace(/[\\`*_{}\[\]()<>#+!|~&@]/g, (c) => `\\${c}`);

// Norveç yazım kuralları (Språkrådet); yapay zekâya bırakmadan her habere en son uygulanır.
// Tablolar (| ile başlayan satırlar) ve linklerin adresleri değiştirilmez.
export function typografi(tekst = '', { tittel = false } = {}) {
  const satirlar = String(tekst)
    .split('\n')
    .map((linje) => {
      if (/^\s*\|/.test(linje)) return linje;
      // Linkleri geçici olarak ayır ki adreslerine dokunulmasın.
      const lenker = [];
      let l = linje.replace(/\]\(([^)]*)\)/g, (m) => `\u0000${lenker.push(m) - 1}\u0000`);
      l = l
        // Satır başı alıntı: "- Tekst, sier X." Markdown'da liste maddesine dönüşmesin.
        .replace(/^[-–]\s+(?=.+,\s*(?:sier|seier|skriver|uttaler|understreker|påpeker|legger til)\b)/, '– ')
        // Düz ve kıvrık tırnaklar → « »
        .replace(/"([^"\n]+)"/g, '«$1»')
        .replace(/[“”„]([^“”„\n]+)[“”]/g, '«$1»')
        // Boşluklu kısa çizgi → uzun tire
        .replace(/ - /g, ' – ')
        // Saat: kl. 14:15 → kl. 14.15
        .replace(/\b(kl\.\s?\d{1,2}):(\d{2})\b/g, '$1.$2')
        // Kısaltma Språkrådet normuyla: "f. eks." → "f.eks."
        .replace(/\bf\.\s+eks\./g, 'f.eks.')
        // Yüzde işaretinden önce boşluk: 5,3% → 5,3 %
        .replace(/(\d)%/g, '$1 %')
        // Noktalama öncesi boşluk ve çift boşluk
        .replace(/ +([,.;:!?])(?=\s|$)/g, '$1')
        .replace(/ {2,}/g, ' ')
        .trimEnd();
      return l.replace(/\u0000(\d+)\u0000/g, (_, i) => lenker[i]);
    });
  let ut = satirlar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (tittel) ut = ut.replace(/\s*\.$/, '').replace(/\s+/g, ' ');
  return ut;
}

// Yapay zekâ bazen gövdeyi tek blok döndürüyor; boş satırı olmayan, liste/tablo içermeyen uzun metin
// 2-3 cümlelik paragraflara bölünür (kısaltmalarda bölünmesin diye cümle sonu + büyük harf aranır).
export function avsnitt(tekst = '') {
  const t = tekst.trim();
  if (/\n\s*\n/.test(t) || /^\s*([-*|#]|\d+\.)\s/m.test(t) || t.length < 350) return t;
  const setninger = t.replace(/\n+/g, ' ').split(/(?<=[.!?»])\s+(?=[«–"A-ZÆØÅ0-9])/u);
  if (setninger.length < 4) return t;
  const ut = [];
  for (let i = 0; i < setninger.length; ) {
    const n = setninger.length - i === 4 ? 2 : Math.min(3, setninger.length - i);
    ut.push(setninger.slice(i, i + n).join(' '));
    i += n;
  }
  return ut.join('\n\n');
}

// Haberi src/content/haberler/<slug>/index.md olarak yazar, slug'ı döner.
export async function skrivSak(rot, sak) {
  if (!KATEGORIER.includes(sak.category)) sak.category = 'innenriks';
  const kilder = (sak.kilder ?? [sak.kilde]).map((k) => {
    const url = normaliserUrl(k.url);
    if (!url) throw new Error(`Ugyldig kilde-URL: ${k.url}`);
    return { ...k, url };
  });
  sak = {
    ...sak,
    title: typografi(trygg(sak.title), { tittel: true }),
    description: typografi(trygg(sak.description)).replace(/\s+/g, ' '),
    body: typografi(trygg(avsnitt(sak.body))),
  };
  const base = path.join(rot, 'src/content/haberler');
  // public/_redirects'te kaynak olan (birleştirilmiş/silinmiş) adresler yeniden kullanılmaz; yoksa yeni haber eskisine yönlenir.
  const yonlenen = new Set(
    (await readFile(path.join(rot, 'public/_redirects'), 'utf8').catch(() => ''))
      .split('\n')
      .map((l) => l.match(/^\/artikkel\/([^/\s]+)/)?.[1])
      .filter(Boolean),
  );
  const finnes = (s) => access(path.join(base, s)).then(() => true, () => false);
  let slug = slugify(sak.title) || 'sak';
  for (let i = 2; yonlenen.has(slug) || (await finnes(slug)); i++) {
    slug = `${slugify(sak.title) || 'sak'}-${i}`;
  }
  const fm = [
    '---',
    `title: ${yamlStr(sak.title)}`,
    `description: ${yamlStr(sak.description)}`,
    `date: ${sak.date}`,
    `category: ${sak.category}`,
    sak.why_matters?.trim() ? `why_matters: ${yamlStr(sak.why_matters.trim())}` : null,
    Array.isArray(sak.key_points) && sak.key_points.filter(Boolean).length
      ? `key_points:\n${sak.key_points.filter(Boolean).map((p) => `  - ${yamlStr(p)}`).join('\n')}`
      : null,
    sak.breaking ? 'breaking: true' : null,
    sak.draft ? 'draft: true' : null,
    `produksjon: ${sak.produksjon}`,
    // Resmi olmayan kaynakların şifreli kaydı (bkz. hemmelig.mjs); sitede gösterilmez.
    sak.kildeSpor ? `kildeSpor: ${yamlStr(sak.kildeSpor)}` : null,
  ].filter(Boolean);
  // Üretim şekli notu sayfada ayrıca gösterilir; burada sadece kaynak (VVP 3.1).
  const lenke = (k) => `[${mdMetin(k.navn)}](${k.url})${k.lisens ? ` (${mdMetin(k.lisens)})` : ''}`;
  // Haber sitelerine dayanan haberde kaynak satırı yazılmaz (kilder: []; sahibin kuralı).
  const kilde = kilder.length ? `*${kilder.length > 1 ? 'Kilder' : 'Kilde'}: ${kilder.map(lenke).join(', ')}*` : '';
  await mkdir(path.join(base, slug), { recursive: true });
  const bilde = await lagBilde(sak);
  if (bilde) {
    await writeFile(path.join(base, slug, 'cover.png'), bilde.png);
    fm.push('cover: ./cover.png', `coverAlt: ${yamlStr(bilde.alt)}`, `coverKreditt: ${yamlStr(bilde.kreditt)}`);
  }
  fm.push('---');
  const innhold = `${fm.join('\n')}\n\n${sak.body.trim()}\n${kilde ? `\n${kilde}\n` : ''}`;
  await writeFile(path.join(base, slug, 'index.md'), innhold, 'utf8');
  return slug;
}

// Kapak resmi: kaynak kendi görselini verdiyse (harita, grafik) o, yoksa editoryal sakKapagi.
// sak.bilde = { svg: (sak) => string | object | Promise<...>, alt, kreditt }
// Görsel üretilemezse haber yine yazılır, sadece kapaksız kalır.
export async function lagBilde(sak) {
  try {
    if (sak.bilde) {
      const b = sak.bilde;
      const res = await b.svg(sak);
      const png = (res && typeof res === 'object' && ('katmanlar' in res || 'svg' in res))
        ? await kapakCiz(res)
        : await tilPng(res);
      return png && { png, alt: b.alt, kreditt: b.kreditt };
    }

    const alt = `Illustrasjon: «${sak.title}»`;
    const kreditt = 'Illustrasjon: tidsrøst';
    const png = await kapakCiz(sakKapagi({
      tittel: sak.title,
      ingress: sak.description,
      kategori: sak.category,
      dato: sak.date,
      rakam: sak.rakam,
      kilde: sak.kilde?.navn,
    }));
    return png && { png, alt, kreditt };
  } catch (e) {
    console.warn(`  kapak resmi üretilemedi: ${e.message}`);
    return null;
  }
}

export async function lesJsonFil(fil, fallback) {
  try {
    return JSON.parse(await readFile(fil, 'utf8'));
  } catch {
    return fallback;
  }
}
