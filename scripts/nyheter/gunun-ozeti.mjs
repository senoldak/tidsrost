// Kaynak: mecmua/site-ortak/ozet/gunun-ozeti.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Günün Özeti (Telegram, 20:45 işi): kifobu, finfolis, jendume ve tidsrost'ta (Norveççe Dagens oppsummering) aynı saf mantık. Paragraf istemi ve kod
// denetimi, yedek paragraf, kapakta başlık sığdırma ("…" yok) ve gün sayfasını mecmua-saat kuyruğuna bildirme.
// Siteye özel olan (haberleri okumak, Gemini çağrısı, dil kapısı, dosya yazmak) sitenin gunun-ozeti-is.mjs'indedir.

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const KONU = {
  kifobu: 'girişimler, girişim yatırımları ve kitle fonlaması',
  finfolis: 'ekonomi ve finansal piyasalar',
  jendume: 'yapay zekâ',
  tidsrost: 'Norge og verden: innenriks, utenriks, økonomi og samfunn',
};
/** Sitenin dili: tidsrost Norveççe (bokmål), öbürleri Türkçe. */
export const siteDili = (site) => (site === 'tidsrost' ? 'nb' : 'tr');
export const AZAMI_PARAGRAF = 600;

/** İstanbul takvim günü, YYYY-AA-GG. */
export const istanbulGunu = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(d);
/** Oslo takvim günü, YYYY-AA-GG (tidsrost). */
export const osloGunu = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(d);
export const ozetSlug = (tarih) => `gunun-ozeti-${tarih}`;
/** "2026-11-13" → "13 Kasım 2026". */
export function trTarih(tarih) {
  const [y, a, g] = tarih.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
}

export const OZET_SEMASI = {
  type: 'OBJECT',
  properties: {
    paragraf: { type: 'STRING' },
    kimlikler: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['paragraf', 'kimlikler'],
};

export function ozetIstemi({ site, haberler }) {
  const konu = KONU[site];
  if (!konu) throw new Error(`bilinmeyen site: ${site}`);
  if (siteDili(site) === 'nb') {
    const sistem =
      `Du skriver dagens oppsummering for et nyhetsnettsted. Tema: ${konu}. Bruk bare opplysninger fra titlene og ` +
      'ingressene du får; ikke legg til tall, navn, datoer eller vurderinger. Skriv nøkternt, klart nyhetsspråk på bokmål. ' +
      'Ikke tiltal leseren, ikke still spørsmål, ikke bruk overdrivelser eller rosende ord, ikke nevn nyhetskilder. Velg ' +
      'dagens 3–5 viktigste saker og skriv ett avsnitt på 3–5 setninger (høyst 550 tegn). Skriv tall slik kilden gjør ' +
      '(10,57 kroner, 2,5 prosent). I feltet kimlikler skriver du id-ene til sakene du omtaler, i samme rekkefølge som i avsnittet.';
    const istem = haberler.map((h) => `id: ${h.id}\ntittel: ${h.baslik}\ningress: ${h.ozet}`).join('\n\n');
    return { sistem, istem };
  }
  const sistem =
    `Bir haber sitesinin gün sonu özetini yazıyorsun. Konu: ${konu}. Yalnız verilen haberlerin başlık ve özetlerindeki ` +
    'bilgileri kullan; başka rakam, ad, tarih, yorum ekleme. Haber dilinde, düz ve akıcı Türkçe yaz. Okura hitap etme, ' +
    'soru sorma, abartı ve övgü sözcükleri kullanma, yatırım tavsiyesi verme, haber kaynağı adı yazma. Günün en önemli ' +
    '3–5 haberini seç ve 3–5 tümcelik tek bir paragraf yaz (en çok 550 karakter). Rakamları kaynaktaki gibi yaz ' +
    '(1 milyar dolar, %2,5). Kimlikler alanına paragrafta anlattığın haberlerin kimliklerini paragraf sırasıyla yaz.';
  const istem = haberler.map((h) => `kimlik: ${h.id}\nbaşlık: ${h.baslik}\nözet: ${h.ozet}`).join('\n\n');
  return { sistem, istem };
}

const kucuk = (s, dil = 'tr') => s.toLocaleLowerCase(dil === 'nb' ? 'nb' : 'tr');
const SOZCUK = /[\p{L}\d][\p{L}\d-]*(?:['’][\p{L}]+)?/gu;
const ekiAt = (s) => s.replace(/['’][\p{L}]+$/u, '');
const tumceler = (p) => p.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
const HITAP = /(^|[^\p{L}])(siz|sizi|size|sizin|sizler|okur\p{L}*)(?=[^\p{L}]|$)/iu;
const HITAP_NB = /(^|[^\p{L}])(du|deg|din|ditt|dine|dere|leser\p{L}*)(?=[^\p{L}]|$)/iu;
const BUYUK = /^[A-ZÇĞİÖŞÜÆØÅ]/u;
const ICTE_BUYUK = /^.[\p{L}\d-]*[A-ZÇĞİÖŞÜÆØÅ]/u;

/** Paragraf yalnız seçilen haberlerin bilgisini taşıyor mu: rakamlar, özel adlar, biçim. */
export function paragrafDenetle({ paragraf, kimlikler, haberler, dil = 'tr' }) {
  const sorunlar = [];
  const p = String(paragraf ?? '').trim();
  const secilen = haberler.filter((h) => kimlikler?.includes(h.id));
  if (!Array.isArray(kimlikler) || kimlikler.length < 1 || kimlikler.length > 5) sorunlar.push('kimlik sayısı 1–5 değil');
  else if (secilen.length !== kimlikler.length) sorunlar.push('bilinmeyen kimlik');
  if (p.length < 120 || p.length > AZAMI_PARAGRAF) sorunlar.push(`uzunluk ${p.length}`);
  const t = tumceler(p);
  if (t.length < 3 || t.length > 5) sorunlar.push(`tümce sayısı ${t.length}`);
  if (/…|\.\.\./.test(p)) sorunlar.push('üç nokta');
  if ((dil === 'nb' ? HITAP_NB : HITAP).test(p)) sorunlar.push('okura hitap');

  const kaynak = secilen.map((h) => `${h.baslik} ${h.ozet}`).join(' ');
  const kaynakSayilar = new Set(kaynak.match(/\d+(?:[.,]\d+)*/g) ?? []);
  for (const s of p.match(/\d+(?:[.,]\d+)*/g) ?? []) if (!kaynakSayilar.has(s)) sorunlar.push(`rakam: ${s}`);

  const kaynakSozcukler = new Set((kaynak.match(SOZCUK) ?? []).map((w) => kucuk(ekiAt(w), dil)));
  for (const tumce of t) {
    const sozcukler = tumce.match(SOZCUK) ?? [];
    sozcukler.forEach((w, i) => {
      if (!BUYUK.test(w)) return;
      // Tümce başındaki büyük harf ad olduğunu göstermez; kesme işareti ya da içte ikinci büyük harf (OpenAI, AMD,
      // Q-CTRL) varsa addır.
      if (i === 0 && !/['’]/.test(w) && !ICTE_BUYUK.test(w)) return;
      const kok = ekiAt(w);
      if (!kaynakSozcukler.has(kucuk(kok, dil))) sorunlar.push(`ad: ${kok}`);
    });
  }
  return { gecerli: sorunlar.length === 0, sorunlar };
}

/** azami karakteri aşan paragrafı son tümceden kısaltır; tümce ortasından kesmez. */
export function paragrafKisalt(paragraf, azami = AZAMI_PARAGRAF) {
  const p = paragraf.trim();
  if (p.length <= azami) return p;
  const t = tumceler(p);
  let sonuc = t[0];
  for (const x of t.slice(1)) {
    if (`${sonuc} ${x}`.length > azami) break;
    sonuc = `${sonuc} ${x}`;
  }
  return sonuc;
}

/** Gemini yazamazsa ya da paragraf denetimden geçmezse: ilk üç haberin başlığı olduğu gibi. */
export function yedekParagraf(haberler, dil = 'tr') {
  const uc = haberler.slice(0, 3);
  const nokta = (b) => (/[.!?]$/.test(b.trim()) ? b.trim() : `${b.trim()}.`);
  return { paragraf: `${dil === 'nb' ? 'Dagens viktigste saker:' : 'Günün öne çıkanları:'} ${uc.map((h) => nokta(h.baslik)).join(' ')}`, kimlikler: uc.map((h) => h.id) };
}

/** Kapakta önce paragrafta anlatılan haberler (paragraf sırasıyla), sonra kalanlar verilen sırayla. */
export function kapakSirasi(haberler, kimlikler) {
  const one = kimlikler.map((k) => haberler.find((h) => h.id === k)).filter(Boolean);
  return [...one, ...haberler.filter((h) => !one.includes(h))];
}

/**
 * Kapağa sığan başlıklar: azamiSatir'ı aşan başlık atlanır, sigar(ogeler) false olunca durulur, en çok azamiOge.
 * Hiçbir başlık kesilmez; kapağa girmeyenler kalan sayısına eklenir.
 */
export function listeSigdir({ basliklar, toplam, satirla, sigar, azamiSatir = 2, azamiOge = 4 }) {
  const ogeler = [];
  for (const baslik of basliklar) {
    if (ogeler.length >= azamiOge) break;
    const satirlar = satirla(baslik);
    if (satirlar.length > azamiSatir) continue;
    const aday = [...ogeler, { baslik, satirlar }];
    if (!sigar(aday)) break;
    ogeler.push({ baslik, satirlar });
  }
  return { ogeler, kalan: Math.max(0, toplam - ogeler.length) };
}

/**
 * Gün sayfasını mecmua-saat dağıtım kuyruğuna bildirir; geçici hatada üç kez dener (tek bir ağ hatası o günün
 * iletisini kaybettirmesin). Hata fırlatmaz; başarıda true.
 */
// slug: verilmezse o günün (İstanbul) özet slug'ı; tidsrost Oslo gününü ve bülten slug'ını (oversikt-…) kendisi verir.
export async function ozetBildir({ url, anahtar, site, sayfaUrl, simdi = new Date(), slug = ozetSlug(istanbulGunu(simdi)), fetchFn = fetch, bekle = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  if (!url || !anahtar) return false;
  const govde = JSON.stringify({ yazilar: [{ slug, url: sayfaUrl, tarih: simdi.toISOString() }] });
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      const res = await fetchFn(`${url.replace(/\/$/, '')}/motor/${site}/kaydet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${anahtar}` },
        body: govde,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return true;
    } catch {
      // ağ hatası: yeniden dene
    }
    if (deneme < 3) await bekle(deneme * 5_000);
  }
  return false;
}
