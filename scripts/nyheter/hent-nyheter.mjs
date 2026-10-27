// Açık kamu verilerinden haber üretir ve src/content/haberler altına yazar.
// Kullanım: node scripts/nyheter/hent-nyheter.mjs [--torr]   (--torr: dosya yazmadan sadece listeler)
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL, MAKS_PER_KJORING (varsayılan 12), SURE_DK (varsayılan 15),
// KILDE_NOKKEL (haber sitelerinin şifreli listesi; bkz. hemmelig.mjs)
import path from 'node:path';
import { writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gommeTurSonu } from './vektorler.mjs';
import { lesJsonFil, mdKacir } from './lib.mjs';
import { butceYukle, geminiPayiBitti } from './butce.mjs';
import { acilDurdurma } from './kapi.mjs';
import { uyarlayiciKur, yerelTur, durumuTemizle } from './uyarlayici.mjs';
import { turSec } from './motor-modu.mjs';
import { fjernAdresser } from './hemmelig.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const TILSTAND_FIL = path.join(HER, 'sett.json');

// Akış gövdesi uyarlayici.mjs'te (adaylar + isle); burası yerel çalıştırıcıdır: durum dosyası, bütçe ve Actions çıktıları.
// Dosya içe aktarılınca hiçbir şey çalışmaz; yalnız doğrudan çalıştırılınca tur başlar.
export async function main({ argv = process.argv, ortam = process.env } = {}) {
  const TORR = argv.includes('--torr');
  const MAKS = Number(ortam.MAKS_PER_KJORING || 12);
  const SURE_MS = Number(ortam.SURE_DK || 15) * 60_000;
  const BASLANGIC = Date.now();

  // Standartlar: acil durdurma bayrağı açıksa tur Gemini'ye ilk çağrıdan önce, hiçbir şey yazmadan ve commit etmeden biter.
  if (!TORR && (await acilDurdurma())) return 0;

  // Katman 3 (Gemini kota planı): bu turun Gemini payı; yeni habere başlamadan önce geminiPayiBitti() sorulur.
  if (!TORR) console.log(await butceYukle({ url: ortam.MOTOR_URL, anahtar: ortam.MOTOR_ANAHTARI, site: 'tidsrost' }));

  const tilstand = await lesJsonFil(TILSTAND_FIL, { sett: {}, feil: {}, kilder: {} });
  const u = uyarlayiciKur({ tilstand, simdi: new Date(), ayar: { rot: ROT, maks: MAKS, sureMs: SURE_MS, baslangic: BASLANGIC, torr: TORR } });
  // MOTOR_TUR=1: tur ortak motorla (MOTOR_DIZIN), aksi hâlde yerel tur. Motor modunda hata yerel tura düşmez; hatada da durum
  // ve yazılan haberler aşağıda yazılır (yerel durum kaybolmasın), GITHUB_OUTPUT antall verilir ve süreç hata koduyla çıkar.
  let turHatasi = null;
  let ayarHatasi = null;
  try {
    const r = await turSec({
      env: ortam,
      uyarlayici: u,
      durum: tilstand,
      simdi: u.simdi,
      rot: ROT,
      yerel: yerelTur,
      // Motorun surVar'ı varsayılan olarak hep true sayar; süre bütçesi ve Gemini turu payı sınırı burada verilir.
      surVar: () => Date.now() - BASLANGIC <= SURE_MS && !geminiPayiBitti(),
    });
    ayarHatasi = r?.ayarHatasi ?? null;
  } catch (e) {
    turHatasi = e;
    console.error(`Tur hatayla bitti: ${fjernAdresser(e?.message ?? e)}`);
  }
  const { antall, kortLagt, stoppListe, utkastListe, rettetListe, ventListe, standartElendi, feilListe } = u.ozet;

  durumuTemizle(tilstand);
  // Gemini Faz 2: yayımlanan haberlerin vektör dosyası (GOMME_VEKTOR=1) ve gömme önbelleği; hata turu düşürmez.
  if (!TORR) await gommeTurSonu({ kok: ROT, icerik: 'src/content/haberler', onbellekDosyasi: path.join(HER, 'gomme-onbellek.json'), env: ortam });
  if (!TORR) await writeFile(TILSTAND_FIL, JSON.stringify(tilstand, null, 2) + '\n', 'utf8');
  console.log(`Ferdig: ${antall} nye saker.`);
  if (ortam.GITHUB_OUTPUT) await appendFile(ortam.GITHUB_OUTPUT, `antall=${antall}\n`);
  // Actions çalışma sayfasında görünen özet.
  if (ortam.GITHUB_STEP_SUMMARY) {
    const ozet = [
      `### Nyhetsbot: ${antall} nye saker`,
      ...(kortLagt ? [`- 🗒️ Kort fortalt: ${kortLagt} kısa resmi duyuru eklendi`] : []),
      ...stoppListe.map((t) => `- ⛔ Yayınlanmadı (kaynakta olmayan rakam/alıntı), taslakta bekliyor: ${mdKacir(t)}`),
      ...utkastListe.map((t) => `- 📝 Taslak, kontrol edilip yayınlanmayı bekliyor: ${mdKacir(t)}`),
      ...rettetListe.map((t) => `- ✏️ Kontrol düzeltti ve yayınlandı: ${mdKacir(t)}`),
      ...ventListe.map((t) => `- ⏸️ Bekliyor (onay ya da standart denetimi alınamadı, sonraki turda yeniden denenir): ${mdKacir(t)}`),
      ...standartElendi.map((t) => `- 🚫 Standart süzgeci düşürdü: ${mdKacir(t)}`),
      ...feilListe.map((f) => `- ❌ ${mdKacir(f)}`),
    ].join('\n');
    await appendFile(ortam.GITHUB_STEP_SUMMARY, ozet + '\n');
  }
  if (ayarHatasi) throw ayarHatasi;
  if (turHatasi) return 1;
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await main().catch((e) => {
    console.error(e);
    return 1;
  }));
}
