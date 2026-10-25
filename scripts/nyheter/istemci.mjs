// Kaynak: mecmua/site-ortak/gemini/istemci.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gemini çağrı çekirdeği (yönlendirici Faz 1, 25 Ekim 2026). Dört botun lib.mjs gemini() fonksiyonu buraya devreder;
// sitede yalnız imzayı koruyan ince sarmalayıcı kalır. Hangi işin hangi modelleri denediği modeller.mjs'te.
// Tasarım: mecmua/docs/superpowers/specs/2026-10-25-gemini-yonlendirici-faz1-design.md.
//
// Deneme döngüsü zincir üzerinde döner: günlük kotası dolmamış (gunlukDolu) ve soğumada olmayan modeller sırayla
// denenir, tur payı biten kapasite modeli sona kalır. 5xx ya da zaman aşımı → beklemeden sıradaki model ve o model
// SOGUMA_MS boyunca atlanır (Google meşgulken her haberin ilk isteği aynı modele çarpıp günlük kota yakmasın; hepsi
// soğumadaysa soğuma yok sayılır). Günlük 429 → model bu süreçte kapanır. Dakikalık 429 → bir dakika beklenip aynı
// model bir kez daha. 400–404 → ayar hatası, zincir denenmez. Zincirin hepsi düşerse tur biter; turlar arasında
// TUR_BEKLEMELERI_SN beklenir. Bir çağrı tümüyle düşerse aynı süreçteki sonraki çağrılar tek tur dener (Google uzun
// süre kapalıysa iş zaman aşımına düşmesin); ilk başarı bunu sıfırlar.
import { kullanimEkle, hataEkle, amacBul, gunlukDolu } from './kullanim.mjs';
import { golge } from './golge.mjs';
import { modelPayiVar } from './butce.mjs';
import { MODELLER, ILK_HALKA_SURE, TAKMA_ADLAR, zincirSec, kapasiteSec } from './modeller.mjs';

const GEMINI_ARALIK_MS = Number(process.env.GEMINI_ARALIK_MS || 4500);
const TUR_BEKLEMELERI_SN = [15, 30, 60];
const DAKIKA_BEKLEMESI_SN = 60;
const SOGUMA_MS = 10 * 60_000;
const DENETIM_YEDEK = 'gemma-4-26b-a4b-it';

let saat = Date.now;
let sonCagri = 0;
let geminiKesik = false;
const soguma = new Map(); // model → soğumanın bittiği an

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

// Testler için: süreç durumunu sıfırlar; saat verilirse soğuma o saatle ölçülür.
export function istemciSifirla({ saat: s = Date.now } = {}) {
  saat = s;
  sonCagri = 0;
  geminiKesik = false;
  soguma.clear();
}

const kapasitede = (m) => kapasiteSec().includes(TAKMA_ADLAR[m] ?? m);

// Sıra: payı olan kapasite modelleri, payı biten kapasite modelleri, sonra yedekler (20 RPD'li Flash'lar, Gemma); her
// grupta zincir sırası. Günlük dolular hiç, soğumadakiler (hepsi değilse) hiç denenmez.
function siraliAdaylar(zincir) {
  const acik = zincir.filter((m) => !gunlukDolu.has(m));
  const sicak = acik.filter((m) => !(soguma.get(m) > saat()));
  const adaylar = sicak.length ? sicak : acik;
  const kap = adaylar.filter(kapasitede);
  return [...kap.filter(modelPayiVar), ...kap.filter((m) => !modelPayiVar(m)), ...adaylar.filter((m) => !kapasitede(m))];
}

// Gemma (şemasız) cevabı: ilk { ya da [ ile eşinin son görüldüğü yer arası; yoksa null.
function jsonAyikla(metin) {
  const i = [metin.indexOf('{'), metin.indexOf('[')].filter((x) => x >= 0).sort((a, b) => a - b)[0];
  if (i === undefined) return null;
  const j = metin.lastIndexOf(metin[i] === '{' ? '}' : ']');
  if (j < i) return null;
  try {
    return JSON.parse(metin.slice(i, j + 1));
  } catch {
    return null;
  }
}

function hataYap(mesaj, alan) {
  const hata = new Error(mesaj);
  if (alan) hata[alan] = true;
  return hata;
}

export async function geminiCagir(
  { sistem, istem, sema, dusunme: seviye = 'low', denetim = false, _model = null, _amac = null },
  { sicaklik = 0.3, maksCikis = null, ayarAlani = 'konfig' } = {},
) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const amac = _amac ?? amacBul(); // Katman 0: çağıran dosya/fonksiyon
  const zincir = _model ? [_model] : zincirSec({ denetim, uzunluk: (istem?.length ?? 0) + (sistem?.length ?? 0) });
  const carpan = Number(process.env.GEMINI_BEKLE_CARPAN ?? 1);
  const turlar = _model || geminiKesik ? 1 : TUR_BEKLEMELERI_SN.length;
  const golgeModeli = process.env.GEMINI_DENETIM_YEDEK_MODEL || DENETIM_YEDEK;

  for (let tur = 1; tur <= turlar; tur++) {
    const adaylar = _model ? zincir : siraliAdaylar(zincir);
    if (!adaylar.length) throw hataYap('Gemini: bütün modellerin günlük kotası dolu', 'kota');
    for (let k = 0; k < adaylar.length; k++) {
      const model = adaylar[k];
      const sonraki = adaylar[k + 1] ?? 'tur sonu';
      const semasiz = Boolean(MODELLER[model]?.semasiz);
      // Kapasite modelleri (ve zincirin ilk halkası) meşru uzun yanıt için 180 sn bekler; kısa süre yalnız yedeklere.
      const sure = (model === zincir[0] || kapasitede(model) ? ILK_HALKA_SURE : MODELLER[model]?.sure ?? ILK_HALKA_SURE) * 1000;
      let dusunme = semasiz || !seviye ? null : { thinkingLevel: seviye };
      let dakikaTekrari = false;
      let kesikTekrari = false;
      for (;;) {
        const bekle = sonCagri + GEMINI_ARALIK_MS - Date.now();
        if (bekle > 0) await uyu(bekle);
        sonCagri = Date.now();
        const metinIstem = semasiz && sema
          ? `${istem}\n\nYalnız geçerli JSON döndür, başka metin yazma. Biçim (JSON Schema): ${JSON.stringify(sema)}`
          : istem;
        let res;
        try {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              ...(sistem && { systemInstruction: { parts: [{ text: sistem }] } }),
              contents: [{ role: 'user', parts: [{ text: metinIstem }] }],
              generationConfig: {
                temperature: sicaklik,
                ...(maksCikis && { maxOutputTokens: maksCikis }),
                ...(!semasiz && { responseMimeType: 'application/json', responseSchema: sema }),
                ...(dusunme && { thinkingConfig: dusunme }),
              },
            }),
            signal: AbortSignal.timeout(sure),
          });
        } catch (e) {
          if (_model) return null; // gölge çağrısı: tek deneme, sayaçlara girmez
          hataEkle(model, amac, 503);
          soguma.set(model, saat() + SOGUMA_MS);
          console.warn(`  Gemini zincir: ${model} ${e.name === 'TimeoutError' ? 'zaman aşımı' : 'ağ hatası'} → ${sonraki}`);
          break;
        }
        // Model düşünme ayarını desteklemiyorsa düşünmesiz yeniden denenir (deneme sayılmaz).
        if (res.status === 400 && dusunme && /thinking/i.test(await res.clone().text())) {
          dusunme = dusunme.thinkingLevel === 'low' ? null : { thinkingLevel: 'low' };
          continue;
        }
        if (res.status === 429 || res.status >= 500) {
          if (_model) return null;
          hataEkle(model, amac, res.status);
          if (res.status === 429 && /PerDay/i.test(await res.clone().text())) {
            gunlukDolu.add(model);
            console.warn(`  Gemini zincir: ${model} günlük kota doldu → ${sonraki}`);
            break;
          }
          if (res.status === 429 && !dakikaTekrari) {
            dakikaTekrari = true;
            console.warn(`  Gemini 429 (${model}): dakikalık sınır; bir dakika sonra yeniden`);
            await uyu(DAKIKA_BEKLEMESI_SN * 1000 * carpan);
            continue;
          }
          if (res.status >= 500) soguma.set(model, saat() + SOGUMA_MS);
          console.warn(`  Gemini zincir: ${model} ${res.status} → ${sonraki}`);
          break;
        }
        if (!res.ok) {
          const raw = await res.text();
          let msg = raw.slice(0, 300);
          try {
            msg = JSON.parse(raw).error?.message ?? msg;
          } catch {}
          // Anahtar/model hatası: haberin suçu değil, haber atlanmamalı.
          throw hataYap(`Gemini ${res.status}: ${msg}`, [400, 401, 403, 404].includes(res.status) ? ayarAlani : null);
        }
        geminiKesik = false;
        const data = await res.json();
        kullanimEkle(data.usageMetadata, { model, amac });
        const metin = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
        let sonuc;
        if (semasiz) {
          sonuc = jsonAyikla(metin);
          if (sonuc === null) throw hataYap(`Gemini bozuk yanıt (${model}): JSON yok`, 'bozuk');
        } else {
          try {
            sonuc = JSON.parse(metin);
          } catch (e) {
            // Kaçak (sonsuz uzayan) yanıt rastgele olur: tavanlı çağrıda aynı istek bir kez daha denenir.
            const kesik = data.candidates?.[0]?.finishReason === 'MAX_TOKENS';
            if (kesik && maksCikis && !kesikTekrari) {
              kesikTekrari = true;
              console.warn(`  Gemini (${model}) çıkış tavanına çarptı; aynı istek bir kez daha deneniyor`);
              continue;
            }
            throw hataYap(`Gemini bozuk yanıt (${model}${kesik ? ', çıkış tavanına çarptı' : ''}): ${e.message.slice(0, 120)}`, 'bozuk');
          }
        }
        if (denetim && !_model && model !== golgeModeli) {
          await golge(amac, sonuc, () => geminiCagir({ sistem, istem, sema, dusunme: seviye, denetim: true, _model: golgeModeli, _amac: `golge/${amac}` }, { sicaklik, ayarAlani }));
        }
        return sonuc;
      }
    }
    if (tur < turlar) await uyu(TUR_BEKLEMELERI_SN[tur - 1] * 1000 * carpan);
  }
  if (_model) return null;
  geminiKesik = true;
  throw new Error('Gemini: çok fazla deneme');
}
