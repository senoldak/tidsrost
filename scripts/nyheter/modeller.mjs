// Kaynak: mecmua/site-ortak/gemini/modeller.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gemini yönlendirici (Faz 1, 25 Ekim 2026): hangi iş hangi modelleri hangi sırayla dener. Her site yalnız kendi
// projesinin modellerini kullanır; sınırlar ücretsiz katman, proje başına (AI Studio Rate Limit sayfası, 2026-10-25).
// Tasarım: mecmua/docs/superpowers/specs/2026-10-25-gemini-yonlendirici-faz1-design.md.
// Saat Worker'ı KAPASITE ve sınırların kendi kopyasını tutar (saat/src/gemini-alarm.js); değişirse ikisi birlikte.

// sure: yedek halkada tek denemenin zaman aşımı (sn); zincirin ilk halkası her zaman ILK_HALKA_SURE bekler.
// semasiz: responseSchema ve düşünme ayarı gönderilmez (Gemma şemalı istekte boş döndü, 25 Ekim denemesi).
export const MODELLER = {
  'gemini-3.5-flash-lite': { rpd: 500, rpm: 15, sure: 120 },
  'gemini-3.1-flash-lite': { rpd: 500, rpm: 15, sure: 120 },
  'gemini-3.6-flash': { rpd: 20, rpm: 5, sure: 90 },
  'gemini-3-flash-preview': { rpd: 20, rpm: 5, sure: 90 },
  'gemma-4-26b-a4b-it': { rpd: 14_400, rpm: 30, sure: 60, tpm: 16_000, semasiz: true },
};

// Meşru uzun yanıtlar (kontrol masası ~8,5K çıkış token'ı, olay gruplama 20–30K giriş) ilk halkada bugün olduğu gibi
// 180 sn bekler; kısa süre yalnız yedeklere uygulanır.
export const ILK_HALKA_SURE = 180;

export const ZINCIRLER = {
  yazim: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3-flash-preview'],
  denetim: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it'],
  uzun: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'],
};

// Bütçenin saydığı ana iş atları; Flash'lar (20 RPD) ve Gemma yalnız yedektir.
export const KAPASITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

// Takma ad hedef modelin kotasını kullanır (16 Ekim: AI Studio 3.5 Flash-Lite = D1'deki -latest sayısı).
export const TAKMA_ADLAR = { 'gemini-flash-lite-latest': 'gemini-3.5-flash-lite' };

// Bütçenin saydığı modeller bu süreçte: GEMINI_ZINCIR=0 (eski düzen) iki Flash-Lite'ı değil yalnız ana modeli kullanır;
// 3.1 kapasite sayılsaydı hiç harcanmadığı için pay kapısı hiç kapanmazdı (son gözden geçirme, 25 Ekim).
export function kapasiteSec(env = process.env) {
  if (env.GEMINI_ZINCIR !== '0') return [...KAPASITE];
  const ana = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  return [TAKMA_ADLAR[ana] ?? ana];
}

// İstem + sistem bu kadar karakteri aşarsa "uzun" zincir (≈ 12K token).
export const UZUN_ESIK = 48_000;

export function zincirSec({ denetim = false, uzunluk = 0, env = process.env } = {}) {
  // Geri dönüş: GEMINI_ZINCIR=0 iken 25 Ekim öncesi düzen (ana model + tek yedek).
  if (env.GEMINI_ZINCIR === '0') {
    const yedek = denetim ? env.GEMINI_DENETIM_YEDEK_MODEL || 'gemma-4-26b-a4b-it' : env.GEMINI_YEDEK_MODEL || 'gemini-flash-latest';
    return [env.GEMINI_MODEL || 'gemini-flash-lite-latest', yedek];
  }
  const zincir = uzunluk > UZUN_ESIK ? ZINCIRLER.uzun : denetim ? ZINCIRLER.denetim : ZINCIRLER.yazim;
  return env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...zincir.filter((m) => m !== env.GEMINI_MODEL)] : [...zincir];
}
