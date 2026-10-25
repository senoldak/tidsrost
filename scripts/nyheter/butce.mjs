// Kaynak: mecmua/site-ortak/gemini/butce.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Katman 3 (Gemini kota planı): bütçe yöneticisi. Tur başında saatten sitenin bugünkü (Google günü, Pasifik saati)
// model başına kullanımını okur ve her kapasite modeli (iki Flash-Lite, modeller.mjs KAPASITE) için ayrı tur payı
// hesaplar:
//   kalan = günlük sınır × 0,8 − bugün kullanılan
//   pay   = kalan / ⌈kalan tur / 2⌉, ama sonraki her tura en az TABAN kalacak kadar (en az da eşit pay)
// Ön yükleme: Google günü 07:00 UTC'de başlar; o saatte gece biriken iş en çok, eşit pay (400/12 = 33) her turda
// doluyor, gün sonunda ise kullanılmayan pay birikiyordu (2026-10-17: gün başı 4/5 tur dolu, gün toplamı 175–256).
// %20'lik pay elle çalıştırmalar ve sürprizler için kalır. Harcanmayan pay kendiliğinden sonraki turlara devreder.
// Kullanım = başarılı + 429 + 5xx: Google'ın günlük sayacı başarısız istekleri de sayar (22 Ekim ölçümü). Takma ad
// (gemini-flash-lite-latest) hedef modelin kotasını kullanır, ona eklenir. Sınırına ulaşmış her model (20 RPD'li
// Flash'lar dahil) tur başında gunlukDolu'ya girer: dolu modeli yeniden keşfetmek için bir 429 harcanmaz.
// İstemci payı biten kapasite modelini atlar (modelPayiVar); bot yeni habere başlamadan geminiPayiBitti() sorar ve
// iki Flash-Lite da bitmişse kalan haberler görülmedi kalır, sonraki turda yazılır. Saate ulaşılamazsa güvenli
// varsayılan: her kapasite modeline sınır × 0,8 / 12. Bu dosya dört botta aynıdır.
import { modelHarcamasi, gunlukDolu } from './kullanim.mjs';
import { MODELLER, KAPASITE, TAKMA_ADLAR } from './modeller.mjs';

export const PAY_ORANI = 0.8;
const TUR_ARALIGI_SAAT = 2; // saat botları iki saatte bir tetikler
const VARSAYILAN_TUR = 12;
const TABAN = 10; // ön yüklemede sonraki her tura bırakılan en az çağrı

let pay = {}; // model → tur payı; butceYukle çağrılmadıysa boş = sınır yok (testler, yerel araçlar)

// Google'ın günlük sayacı Pasifik gece yarısında sıfırlanır.
export function pasifikKalanSaat(simdi = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(simdi)
      .map((x) => [x.type, Number(x.value)]),
  );
  return 24 - (p.hour + p.minute / 60 + p.second / 3600);
}

export function turPayi({ kullanilan, simdi = new Date(), sinir }) {
  const kalan = Math.floor(sinir * PAY_ORANI) - kullanilan;
  const turlar = Math.max(1, Math.ceil(pasifikKalanSaat(simdi) / TUR_ARALIGI_SAAT));
  const esit = Math.floor(kalan / turlar);
  const onden = Math.floor(kalan / Math.ceil(turlar / 2));
  const tavan = kalan - (turlar - 1) * TABAN;
  return Math.max(0, Math.min(onden, Math.max(esit, tavan)));
}

// Saatin model satırından günlük kullanım: başarılı + başarısız.
const harcanmis = (r) => (Number(r?.cagri) || 0) + (Number(r?.h429) || 0) + (Number(r?.h503) || 0);
const kisa = (m) => m.replace(/^gemini-/, '');

// Döner: log satırı. Hiçbir durumda hata fırlatmaz.
export async function butceYukle({ url, anahtar, site, simdi = new Date(), fetchFn = fetch } = {}) {
  const sinir = (m) => Number(process.env.GEMINI_GUNLUK_SINIR) || MODELLER[m].rpd;
  const elle = Number(process.env.GEMINI_TUR_PAYI);
  if (process.env.GEMINI_TUR_PAYI && Number.isInteger(elle) && elle >= 0) {
    pay = Object.fromEntries(KAPASITE.map((m) => [m, elle]));
    return `Gemini bütçesi: bu tur payı model başına ${elle} çağrı (GEMINI_TUR_PAYI)`;
  }
  const varsayilan = (neden) => {
    pay = Object.fromEntries(KAPASITE.map((m) => [m, Math.floor((sinir(m) * PAY_ORANI) / VARSAYILAN_TUR)]));
    return `Gemini bütçesi: ${neden}; güvenli varsayılan, bu tur payı ${KAPASITE.map((m) => `${kisa(m)} ${pay[m]}`).join(', ')}`;
  };
  if (!url || !anahtar) return varsayilan('motor ayarı yok');
  try {
    const res = await fetchFn(`${url.replace(/\/$/, '')}/motor/${site}/gemini`, {
      headers: { Authorization: `Bearer ${anahtar}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return varsayilan(`saat ${res.status} döndü`);
    const j = await res.json();
    const kullanilan = {};
    for (const [ad, r] of Object.entries(j?.modeller ?? {})) {
      const m = TAKMA_ADLAR[ad] ?? ad;
      kullanilan[m] = (kullanilan[m] ?? 0) + harcanmis(r);
    }
    for (const [m, n] of Object.entries(kullanilan)) if (MODELLER[m] && n >= MODELLER[m].rpd) gunlukDolu.add(m);
    pay = Object.fromEntries(KAPASITE.map((m) => [m, turPayi({ kullanilan: kullanilan[m] ?? 0, simdi, sinir: sinir(m) })]));
    const satirlar = KAPASITE.map((m) => `${kisa(m)} ${kullanilan[m] ?? 0}/${sinir(m)} (pay ${pay[m]})`);
    return `Gemini bütçesi (Google günü ${j?.gun ?? '?'}): ${satirlar.join(', ')}`;
  } catch {
    return varsayilan('saate ulaşılamadı');
  }
}

// Bu süreçteki harcama, takma adla yapılan çağrılar (GEMINI_ZINCIR=0 yolu) hedef modele eklenerek.
const harcanan = (m) =>
  modelHarcamasi(m) + Object.entries(TAKMA_ADLAR).reduce((t, [ad, hedef]) => t + (hedef === m ? modelHarcamasi(ad) : 0), 0);

// Kapasite dışı modeller (Flash yedekleri, Gemma) bütçeye girmez; günlük kotalarını gunlukDolu korur.
export const modelPayiVar = (model) => {
  const m = TAKMA_ADLAR[model] ?? model;
  return !(m in pay) || harcanan(m) < pay[m];
};

// İki Flash-Lite da payını bitirdi ya da günlük kotası doldu: yeni habere başlanmaz.
const dolu = (m) => gunlukDolu.has(m) || Object.entries(TAKMA_ADLAR).some(([ad, hedef]) => hedef === m && gunlukDolu.has(ad));
export const geminiPayiBitti = () => KAPASITE.every((m) => dolu(m) || !modelPayiVar(m));
export const butceDurumu = () => ({ pay: { ...pay }, harcanan: Object.fromEntries(KAPASITE.map((m) => [m, harcanan(m)])) });
