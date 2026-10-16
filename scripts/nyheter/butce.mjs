// Katman 3 (Gemini kota planı): bütçe yöneticisi. Tur başında saatten sitenin bugünkü (Google günü, Pasifik saati)
// ana model kullanımını okur ve bu turun Gemini payını hesaplar:
//   pay = (günlük sınır × 0,8 − bugün kullanılan) / günün kalan tur sayısı
// %20'lik pay elle çalıştırmalar ve sürprizler için kalır. Harcanmayan pay kendiliğinden sonraki turlara devreder.
// Bot, yeni bir habere başlamadan önce geminiPayiBitti() sorar; doluysa kalan haberler görülmedi kalır ve sonraki
// turda yazılır. Saate ulaşılamazsa güvenli varsayılan: sınır × 0,8 / 12. Bu dosya dört botta aynıdır.
import { kullanim } from './kullanim.mjs';

// Ücretsiz katman, proje başına günlük istek sınırı (AI Studio, 2026-10-16). Ana model Flash Lite.
export const GUNLUK_SINIR = { 'gemini-flash-lite-latest': 500 };
export const PAY_ORANI = 0.8;
const TUR_ARALIGI_SAAT = 2; // saat botları iki saatte bir tetikler
const VARSAYILAN_TUR = 12;

let pay = Infinity; // butceYukle çağrılmadıysa sınır yok (testler, yerel araçlar)

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
  return Math.max(0, Math.floor(kalan / turlar));
}

// Döner: log satırı. Hiçbir durumda hata fırlatmaz.
export async function butceYukle({ url, anahtar, site, simdi = new Date(), fetchFn = fetch } = {}) {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const sinir = Number(process.env.GEMINI_GUNLUK_SINIR) || GUNLUK_SINIR[model] || GUNLUK_SINIR['gemini-flash-lite-latest'];
  const elle = Number(process.env.GEMINI_TUR_PAYI);
  if (process.env.GEMINI_TUR_PAYI && Number.isInteger(elle) && elle >= 0) {
    pay = elle;
    return `Gemini bütçesi: bu tur payı ${pay} çağrı (GEMINI_TUR_PAYI)`;
  }
  const varsayilan = (neden) => {
    pay = Math.floor((sinir * PAY_ORANI) / VARSAYILAN_TUR);
    return `Gemini bütçesi: ${neden}; güvenli varsayılan, bu tur payı ${pay} çağrı`;
  };
  if (!url || !anahtar) return varsayilan('motor ayarı yok');
  try {
    const res = await fetchFn(`${url.replace(/\/$/, '')}/motor/${site}/gemini`, {
      headers: { Authorization: `Bearer ${anahtar}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return varsayilan(`saat ${res.status} döndü`);
    const j = await res.json();
    const kullanilan = Number(j?.modeller?.[model]?.cagri) || 0;
    pay = turPayi({ kullanilan, simdi, sinir });
    return `Gemini bütçesi: bugün ${kullanilan}/${sinir} çağrı kullanıldı (Google günü ${j?.gun ?? '?'}), bu tur payı ${pay} çağrı`;
  } catch {
    return varsayilan('saate ulaşılamadı');
  }
}

export const geminiPayiBitti = () => kullanim.cagri >= pay;
export const butceDurumu = () => ({ pay, harcanan: kullanim.cagri });
