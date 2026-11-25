// Kaynak: mecmua/site-ortak/duzeltme/duzeltme.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Cümle düzeltmeli dil redaksiyonu (25 Kasım 2026). Redaksiyon modeli alanları baştan yazmaz; yalnız değiştirdiği
// cümleleri { alan, eski, yeni } olarak döndürür, bu modül onları metne uygular.
//
// Neden: alanların tamamını yeniden üreten küçük model iki yerde şaşıyordu. Ya kendini tekrar edip çıkış tavanına
// çarpıyordu (jendume'de turda 3–9 kez), ya da metni %10–20 kısaltıyordu (uzunluk kapısı redaksiyonu atıyordu).
// Düzeltme listesi kısadır (kaçak yanıt pratikte kalmaz), model cümle silemez ve olmayan cümle ekleyemez.
//
//   DUZELTME_SEMASI                    Gemini responseSchema
//   duzeltmeBicimi(dil)                istemin sonuna eklenecek çıktı biçimi talimatı ('tr' | 'nb' | 'en')
//   duzeltmeleriUygula(alanlar, liste) { alanlar, uygulanan, atlanan: [{ neden, eski? }] }
//
// alanlar: { <ad>: string | string[] } (dizi alan: key_points gibi; düzeltme her öğede aranır). Dönen alanlar yeni
// nesnedir; girdi değişmez. Uygulanmayan düzeltme atlanır ve nedeni döner (yayını durdurmaz; kapılar sonuca bakar).

export const DUZELTME_SEMASI = {
  type: 'object',
  properties: {
    duzeltmeler: {
      type: 'array',
      items: {
        type: 'object',
        properties: { alan: { type: 'string' }, eski: { type: 'string' }, yeni: { type: 'string' } },
        required: ['alan', 'eski', 'yeni'],
      },
    },
  },
  required: ['duzeltmeler'],
};

export const EN_COK_DUZELTME = 30;
const EN_UZUN_ESKI = 700; // karakter: bir cümle ya da kısa bir cümle grubu; paragraf değil
const ALT_ORAN = 0.6; // yeni / eski sözcük sayısı: cümle silinemez, yarıya indirilemez
const UST_ORAN = 1.6; // cümle şişirilemez

const sozcukSay = (s) => String(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

const BICIM = {
  tr: `ÇIKTI BİÇİMİ: Metni yeniden yazma. Yalnız düzeltilmesi gereken cümleleri döndür:
- "alan": cümlenin bulunduğu alanın adı (yukarıdaki JSON'daki ad).
- "eski": metindeki cümle, birebir; tek karakterini değiştirme, kısaltma (kod onu metinde arar, bulamazsa düzeltme uygulanmaz).
- "yeni": aynı cümlenin düzeltilmiş hâli.
Kurallar: cümle silme, yeni cümle ekleme, iki cümleyi bir düzeltmede birleştirme. Değişmeyecek cümleyi listeye koyma. Düzeltilecek bir şey yoksa boş liste döndür. En çok ${EN_COK_DUZELTME} düzeltme.`,
  nb: `UTDATAFORMAT: Ikke skriv teksten på nytt. Returner bare setningene som skal rettes:
- "alan": navnet på feltet setningen står i (navnet i JSON-en over).
- "eski": setningen slik den står i teksten, tegn for tegn; ikke endre eller forkort den (koden søker etter den, og finner den den ikke, brukes ikke rettelsen).
- "yeni": den rettede setningen.
Regler: ikke slett setninger, ikke legg til nye, ikke slå sammen to setninger i én rettelse. Ikke ta med setninger som ikke endres. Er det ingenting å rette, returner en tom liste. Høyst ${EN_COK_DUZELTME} rettelser.`,
  en: `OUTPUT FORMAT: Do not rewrite the text. Return only the sentences that need correcting:
- "alan": the name of the field the sentence is in (the name in the JSON above).
- "eski": the sentence exactly as it appears in the text, character for character; do not change or shorten it (the code searches for it, and if it is not found the correction is not applied).
- "yeni": the corrected sentence.
Rules: do not delete sentences, do not add new ones, do not merge two sentences in one correction. Do not list sentences that stay the same. If there is nothing to correct, return an empty list. At most ${EN_COK_DUZELTME} corrections.`,
};

export function duzeltmeBicimi(dil = 'tr') {
  const b = BICIM[dil];
  if (!b) throw new Error(`duzeltme: bilinmeyen dil: ${dil}`);
  return b;
}

const kac = (metin, parca) => {
  let n = 0;
  for (let i = metin.indexOf(parca); i !== -1; i = metin.indexOf(parca, i + parca.length)) n++;
  return n;
};

/**
 * Düzeltmeleri sırayla uygular. Her düzeltme yalnız eski metin alanın içinde tam bir kez geçiyorsa uygulanır
 * (dizi alanda: tam bir öğede, o öğede bir kez).
 */
// Uzunluk bütçesi (26 Kasım 2026): her düzeltme tek başına %60–160 içinde kalsa da birkaçı birlikte gövdeyi kısaltıp
// sitenin uzunluk kapısına (%90–115, en az N kelime) takılıyordu; kapı bütün redaksiyonu atıyordu. sinirlar verilirse
// alanın sözcük sayısı her düzeltmeden sonra { alt, ust } içinde kalmalı; kalmayacaksa yalnız o düzeltme atlanır.
// Kısaltan düzeltmeler en son ve en azı kısaltandan başlayarak denenir: bütçe en çok düzeltmeye yetsin.
export const sozcukSayisi = (s) => (Array.isArray(s) ? s.join(' ') : sozcukSay(s ?? ''));

/** Gövde bütçesi: alt = önceki uzunluğun %93'ü ve (önceden aşıyorsa) site alt sınırı + 3; üst = %112. */
export function govdeSiniri(metin, siteEnAz = 0) {
  const n = sozcukSay(metin ?? '');
  const alt = Math.max(Math.ceil(n * 0.93), n >= siteEnAz + 3 ? siteEnAz + 3 : Math.min(n, siteEnAz));
  return { alt: Math.min(alt, n), ust: Math.floor(n * 1.12) };
}

export function duzeltmeleriUygula(alanlar, liste, { sinirlar = {} } = {}) {
  const yeni = {};
  for (const [k, v] of Object.entries(alanlar ?? {})) yeni[k] = Array.isArray(v) ? [...v] : v;
  const atlanan = [];
  let uygulanan = 0;
  const ham = Array.isArray(liste) ? liste : [];
  if (!Array.isArray(liste)) atlanan.push({ neden: 'düzeltme listesi yok' });
  if (ham.length > EN_COK_DUZELTME) atlanan.push({ neden: `${ham.length - EN_COK_DUZELTME} düzeltme sınırın (${EN_COK_DUZELTME}) üstünde, atlandı` });
  const fark = (d) => sozcukSay(typeof d?.yeni === 'string' ? d.yeni : '') - sozcukSay(typeof d?.eski === 'string' ? d.eski : '');
  const dizi = Object.keys(sinirlar).length
    ? ham.slice(0, EN_COK_DUZELTME).map((d, i) => [d, i]).sort((a, b) => fark(b[0]) - fark(a[0]) || a[1] - b[1]).map(([d]) => d)
    : ham.slice(0, EN_COK_DUZELTME);
  for (const d of dizi) {
    const alan = typeof d?.alan === 'string' ? d.alan.trim() : '';
    const eski = typeof d?.eski === 'string' ? d.eski : '';
    const yeniMetin = typeof d?.yeni === 'string' ? d.yeni.trim() : '';
    const atla = (neden) => atlanan.push({ neden, ...(eski ? { eski: eski.slice(0, 120) } : {}) });
    if (!Object.hasOwn(yeni, alan)) { atla(`bilinmeyen alan: ${alan || '(boş)'}`); continue; }
    if (!eski.trim()) { atla('eski boş'); continue; }
    if (eski.length > EN_UZUN_ESKI) { atla('eski çok uzun (cümle değil, paragraf)'); continue; }
    if (!yeniMetin) { atla('yeni boş (cümle silinemez)'); continue; }
    if (yeniMetin === eski.trim()) continue; // değişiklik yok: sayılmaz
    const a = sozcukSay(eski), b = sozcukSay(yeniMetin);
    if (a && (b < a * ALT_ORAN || b > a * UST_ORAN)) { atla(`uzunluk ${a} → ${b} sözcük (izin %${ALT_ORAN * 100}–${UST_ORAN * 100})`); continue; }
    const v = yeni[alan];
    const sinir = sinirlar[alan];
    if (sinir && !Array.isArray(v) && typeof v === 'string' && kac(v, eski) === 1) {
      const sonra = sozcukSay(v.replace(eski, () => yeniMetin));
      if (sonra < sinir.alt || sonra > sinir.ust) { atla(`uzunluk bütçesi: ${alan} ${sonra} sözcük olurdu (izin ${sinir.alt}–${sinir.ust})`); continue; }
    }
    if (Array.isArray(v)) {
      const yerler = v.map((x, i) => (typeof x === 'string' ? [i, kac(x, eski)] : [i, 0])).filter(([, n]) => n > 0);
      if (yerler.length !== 1 || yerler[0][1] !== 1) { atla(yerler.length ? 'eski birden çok yerde geçiyor' : 'eski metinde bulunamadı'); continue; }
      const i = yerler[0][0];
      v[i] = v[i].replace(eski, () => yeniMetin);
    } else if (typeof v === 'string') {
      const n = kac(v, eski);
      if (n !== 1) { atla(n ? 'eski birden çok yerde geçiyor' : 'eski metinde bulunamadı'); continue; }
      yeni[alan] = v.replace(eski, () => yeniMetin);
    } else {
      atla(`alan metin değil: ${alan}`);
      continue;
    }
    uygulanan++;
  }
  return { alanlar: yeni, uygulanan, atlanan };
}
