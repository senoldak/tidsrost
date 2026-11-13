// Dagens oppsummering (sahibi, 14 Kasım 2026): Oslo saatiyle ~20:45'te o günün saklarından Gemini ile tek bir bokmål
// paragraf yazar; kod denetler (her rakam ve özel ad kaynakta mı, okura hitap, Norveççe dil kapısı), geçmezse ilk üç
// başlıktan yedek kurar. src/data/dagens/<dato>.json ve kapak public/dagens/<dato>.png yazılır; paragraf gün arşivi
// sayfasında (/arkiv/<dato>/) görünür. mecmua-saat kuyruğu sayfayı @tidsrost Telegram ve LinkedIn sayfasına gönderir.
// Kullanım: node scripts/nyheter/dagens-oppsummering.mjs           (GITHUB_OUTPUT: yazildi=1|0, bildir=1|0)
//           node scripts/nyheter/dagens-oppsummering.mjs --bildir  (gün sayfasını kuyruğa bildirir)
import path from 'node:path';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  OZET_SEMASI, kapakSirasi, osloGunu, ozetBildir, ozetIstemi, ozetSlug, paragrafDenetle, paragrafKisalt, yedekParagraf,
} from './gunun-ozeti.mjs';
import { kesinProblemer, sprakProblemerNb } from './dil-nb.mjs';
import { sakerLes } from './oversikt.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sayfaUrl = (dato) => `https://tidsrost.com/arkiv/${dato}/`;
const varMi = (p) => access(p).then(() => true, () => false);

/** O günün (Oslo) yayındaki sakları, eskiden yeniye; Gemini'ye giden biçimde. */
export async function dagensSaker({ simdi, kok = KOK }) {
  const dato = osloGunu(simdi);
  return (await sakerLes({ kok, simdi }))
    .filter((s) => osloGunu(s.tarih) === dato)
    .map((s) => ({ id: s.slug, baslik: s.tittel, ozet: s.ingress, tarih: s.tarih }));
}

/** Paragrafı yazar; sak yoksa ya da o günün dosyası varsa null. geminiFn({ prompt, schema }), kapakFn({ tittel, basliklar }). */
export async function oppsummeringYaz({ simdi = new Date(), kok = KOK, geminiFn, kapakFn, log = console.log } = {}) {
  const dato = osloGunu(simdi);
  const dosya = path.join(kok, 'src/data/dagens', `${dato}.json`);
  if (await varMi(dosya)) {
    log(`${dato}: oppsummering finnes allerede.`);
    return null;
  }
  const haberler = await dagensSaker({ simdi, kok });
  if (!haberler.length) {
    log(`${dato}: ingen publiserte saker.`);
    return null;
  }
  let sonuc = null;
  try {
    const { sistem, istem } = ozetIstemi({ site: 'tidsrost', haberler });
    const y = await geminiFn({ prompt: `${sistem}\n\n${istem}`, schema: OZET_SEMASI });
    if (y?.paragraf) {
      const paragraf = paragrafKisalt(String(y.paragraf).replace(/\s+/g, ' ').trim());
      const denetim = paragrafDenetle({ paragraf, kimlikler: y.kimlikler, haberler, dil: 'nb' });
      const dil = kesinProblemer(sprakProblemerNb(paragraf));
      if (denetim.gecerli && !dil.length) sonuc = { paragraf, kimlikler: y.kimlikler, yazan: 'gemini' };
      else log(`Avsnittet ble avvist, reserve brukes: ${[...denetim.sorunlar, ...dil.map((s) => s.kod)].join(', ')}`);
    } else log('Gemini ga ikke avsnitt, reserve brukes.');
  } catch (e) {
    log(`Gemini-feil, reserve brukes: ${e.message}`);
  }
  sonuc ??= { ...yedekParagraf(haberler, 'nb'), yazan: 'yedek' };
  const kayit = { dato, paragraf: sonuc.paragraf, kimlikler: sonuc.kimlikler, yazan: sonuc.yazan, opprettet: simdi.toISOString() };
  await mkdir(path.dirname(dosya), { recursive: true });
  await writeFile(dosya, `${JSON.stringify(kayit, null, 2)}\n`, 'utf8');
  if (kapakFn) {
    const { png } = await kapakFn({ tittel: 'Dagens oppsummering', basliklar: kapakSirasi(haberler, sonuc.kimlikler).map((h) => h.baslik), tohum: dato });
    const kapak = path.join(kok, 'public/dagens', `${dato}.png`);
    await mkdir(path.dirname(kapak), { recursive: true });
    await writeFile(kapak, png);
  }
  log(`Skrevet: ${path.relative(kok, dosya)} (${haberler.length} saker, ${sonuc.yazan})`);
  return { dato, yazan: sonuc.yazan };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const dato = osloGunu(new Date());
  if (process.argv.includes('--bildir')) {
    const ok = await ozetBildir({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: 'tidsrost', sayfaUrl: sayfaUrl(dato), slug: ozetSlug(dato) });
    console.log(ok ? 'Dagssiden er varslet.' : 'Varsling feilet (MOTOR_URL/MOTOR_ANAHTARI eller nett).');
    if (!ok) process.exitCode = 1;
  } else {
    const { yayinDurduMu } = await import('./standart.mjs');
    const dur = await yayinDurduMu({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: 'tidsrost' });
    let r = null;
    if (dur.durdu) console.log(`Nødstopp: ${dur.neden}`);
    else {
      const { gemini } = await import('./lib.mjs');
      const { listeKart } = await import('./oversikt-kapak.mjs');
      r = await oppsummeringYaz({ geminiFn: gemini, kapakFn: listeKart });
    }
    const bildir = !dur.durdu && (await varMi(path.join(KOK, 'src/data/dagens', `${dato}.json`)));
    if (env.GITHUB_OUTPUT) await writeFile(env.GITHUB_OUTPUT, `yazildi=${r ? 1 : 0}\nbildir=${bildir ? 1 : 0}\n`, { flag: 'a' });
  }
}
