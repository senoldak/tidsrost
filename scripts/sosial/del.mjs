// Yeni tam haberleri Facebook Sayfasına ve Instagram'a post + story olarak gönderir (Meta Graph API, ücretsiz).
// sosial.yml her yayından sonra çalıştırır; görseller o yayınla tidsrost.com/sosial/ altına çıkmış olur (bilder.mjs).
// Durum scripts/sosial/delt.json'da: giden kanal bir daha gitmez, gitmeyen sonraki turda 3 kez denenir.
//
// Ortam: META_TOKEN (tidsrost portföyündeki sistem kullanıcısının süresiz token'ı), META_PAGE_ID, INSTAGRAM_USER_ID,
// SOSIAL_GUNLUK_TAVAN (24 saatte en çok kaç haber; boş = sınırsız).
// Kullanım: node scripts/sosial/del.mjs [--kontrol | --baslat | --reels | --test [haber-id] [--kanallar ig_post,ig_story]]
//   --kontrol: hiçbir şey yayımlamadan erişimi sınar.  --baslat: penceredeki haberleri gönderilmiş sayar (ilk kurulum).
//   --test: tek haberi (verilmezse görseli yayında olan en yeni tam haberi) gece kuralı ve tavana bakmadan seçilen
//   kanallara gönderir; giden kanallar delt.json'a işlenir, haber sonraki turlarda tekrar gitmez.
//   --reels: Oslo öğle/akşam diliminde günün en güçlü haberini Instagram ve Facebook Reels olarak gönderir
//   (sosial.yml zamanlayıcısı; seçim kuralı saker.mjs reelsSec). Video burada üretilir ve doğrudan yüklenir.
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sakerOku, paylasilir, bildetekst, bildeUrl, varselSeviye, varselSuz, reelsDilimi, reelsSec, sakYeri, YERLER } from './saker.mjs';
import { reelsCiz } from './reels.mjs';

const API = 'https://graph.facebook.com/v25.0';
const DURUM = 'scripts/sosial/delt.json';
const KANALLAR = ['ig_post', 'ig_story', 'fb_post', 'fb_story'];
const REELS_KANALLAR = ['ig_reels', 'fb_reels'];
const AZAMI_DENEME = 3;
const TUR_BASINA = 10; // bir turda en çok bu kadar haber; kalanı sonraki tura
const ARA_MS = Number(process.env.SOSIAL_ARA_MS ?? 60_000); // haberler arası bekleme (akışı boğmamak için)

const token = process.env.META_TOKEN;
const sayfaId = process.env.META_PAGE_ID;
const igId = process.env.INSTAGRAM_USER_ID;
const tavan = Number(process.env.SOSIAL_GUNLUK_TAVAN) || Infinity;
const kontrol = process.argv.includes('--kontrol');
const baslat = process.argv.includes('--baslat');

if (!token || !sayfaId || !igId) {
  console.log('[sosial] META_TOKEN, META_PAGE_ID veya INSTAGRAM_USER_ID yok, paylaşım atlandı.');
  process.exit(0);
}
const gizle = (m) => [token, sayfaToken].filter(Boolean).reduce((s, t) => s.replaceAll(t, '[TOKEN]'), String(m));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(yontem, yol, alanlar, tok = token) {
  const q = new URLSearchParams({ ...alanlar, access_token: tok });
  for (let deneme = 1; ; deneme++) {
    try {
      const res = await fetch(yontem === 'GET' ? `${API}/${yol}?${q}` : `${API}/${yol}`, {
        method: yontem,
        ...(yontem === 'GET' ? {} : { body: q }),
        signal: AbortSignal.timeout(60_000),
      });
      const v = await res.json();
      if (!res.ok || v.error) throw new Error(`Graph ${res.status}: ${v.error?.message ?? 'bilinmeyen hata'}`);
      return v;
    } catch (e) {
      // Meta'nın reddettiği istek tekrarlanmaz; yalnız ağ hatası ve zaman aşımı.
      if (String(e.message).startsWith('Graph ') || deneme === 3) throw e;
      await bekle(deneme * 5000);
    }
  }
}

// META_TOKEN bir sistem kullanıcısı token'ıysa Sayfa token'ı ondan alınır; zaten Sayfa token'ıysa (token-kur.mjs)
// alan dönmez ve token olduğu gibi kullanılır.
let sayfaToken;
async function sayfaTokeni() {
  sayfaToken ??= (await graph('GET', sayfaId, { fields: 'access_token' }).catch(() => ({}))).access_token ?? token;
  return sayfaToken;
}

async function igYayimla(alanlar) {
  const kap = await graph('POST', `${igId}/media`, alanlar);
  for (let i = 0; i < 20; i++) {
    const { status_code } = await graph('GET', kap.id, { fields: 'status_code' });
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram medya kabı: ${status_code}`);
    await bekle(3000);
  }
  return (await graph('POST', `${igId}/media_publish`, { creation_id: kap.id })).id;
}

// Video bir kez üretilir, iki kanala da aynı dosya gider.
const videolar = new Map();
async function video(s) {
  if (!videolar.has(s.id)) videolar.set(s.id, reelsCiz(s, path.join(os.tmpdir(), `${s.id.replace(/\//g, '-')}-reels.mp4`)).then((f) => readFile(f)));
  return videolar.get(s.id);
}
// Meta'nın yükleme sunucusuna ham dosya (resumable upload, tek parça).
async function rupload(url, tok, veri) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `OAuth ${tok}`, offset: '0', file_size: String(veri.length) },
    body: veri,
    signal: AbortSignal.timeout(180_000),
  });
  const v = await res.json().catch(() => ({}));
  if (!res.ok || v.error || v.success === false) throw new Error(`Graph ${res.status}: yükleme reddedildi (${v.error?.message ?? v.debug_info?.message ?? 'bilinmeyen hata'})`);
}

// Haberde geçen şehrin yer sayfası varsa konum etiketi (saker.mjs YERLER).
const yer = (s, alan) => (sakYeri(s) ? { [alan]: sakYeri(s) } : {});

const GONDER = {
  ig_post: (s) => igYayimla({ image_url: bildeUrl(s.id, 'post'), caption: bildetekst(s, 'instagram'), ...yer(s, 'location_id') }),
  ig_story: (s) => igYayimla({ image_url: bildeUrl(s.id, 'story'), media_type: 'STORIES' }),
  fb_post: async (s) => {
    const r = await graph('POST', `${sayfaId}/photos`, { url: bildeUrl(s.id, 'post'), message: bildetekst(s, 'facebook'), published: 'true', ...yer(s, 'place') }, await sayfaTokeni());
    return r.post_id ?? r.id;
  },
  fb_story: async (s) => {
    const tok = await sayfaTokeni();
    const foto = await graph('POST', `${sayfaId}/photos`, { url: bildeUrl(s.id, 'story'), published: 'false' }, tok);
    const r = await graph('POST', `${sayfaId}/photo_stories`, { photo_id: foto.id }, tok);
    return r.post_id ?? foto.id;
  },
  ig_reels: async (s) => {
    const veri = await video(s);
    const kap = await graph('POST', `${igId}/media`, { media_type: 'REELS', upload_type: 'resumable', share_to_feed: 'true', caption: bildetekst(s, 'instagram'), ...yer(s, 'location_id') });
    await rupload(`https://rupload.facebook.com/ig-api-upload/v25.0/${kap.id}`, token, veri);
    // Video işlenmesi bir dakikayı bulabilir.
    for (let i = 0; ; i++) {
      const { status_code } = await graph('GET', kap.id, { fields: 'status_code' });
      if (status_code === 'FINISHED') break;
      if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram Reels kabı: ${status_code}`);
      if (i >= 40) throw new Error('Instagram Reels kabı 3 dakikada hazır olmadı');
      await bekle(5000);
    }
    return (await graph('POST', `${igId}/media_publish`, { creation_id: kap.id })).id;
  },
  fb_reels: async (s) => {
    const veri = await video(s);
    const tok = await sayfaTokeni();
    const bas = await graph('POST', `${sayfaId}/video_reels`, { upload_phase: 'start' }, tok);
    await rupload(bas.upload_url ?? `https://rupload.facebook.com/video-upload/v25.0/${bas.video_id}`, tok, veri);
    await graph('POST', `${sayfaId}/video_reels`, { upload_phase: 'finish', video_id: bas.video_id, video_state: 'PUBLISHED', description: bildetekst(s, 'facebook') }, tok);
    return bas.video_id;
  },
};

if (kontrol) {
  const { name } = await graph('GET', sayfaId, { fields: 'name' }, await sayfaTokeni());
  const { username } = await graph('GET', igId, { fields: 'username' });
  const { data } = await graph('GET', `${igId}/content_publishing_limit`, { fields: 'quota_usage,config' });
  console.log(`[sosial] ✓ Facebook Sayfası: ${name}`);
  console.log(`[sosial] ✓ Instagram: @${username}, 24 saatlik kota ${data?.[0]?.quota_usage ?? '?'}/${data?.[0]?.config?.quota_total ?? '?'}`);
  // Konum etiketi kimlikleri (saker.mjs YERLER) yer sayfası olarak okunabiliyor mu.
  for (const [by, id] of Object.entries(YERLER)) {
    try {
      const r = await graph('GET', id, { fields: 'name,location{city,country}' }, await sayfaTokeni());
      console.log(`[sosial] ✓ yer ${by}: ${r.name} (${r.location?.city ?? '?'}, ${r.location?.country ?? '?'})`);
    } catch (e) {
      console.log(`[sosial] ! yer ${by} (${id}): ${gizle(e.message).slice(0, 200)}`);
    }
  }
  process.exit(0);
}

const argDeger = (ad) => { const i = process.argv.indexOf(`--${ad}`); const v = process.argv[i + 1]; return i > 0 && v && !v.startsWith('--') ? v : null; };
const gorselHazir = async (id) =>
  (await Promise.all(['post', 'story'].map((b) => fetch(bildeUrl(id, b), { method: 'HEAD' }).then((r) => r.ok, () => false)))).every(Boolean);

if (process.argv.includes('--test')) {
  const kanallar = (argDeger('kanallar') ?? 'ig_post,ig_story').split(',').filter((c) => KANALLAR.includes(c) || REELS_KANALLAR.includes(c));
  const adaylar = (await sakerOku()).filter((s) => paylasilir(s, Date.now(), 30 * 3600e3)).reverse();
  const istenen = argDeger('test');
  let s = null;
  for (const a of istenen ? adaylar.filter((x) => x.id === istenen) : adaylar) if (await gorselHazir(a.id)) { s = a; break; }
  if (!s) { console.error(`[sosial] Test: ${istenen ?? 'görseli yayında olan tam haber'} bulunamadı.`); process.exit(1); }
  let durum;
  try { durum = JSON.parse(await readFile(DURUM, 'utf8')); } catch { durum = {}; }
  const k = (durum[s.id] ??= { tarih: new Date().toISOString(), atlandi: 'test' });
  let hata = 0;
  console.log(`[sosial] Test: ${s.id} → ${kanallar.join(', ')}`);
  for (const c of kanallar) {
    if (k[c]) { console.log(`[sosial] ${c} zaten gönderilmiş (${k[c]})`); continue; }
    try { k[c] = await GONDER[c](s); console.log(`[sosial] ✓ ${c} (${k[c]})`); }
    catch (e) { hata++; console.error(`[sosial] ! ${c}: ${gizle(e.message).slice(0, 300)}`); }
  }
  await writeFile(DURUM, `${JSON.stringify(durum, null, 2)}
`);
  process.exit(hata ? 1 : 0);
}

if (process.argv.includes('--reels')) {
  const dilim = reelsDilimi();
  if (!dilim) { console.log('[sosial] Reels: Oslo saati dilim dışında.'); process.exit(0); }
  let durum;
  try { durum = JSON.parse(await readFile(DURUM, 'utf8')); } catch { console.log('[sosial] Reels: delt.json yok, atlandı.'); process.exit(0); }
  const simdi = Date.now();
  const tukenmis = (k) => REELS_KANALLAR.every((c) => k?.[c] || (k?.deneme?.[c] ?? 0) >= AZAMI_DENEME);
  const s = reelsSec((await sakerOku()).filter((x) => paylasilir(x, simdi) && !tukenmis(durum[x.id])), durum, dilim);
  if (!s) { console.log(`[sosial] Reels (${dilim.gun} ${dilim.ad}): gönderilecek haber yok ya da dilim dolu.`); process.exit(0); }
  const k = (durum[s.id] ??= { tarih: new Date(simdi).toISOString() });
  console.log(`[sosial] Reels (${dilim.gun} ${dilim.ad}): ${s.id}`);
  let hata = 0;
  for (const c of REELS_KANALLAR) {
    if (k[c] || (k.deneme?.[c] ?? 0) >= AZAMI_DENEME) continue;
    try {
      k[c] = await GONDER[c](s);
      console.log(`[sosial] ✓ ${s.id} ${c} (${k[c]})`);
    } catch (e) {
      hata++;
      k.deneme = { ...k.deneme, [c]: (k.deneme?.[c] ?? 0) + 1 };
      k.son_hata = gizle(e.message).slice(0, 300);
      console.error(`[sosial] ! ${s.id} ${c}: ${k.son_hata}`);
    }
  }
  // Bir kanal bile gittiyse dilim dolmuş sayılır; ikisi de düştüyse dilimin sonraki turu yeniden dener.
  if (REELS_KANALLAR.some((c) => k[c])) k.reels = { gun: dilim.gun, dilim: dilim.ad };
  await writeFile(DURUM, `${JSON.stringify(durum, null, 2)}\n`);
  process.exit(hata ? 1 : 0);
}

// Oslo gecesi 01–07 paylaşım yok; birikenler sabah ilk turda gider.
const osloSaat = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
if (!baslat && osloSaat >= 1 && osloSaat < 7) {
  console.log(`[sosial] Oslo ${osloSaat}:00, gece: paylaşım sabaha kaldı.`);
  process.exit(0);
}

const simdi = Date.now();
let delt;
try { delt = JSON.parse(await readFile(DURUM, 'utf8')); } catch { delt = null; }
const saker = (await sakerOku()).filter((s) => paylasilir(s, simdi));
const kaydet = () => writeFile(DURUM, `${JSON.stringify(delt, null, 2)}\n`);

// İlk kurulum ya da açık istek: penceredeki haberler gönderilmiş sayılır, eski haberler toplu gitmez.
if (baslat || !delt) {
  delt ??= {};
  for (const s of saker) delt[s.id] ??= { tarih: new Date(simdi).toISOString(), atlandi: 'kurulum öncesi' };
  await kaydet();
  console.log(`[sosial] Başlangıç: ${saker.length} haber gönderilmiş sayıldı; bundan sonraki haberler paylaşılır.`);
  process.exit(0);
}

// 7 günden eski kayıtlar budanır.
for (const [id, k] of Object.entries(delt)) if (Date.parse(k.tarih) < simdi - 7 * 86400e3) delete delt[id];

const eksik = (k) => KANALLAR.filter((c) => !k?.[c] && (k?.deneme?.[c] ?? 0) < AZAMI_DENEME && !k?.atlandi);
const son24 = Object.values(delt).filter((k) => !k.atlandi && Date.parse(k.tarih) > simdi - 86400e3).length;
let kalanTavan = tavan - son24;

const son24Varsel = Object.entries(delt).filter(([id, k]) => !k.atlandi && Date.parse(k.tarih) > simdi - 86400e3 && varselSeviye({ id }) === 'oransje').length;
// Yarım kalan (bir kanalı gitmiş) haber tamamlanır; yeni haberlere farevarsel kuralı uygulanır.
const yarim = saker.filter((s) => delt[s.id] && eksik(delt[s.id]).length);
const yeniler = varselSuz(saker.filter((s) => !delt[s.id]), son24Varsel);
const sira = [...yarim, ...yeniler].sort((a, b) => a.dato - b.dato || a.id.localeCompare(b.id));
console.log(`[sosial] Sırada ${sira.length} haber; son 24 saatte ${son24} haber paylaşıldı (tavan ${tavan === Infinity ? 'yok' : tavan}).`);

let hata = 0;
let islenen = 0;
for (const s of sira) {
  const yeni = !delt[s.id];
  if (yeni && kalanTavan <= 0) { console.log(`[sosial] Günlük tavan doldu; ${s.id} bekliyor.`); continue; }
  if (islenen >= TUR_BASINA) break;

  // Görsel henüz yayında değilse (derleme sürüyor) haber sonraki tura kalır; deneme sayılmaz.
  if (!(await gorselHazir(s.id))) { console.log(`[sosial] ${s.id}: görsel yayında değil, sonraki tur.`); continue; }

  if (islenen) await bekle(ARA_MS);
  islenen++;
  const k = (delt[s.id] ??= { tarih: new Date().toISOString() });
  if (yeni) kalanTavan--;
  for (const c of eksik(k)) {
    try {
      k[c] = await GONDER[c](s);
      console.log(`[sosial] ✓ ${s.id} ${c}`);
    } catch (e) {
      hata++;
      k.deneme = { ...k.deneme, [c]: (k.deneme?.[c] ?? 0) + 1 };
      k.son_hata = gizle(e.message).slice(0, 300);
      console.error(`[sosial] ! ${s.id} ${c}: ${k.son_hata}`);
    }
  }
  await kaydet();
}
await kaydet();
console.log(`[sosial] ${islenen} haber işlendi, ${hata} kanal hatası.`);
if (hata) process.exitCode = 1;
