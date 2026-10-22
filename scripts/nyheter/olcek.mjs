// Ölçek kontrolü (Standartlar Faz 1): tutar birimi çevrilirken değer 10 kat ya da daha fazla kaymış mı?
// Örnek: kaynakta "852 crore" (8,52 milyar), yazıda "852 milyar". Rakam kontrolü "852"yi kaynakta bulduğu için geçirir;
// bu kontrol tutarın birim kelimesiyle birlikte değerine bakar. Yalnız iki tarafta da birim kelimesi (bin, milyon,
// crore, lakh, billion, mrd …) olan tutarlar karşılaştırılır. Yazıdaki tutarın değeri kaynakta yoksa ama aynı
// anlamlı rakamlar kaynakta başka bir ölçekte geçiyorsa sorun yazılır. Yapay zekâsız; insan doğrulaması yok.

const SAYI = String.raw`\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*`;

// Kelime → çarpan. Önek eşleşmesi Türkçe ekleri de kapsar (milyarlık, milyona). nb: Norveççe "billioner" 10^12'dir;
// tekil "billion" İngilizce kaynakta 10^9 olduğu için nb'de de 10^9 sayılır.
const CARPANLAR = [
  [/^(?:trilyon|trillion|trn)/, 1e12],
  [/^(?:milyar|billion|bn\b|milliard|mrd)/, 1e9],
  [/^(?:crore|cr\b|crs\b)/, 1e7],
  [/^(?:milyon|million|millioner|mill\b|mn\b|mln\b|mio\b)/, 1e6],
  [/^(?:lakh|lac\b|lacs\b)/, 1e5],
  [/^(?:bin(?!a)|thousand|tusen)/, 1e3],
];
const CARPANLAR_NB = [[/^billioner/, 1e12], ...CARPANLAR];

function carpan(kelime, dil) {
  const k = kelime.toLocaleLowerCase('tr');
  for (const [re, c] of dil === 'nb' ? CARPANLAR_NB : CARPANLAR) if (re.test(k)) return c;
  return 0;
}

// "1.234,5" / "1,234.5" / "8,52" / "3 580": olası değerlerin hepsi (binlik ya da ondalık ayraç belirsiz olabilir).
function degerler(raw) {
  const s = raw.replace(/[  ]/g, '');
  const out = new Set();
  const ayraclar = s.match(/[.,]/g) ?? [];
  if (!ayraclar.length) return [Number(s)];
  const gruplar = s.split(/[.,]/);
  if (gruplar.slice(1).every((g) => g.length === 3)) out.add(Number(gruplar.join('')));
  const son = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  out.add(Number(s.slice(0, son).replace(/[.,]/g, '') + '.' + s.slice(son + 1)));
  return [...out].filter(Number.isFinite);
}

// Anlamlı rakamlar: ayraçlar, baştaki ve sondaki sıfırlar atılır ("8,52" ve "852" → "852").
const anlamli = (raw) => raw.replace(/\D/g, '').replace(/^0+/, '').replace(/0+$/, '');

// Yazıyla yazılmış Türkçe tutar ("sekiz yüz elli iki milyar", "beş bin 12 crore", "seksen beş virgül yirmi altı lakh")
// rakama çevrilir; yalnız arkasından birim kelimesi geliyorsa. Metnin geri kalanına dokunulmaz.
const BIRLER = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const ONLAR = { on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90 };
const KELIME = [...Object.keys(BIRLER), ...Object.keys(ONLAR), 'yüz', 'bin', String.raw`\d+`].join('|');
function kelimeDegeri(parcalar) {
  let toplam = 0, grup = 0;
  for (const p of parcalar) {
    if (/^\d+$/.test(p)) grup += Number(p);
    else if (p in BIRLER) grup += BIRLER[p];
    else if (p in ONLAR) grup += ONLAR[p];
    else if (p === 'yüz') grup = (grup || 1) * 100;
    else if (p === 'bin') {
      toplam += (grup || 1) * 1000;
      grup = 0;
    }
  }
  return toplam + grup;
}
export function yaziylaTutar(metin) {
  const s = String(metin ?? '').replace(/virgül/giu, ' virgül ');
  const dizi = String.raw`(?:${KELIME})(?:\s+(?:${KELIME}))*`;
  const re = new RegExp(String.raw`(?<![\p{L}\d.,])(${dizi})(?:\s+virgül\s+(${dizi}))?(?=\s+(?:milyon|milyar|trilyon|crore|lakh))`, 'giu');
  return s.replace(re, (tum, tam, kesir) => {
    const parcalar = tam.toLocaleLowerCase('tr').split(/\s+/);
    if (parcalar.every((p) => /^\d+$/.test(p))) return tum; // zaten rakam
    const t = kelimeDegeri(parcalar);
    if (!t) return tum;
    const k = kesir ? kelimeDegeri(kesir.toLocaleLowerCase('tr').split(/\s+/)) : 0;
    return k ? `${t},${k}` : String(t);
  });
}

// Metindeki birimli tutarlar: [{ham, deger: [..], anlamli}]
export function tutarlar(metin, { dil } = {}) {
  const out = [];
  if (dil !== 'nb') metin = yaziylaTutar(metin);
  // Aralık ve sıralamada birim sonda bir kez yazılır: "100 til 115 milliarder", "2-3 milyar", "5 ve 6 milyon".
  const re = new RegExp(String.raw`(?<![\d.,])((?:${SAYI})(?:\s*(?:[-–]|til|to|ile|ila|ve|and|og|eller|or)\s*(?:${SAYI}))*)\s*(\p{L}+)\.?(?:\s+(\p{L}+))?`, 'gu');
  for (const m of String(metin ?? '').matchAll(re)) {
    const c1 = carpan(m[2], dil);
    if (!c1) continue;
    const c2 = m[3] ? carpan(m[3], dil) : 0;
    const c = c2 ? c1 * c2 : c1; // "lakh crore" = 10^12
    const birim = c2 ? `${m[2]} ${m[3]}` : m[2];
    for (const [sayi] of m[1].matchAll(new RegExp(SAYI, 'g'))) {
      out.push({ ham: `${sayi} ${birim}`, deger: degerler(sayi).map((d) => d * c), anlamli: anlamli(sayi) });
    }
  }
  return out;
}

const yakin = (a, b) => b && Math.abs(a - b) / Math.abs(b) <= 0.02;

// mutlak: birimi belli sayılar (künyedeki 5012300000000 gibi), metin dışından.
const MESAJ = (yazi, kaynak) =>
  `Ölçek hatası: "${yazi}" kaynaktaki "${kaynak}" ile en az 10 kat farklı (birim çevirisini düzelt: crore = 10 milyon, lakh = 100 bin, billion = milyar)`;

export function olcekKontrol(metin, kaynak, { dil, mutlak = [], mesaj = MESAJ } = {}) {
  const k = tutarlar(kaynak, { dil });
  if (!k.length) return [];
  const sorunlar = [];
  const bakildi = new Set();
  const yazidakiler = [
    ...tutarlar(metin, { dil }),
    ...mutlak.filter((n) => Number.isFinite(n) && n >= 1000).map((n) => ({ ham: String(n), deger: [n], anlamli: anlamli(String(n)) })),
  ];
  for (const t of yazidakiler) {
    if (!t.anlamli || bakildi.has(t.ham)) continue;
    bakildi.add(t.ham);
    if (t.deger.some((d) => k.some((x) => x.deger.some((s) => yakin(d, s))))) continue;
    const ayniRakam = k.filter((x) => x.anlamli === t.anlamli);
    if (!ayniRakam.length) continue; // rakam kontrolünün işi
    const kayik = ayniRakam.find((x) => x.deger.every((s) => t.deger.every((d) => d / s >= 9.5 || d / s <= 1 / 9.5)));
    if (kayik) sorunlar.push(mesaj(t.ham, kayik.ham));
  }
  return sorunlar;
}
