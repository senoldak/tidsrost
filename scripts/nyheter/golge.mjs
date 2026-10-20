// Gölge denetim (Katman 4 denemesi, 20 Ekim 2026): GEMINI_GOLGE=N ise bir turda en çok N denetim kararı Gemma'ya da
// sorulur. Yayına yalnız ana modelin kararı girer; Gemma'nın kararı karşılaştırma için loga yazılır (yalnız evet/hayır,
// içerik yok). Gemma'nın dakikada 16 bin token sınırı için iki gölge çağrısı arasında en az GOLGE_ARALIK_MS geçer;
// arada gelen karar atlanır (beklenmez, tur uzamasın). Gölge çağrısı tek denemedir; 429/5xx sayaçlara ve alarma girmez.
const GOLGE_ARALIK_MS = 40_000;
let hak = Number(process.env.GEMINI_GOLGE || 0);
let son = 0;
const sayac = { karar: 0, ayni: 0, anaEvet: 0, anaHayir: 0 };

const kararlar = (r) => (r && typeof r === 'object' && !Array.isArray(r) ? Object.entries(r).filter(([, v]) => typeof v === 'boolean') : []);

export function golgeSirasi(simdi = Date.now()) {
  if (hak <= 0 || simdi - son < GOLGE_ARALIK_MS) return false;
  hak--;
  son = simdi;
  return true;
}

// Testler için: hakkı ve sayacı sıfırlar.
export function golgeKur(n) {
  hak = n;
  son = 0;
  Object.assign(sayac, { karar: 0, ayni: 0, anaEvet: 0, anaHayir: 0 });
  return sayac;
}

export async function golge(amac, ana, cagir) {
  const a = kararlar(ana);
  if (!a.length || !golgeSirasi()) return;
  let g = null;
  try {
    g = await cagir();
  } catch {
    // gölge düşerse yayın etkilenmez
  }
  const b = new Map(kararlar(g));
  if (!b.size) {
    console.log(`  gölge ${amac}: Gemma yanıt vermedi`);
    return;
  }
  for (const [k, v] of a) {
    if (!b.has(k)) continue;
    sayac.karar++;
    if (b.get(k) === v) sayac.ayni++;
    else if (v) sayac.anaEvet++;
    else sayac.anaHayir++;
    console.log(`  gölge ${amac} ${k}: ana=${v ? 'evet' : 'hayır'} gemma=${b.get(k) ? 'evet' : 'hayır'}`);
  }
}

process.on('exit', () => {
  if (sayac.karar) console.log(`Gemma gölge: ${sayac.karar} karar, ${sayac.ayni} aynı; ana evet/Gemma hayır ${sayac.anaEvet}, ana hayır/Gemma evet ${sayac.anaHayir}`);
});
