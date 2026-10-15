// Gemini kullanım ölçümü: her cevaptaki usageMetadata toplanır, süreç biterken log'a ve Actions özetine yazılır.
// Fiyatlar 1 milyon token başına dolar; GEMINI_FIYAT_GIRIS / GEMINI_FIYAT_CIKIS ile değiştirilebilir.
// Düşünme tokenları çıkış fiyatından faturalanır.
import { appendFileSync } from 'node:fs';

const fiyat = (ad, varsayilan) => {
  const n = Number(process.env[ad]);
  return Number.isFinite(n) && n >= 0 && process.env[ad] ? n : varsayilan;
};
const FIYAT_GIRIS = fiyat('GEMINI_FIYAT_GIRIS', 0.1);
const FIYAT_CIKIS = fiyat('GEMINI_FIYAT_CIKIS', 0.4);

export const kullanim = { cagri: 0, giris: 0, cikis: 0, dusunme: 0 };

export function kullanimEkle(u) {
  kullanim.cagri++;
  kullanim.giris += u?.promptTokenCount ?? 0;
  kullanim.cikis += u?.candidatesTokenCount ?? 0;
  kullanim.dusunme += u?.thoughtsTokenCount ?? 0;
}

export function kullanimOzeti() {
  const { cagri, giris, cikis, dusunme } = kullanim;
  const dolar = (giris * FIYAT_GIRIS + (cikis + dusunme) * FIYAT_CIKIS) / 1e6;
  const n = (x) => x.toLocaleString('tr-TR');
  return `Gemini: ${cagri} çağrı, ${n(giris)} giriş / ${n(cikis + dusunme)} çıkış token (düşünme ${n(dusunme)}), ~$${dolar.toFixed(4)}`;
}

// process.exit ile biten betiklerde de çalışsın diye 'exit' olayı (yalnızca eşzamanlı yazma).
process.on('exit', () => {
  if (!kullanim.cagri) return;
  const satir = kullanimOzeti();
  console.log(`\n${satir}`);
  try {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n**${satir}**\n`);
  } catch {
    // özet yazılamazsa log yeter
  }
});
