// Kaynak: mecmua/site-ortak/gemini/yerel-model.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yerel model gölgesi (28 Ekim 2026). GitHub makinesinde llama.cpp ile açılan iki model "aynı olay" ölçümüne gölge
// olarak bağlanır: EmbeddingGemma 2 (gömme, GOMME_ADRESI) ve Gemma 4 E4B (evet/hayır, SOHBET_ADRESI). Sunucuları iş
// akışındaki yerel-model-baslat.sh açar. Kararı her zaman Gemini verir; yerel sonuç yalnız loga girer (yerel-ölçüm satırı:
// sayı, karar, dil, kısaltılmış kimlik; metin yok). Metinler makineden çıkmaz, gizli kaynak başlıkları için de güvenli.
// YEREL_GOLGE=1 değilse ya da sunucuya ulaşılamazsa hiçbir şey yapılmaz; tur etkilenmez. Şimdilik jendume (TR/EN) ve
// tidsrost (NO) kullanır.
//
// Kalite gölgesi (kaliteKaydet): yayına giden haberin metni ve kaynağı YEREL_KALITE_DOSYASI'na (runner'ın geçici
// klasörü; commit'lenmez, iş bitince silinir) bir satır olarak yazılır. Sonraki adımda yerel-kalite.py LangExtract ve
// yerel Gemma ile metindeki rakam ve alıntıları kaynakta arar; sonuç yalnız loga girer.
import { appendFileSync } from 'node:fs';
import { benzerlik, metinAnahtari } from './gomme.mjs';

export const GOMME_ADRESI = 'http://127.0.0.1:8091';
export const SOHBET_ADRESI = 'http://127.0.0.1:8092';
export const AZAMI = 30; // turda en çok çift
const SURE_MS = 60_000; // istek başına
const BUTCE_MS = 240_000; // turda toplam; aşılınca kalan çiftler atlanır
const METIN = 600;
const GOMME_ONEKI = 'task: sentence similarity | query: '; // EmbeddingGemma 2 model kartı, simetrik benzerlik

let kapali = false; // bu süreçte sunucuya ulaşılamadı

// Testler için: süreç durumunu sıfırlar.
export function yerelSifirla() {
  kapali = false;
}

export const yerelAcik = (env = process.env) => env.YEREL_GOLGE === '1' && !kapali;

const istek = (fetchFn, url, govde) =>
  fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde), signal: AbortSignal.timeout(SURE_MS) });

/** Metinleri aynı sırada vektörlere çevirir (dizi dizisi). Hata fırlatır. */
export async function yerelVektorle(metinler, { fetchFn = fetch } = {}) {
  const res = await istek(fetchFn, `${GOMME_ADRESI}/v1/embeddings`, { input: metinler.map((m) => GOMME_ONEKI + m.slice(0, METIN)) });
  if (!res.ok) throw new Error(`gömme ${res.status}`);
  const d = (await res.json())?.data;
  const out = new Array(metinler.length);
  for (const e of Array.isArray(d) ? d : []) if (Number.isInteger(e?.index)) out[e.index] = e.embedding;
  if (!metinler.every((_, i) => Array.isArray(out[i]))) throw new Error('gömme eksik yanıt');
  return out;
}

export const SISTEM = 'You compare two news items. They may be in Turkish, English or Norwegian. Answer with exactly one word: YES or NO.';
export const soru = (a, b) =>
  `Do A and B report the same news event (the same incident, decision, announcement or data release), not merely the same topic?\n\nA: ${a.slice(0, METIN)}\n\nB: ${b.slice(0, METIN)}\n\nAnswer YES or NO.`;

/** Cevaptaki son evet/hayır sözcüğü; yoksa null. */
export function cevapCoz(metin) {
  const m = [...String(metin ?? '').matchAll(/\b(YES|NO|EVET|HAYIR|JA|NEI)\b/gi)].pop();
  return m ? ['yes', 'evet', 'ja'].includes(m[1].toLowerCase()) : null;
}

/** Gemma'ya "aynı olay mı?" sorar: true/false, anlaşılmazsa null. Ağ ya da HTTP hatası fırlatır. */
export async function yerelAyniMi(a, b, { fetchFn = fetch } = {}) {
  const res = await istek(fetchFn, `${SOHBET_ADRESI}/v1/chat/completions`, {
    messages: [
      { role: 'system', content: SISTEM },
      { role: 'user', content: soru(a, b) },
    ],
    temperature: 0,
    max_tokens: 16,
    chat_template_kwargs: { enable_thinking: false },
  });
  if (!res.ok) throw new Error(`sohbet ${res.status}`);
  return cevapCoz((await res.json())?.choices?.[0]?.message?.content);
}

/** Önce "aynı" kararlı çiftler (en az yarısı kadar yer), kalanı "farklı"; toplam azami. */
export function sec(ciftler, azami = AZAMI) {
  const ayni = ciftler.filter((c) => c.karar === 'ayni');
  const farkli = ciftler.filter((c) => c.karar !== 'ayni');
  const a = ayni.slice(0, Math.max(azami - farkli.length, Math.ceil(azami / 2)));
  return [...a, ...farkli.slice(0, azami - a.length)];
}

const yuvarla = (x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : undefined);

/** Ölçüm log satırı: yalnız sayı, karar, dil ve kısaltılmış kimlik (botlar açık repolarda çalışır). */
export function yerelSatiri({ tur, karar, bg, yb, gemma, ms, dil, id }) {
  const j = { tur, karar, bg: yuvarla(bg), yb: yuvarla(yb), gemma, ms, dil, id: id == null ? undefined : metinAnahtari(String(id)).slice(0, 8) };
  for (const k of Object.keys(j)) {
    if (j[k] === undefined || j[k] === null) delete j[k];
    else if (typeof j[k] === 'string') j[k] = j[k].slice(0, 12);
  }
  return `yerel-ölçüm ${JSON.stringify(j)}`;
}

/**
 * ciftler: [{ tur, karar: 'ayni'|'farkli' (Gemini), a, b (metin), bg (Gemini gömme benzerliği), dil, id }].
 * Her çift için yerel gömme benzerliği (yb) ve Gemma'nın kararı loga yazılır. Döner: özet ya da kapalıysa null.
 */
export async function yerelOlcum(ciftler, { env = process.env, log = console.log, fetchFn = fetch, saat = Date.now } = {}) {
  if (!yerelAcik(env) || !ciftler.length) return null;
  const bas = saat();
  const secilen = sec(ciftler);
  const birak = (e) => {
    kapali = true;
    log(`  yerel: ${String(e?.message ?? e).slice(0, 60)}; gölge bu süreçte kapalı`);
    return null;
  };
  const metinler = [...new Set(secilen.flatMap((c) => [c.a, c.b]))];
  let vek;
  try {
    const v = await yerelVektorle(metinler, { fetchFn });
    vek = new Map(metinler.map((m, i) => [m, v[i]]));
  } catch (e) {
    return birak(e);
  }
  const ozet = { n: 0, uyum: 0, yanitsiz: 0, atlanan: 0 };
  let ardisikHata = 0;
  for (const c of secilen) {
    if (saat() - bas > BUTCE_MS) {
      ozet.atlanan++;
      continue;
    }
    const t = saat();
    let g = null;
    try {
      g = await yerelAyniMi(c.a, c.b, { fetchFn });
      ardisikHata = 0;
    } catch (e) {
      if (++ardisikHata >= 3) {
        birak(e);
        break;
      }
    }
    ozet.n++;
    if (g === null) ozet.yanitsiz++;
    else if (g === (c.karar === 'ayni')) ozet.uyum++;
    const gemma = g === null ? 'yok' : g ? 'ayni' : 'farkli';
    log(yerelSatiri({ tur: c.tur, karar: c.karar, bg: c.bg, yb: benzerlik(vek.get(c.a), vek.get(c.b)), gemma, ms: saat() - t, dil: c.dil, id: c.id }));
  }
  log(`yerel-özet ${JSON.stringify({ ...ozet, ms: saat() - bas })}`);
  return ozet;
}

/** Yayına giden haberi kalite gölgesi için kaydeder (YEREL_GOLGE=1 ve YEREL_KALITE_DOSYASI varsa). Asla fırlatmaz. */
export function kaliteKaydet({ id, dil, metin, kaynak }, env = process.env) {
  if (env.YEREL_GOLGE !== '1' || !env.YEREL_KALITE_DOSYASI || !metin || !kaynak) return false;
  try {
    appendFileSync(env.YEREL_KALITE_DOSYASI, `${JSON.stringify({ id: metinAnahtari(String(id)).slice(0, 8), dil, metin, kaynak })}\n`);
    return true;
  } catch {
    return false;
  }
}
