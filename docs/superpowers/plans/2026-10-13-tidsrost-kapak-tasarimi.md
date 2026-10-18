# tidsrøst Haber Kapakları Implementation Plan

> **Durum (2026-10-18):** Uygulandı, sonra Fjord kapak diliyle değiştirildi (tarihî plan).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tidsrøst` haber botunun ürettiği haber kapaklarını N50 kartografik pafta ve İskandinav gazetesi estetiğinde (Source Serif 4, Archivo, neatline çift çerçeve, veri/lejant kutusu) zenginleştirmek ve `finfolis` standardına ulaştırmak.

**Architecture:** Yerel TTF font dosyaları (`SourceSerif4.ttf` ve `Archivo.ttf`) üzerinden Sharp Pango metin motoru (`yazi`), taşma koruması (`sigdir`) ve SVG vektör çerçevesi birleştirilerek (`sharp.composite`) 1200×675 PNG kapaklar üretilir. `bilde.mjs` ve `lib.mjs` entegre edilir, mevcut `varselkart` ve `kursgraf` korunur.

**Tech Stack:** Node.js (v22+), Sharp, SVG, Pango markup, TrueType Fonts (Source Serif 4 & Archivo), Node Test Runner (`node:test`).

## Global Constraints

- Tuval boyutu daima 1200 × 675 pikseldir (16:9 oran).
- Çıktı formatı 8-bit paletli, optimize edilmiş PNG'dir (`compressionLevel: 9, palette: true, quality: 90`).
- Mevcut haberlerin (`src/content/haberler/*/cover.png`) kapaklarına kesinlikle dokunulmaz; yalnızca yeni haberler için çalışır.
- Tüm metinlerde Norveççe karakterler (`æ, ø, å`, `« »`, `–`) bozulmadan, tam UTF-8 ve XML escape kurallarına uygun basılır.
- Kod stilleri ve modül yapısı ESM (`.mjs`) standartlarındadır.

---

### Task 1: Font Varlıklarının Kurulumu ve Pango Metin Motoru (`yazi` & `sigdir`)

**Files:**
- Create: `tidsrost/scripts/nyheter/fonts/SourceSerif4.ttf`
- Create: `tidsrost/scripts/nyheter/fonts/Archivo.ttf`
- Modify: `tidsrost/scripts/nyheter/bilde.mjs`
- Create: `tidsrost/scripts/nyheter/bilde.test.mjs`

**Interfaces:**
- Produces: `yazi(metin, opts)`:
  - `metin`: string
  - `opts`: `{ aile?: 'SourceSerif4' | 'Archivo', boyut?: number, kalinlik?: number, renk?: string, genislik?: number, aralik?: number, satirAraligi?: number, buyukHarf?: boolean }`
  - Returns: `Promise<{ input: Buffer, genislik: number, yukseklik: number }>`
- Produces: `sigdir({ input, left, top, genislik, yukseklik })`:
  - Returns: `Promise<{ input: Buffer, left: number, top: number }>`

- [x] **Step 1: Font dizinini oluştur ve TTF dosyalarını indir**

İndirilecek dosyalar:
- Source Serif 4 Variable TTF: `https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf` -> `scripts/nyheter/fonts/SourceSerif4.ttf`
- Archivo Variable TTF: `https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf` -> `scripts/nyheter/fonts/Archivo.ttf`

- [x] **Step 2: Failing test yaz (`bilde.test.mjs`)**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { yazi, sigdir } from './bilde.mjs';

test('yazi: Source Serif 4 ile metin buffer üretir', async () => {
  const katman = await yazi('Regjeringen legger fram ny krisepakke', {
    aile: 'SourceSerif4',
    boyut: 48,
    kalinlik: 600,
    genislik: 800,
  });
  assert.ok(Buffer.isBuffer(katman.input));
  assert.ok(katman.genislik > 0);
  assert.ok(katman.yukseklik > 0);
});

test('yazi: Archivo ile büyük harf ve harf aralıklı etiket üretir', async () => {
  const katman = await yazi('innenriks', {
    aile: 'Archivo',
    boyut: 24,
    kalinlik: 700,
    buyukHarf: true,
    aralik: 0.08,
  });
  assert.ok(Buffer.isBuffer(katman.input));
  assert.ok(katman.genislik > 0);
});
```

- [x] **Step 3: Testi çalıştır ve fail ettiğini doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: FAIL (yazi is not exported / defined)

- [x] **Step 4: `bilde.mjs` içinde `yazi` ve `sigdir` fonksiyonlarını uygula**

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HER = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HER, 'fonts');

export async function yazi(metin, {
  aile = 'SourceSerif4',
  boyut = 32,
  kalinlik = 400,
  renk = '#16191c',
  genislik,
  aralik = 0,
  satirAraligi,
  buyukHarf = false,
} = {}) {
  let sharp;
  ({ default: sharp } = await import('sharp'));
  const icerik = esc(buyukHarf ? String(metin).toLocaleUpperCase('nb-NO') : metin);
  const harf = aralik ? ` letter_spacing="${Math.round(aralik * boyut * 1024)}"` : '';
  const markup = `<span foreground="${renk}" font_weight="${kalinlik}"${harf}>${icerik}</span>`;
  const fontFile = path.join(FONT_DIR, `${aile}.ttf`);
  const fontName = aile === 'SourceSerif4' ? 'Source Serif 4' : 'Archivo';

  const { data, info } = await sharp({
    text: {
      text: markup,
      font: `${fontName} ${boyut}`,
      fontfile: fontFile,
      rgba: true,
      dpi: 72,
      ...(genislik ? { width: Math.round(genislik), wrap: 'word' } : {}),
      ...(satirAraligi ? { spacing: Math.round(satirAraligi) } : {}),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  return { input: data, genislik: info.width, yukseklik: info.height };
}

export async function sigdir({ input, left, top, genislik, yukseklik }) {
  let sharp;
  ({ default: sharp } = await import('sharp'));
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const enFazlaG = B - 40 - x;
  const enFazlaY = H - y;
  if (genislik <= enFazlaG && yukseklik <= enFazlaY) return { input, left: x, top: y };
  const kucuk = await sharp(input)
    .resize({ width: enFazlaG, height: enFazlaY, fit: 'inside' })
    .png()
    .toBuffer();
  return { input: kucuk, left: x, top: y };
}
```

- [x] **Step 5: Testi çalıştır ve başarılı olduğunu doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git -C tidsrost add scripts/nyheter/fonts/ scripts/nyheter/bilde.mjs scripts/nyheter/bilde.test.mjs
git -C tidsrost commit -m "feat(bilde): Sharp Pango metin motoru ve yerel font varliklari eklendi"
```

---

### Task 2: Standart Haber Kapağı Şablonu (Düzen A: Tam Genişlik Başlık Odaklı)

**Files:**
- Modify: `tidsrost/scripts/nyheter/bilde.mjs`
- Modify: `tidsrost/scripts/nyheter/bilde.test.mjs`

**Interfaces:**
- Produces: `sakKapagi({ tittel, ingress, kategori, dato, rakam, kilde })`:
  - Returns: `Promise<{ svg: string, katmanlar: Array }>`
- Produces: `kapakCiz(generatorFn)`:
  - Takes an async function returning `{ svg, katmanlar }`
  - Returns: `Promise<Buffer>` (PNG 1200×675)

- [x] **Step 1: `bilde.test.mjs`'e Standart Kapak testini ekle**

```javascript
import { sakKapagi, kapakCiz } from './bilde.mjs';

test('sakKapagi: standart başlık ve ingress ile geçerli 1200x675 PNG üretir', async () => {
  const png = await kapakCiz(sakKapagi({
    tittel: 'Stortinget vedtar nye tiltak for å sikre kraftforsyningen',
    ingress: 'Et bredt flertall på Stortinget har tirsdag samlet seg om en ny pakke for å styrke nettkapasiteten og støtte industrien i Sør-Norge.',
    kategori: 'innenriks',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Stortinget',
  }));

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);
});

test('sakKapagi: Norveççe özel karakterleri (æ, ø, å, « », –) hatasız işler', async () => {
  const png = await kapakCiz(sakKapagi({
    tittel: '«Et historisk løft for bøndene», sier næringsministeren om avtalen',
    ingress: 'Avtalen sikrer bøndene 1,8 milliarder kroner i økt inntekt over to år.',
    kategori: 'okonomi',
    dato: '2026-10-13T12:00:00+02:00',
  }));

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);
});
```

- [x] **Step 2: Testi çalıştır ve fail ettiğini doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: FAIL (sakKapagi / kapakCiz is not defined)

- [x] **Step 3: `bilde.mjs` içine `KATEGORI_SEMBOL`, `kapakCiz` ve `sakKapagi` Düzen A'yı uygula**

`Symbol.astro` sembollerini ve N50 pafta neatline/çerçeve SVG'sini hazırla:
- Neatline: dış çerçeve 1.5px `#16191c`, iç çerçeve 0.8px `#dcded8`.
- Üst başlık: Kategori sembolü + kategori adı + tarih damgası.
- Orta başlık: `Source Serif 4` 600 başlık (boyut $48-64\text{px}$), $60\text{px}$ `havblå` aksan çizgisi, `Source Serif 4` 400 spot ($26-28\text{px}$, `#2f353a`).
- Alt imza: Sol altta `tidsrøst` (Source Serif 4 700), sağ altta `NOREG` kartografik pafta damgası.
- `kapakCiz` fonksiyonu SVG taban üzerine `katmanlar`'ı `composite` eder ve Sharp PNG buffer döner.

- [x] **Step 4: Testi çalıştır ve başarılı olduğunu doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git -C tidsrost add scripts/nyheter/bilde.mjs scripts/nyheter/bilde.test.mjs
git -C tidsrost commit -m "feat(bilde): standart baslik odakli sakKapagi ve kapakCiz duzeni eklendi"
```

---

### Task 3: İki Kolonlu Veri / Gösterge Kutusu Şablonu (Düzen B: Rakam / Kartusj Düzeni)

**Files:**
- Modify: `tidsrost/scripts/nyheter/bilde.mjs`
- Modify: `tidsrost/scripts/nyheter/bilde.test.mjs`

**Interfaces:**
- Consumes: `yazi`, `sigdir`, `KATEGORI_SEMBOL` from Task 1 & 2
- Updates: `sakKapagi({ tittel, ingress, kategori, dato, rakam, kilde })`:
  - When `rakam: { etiket, deger }` is present, activates two-column layout:
    - Left column (width 660px): Title + Spot.
    - Right column (width 330px): N50 technical cartouche data box with top accent bar, category tag in Archivo 700 uppercase, and large figure in Archivo 700.

- [x] **Step 1: `bilde.test.mjs`'e Rakamlı Kapak testini ekle**

```javascript
test('sakKapagi: rakamlı veri kutusu içeren iki kolonlu kapak geçerli PNG üretir', async () => {
  const png = await kapakCiz(sakKapagi({
    tittel: 'Konsumprisindeksen steg mer enn ventet i september',
    ingress: 'Prisveksten i Norge holder seg høy, drevet av økte matvarepriser og strømutgifter.',
    kategori: 'okonomi',
    dato: '2026-10-13T12:00:00+02:00',
    rakam: { etiket: 'Konsumprisindeks', deger: '4,2 %' },
    kilde: 'SSB',
  }));

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);
});
```

- [x] **Step 2: Testi çalıştır ve başarısız olduğunu veya Düzen B'nin uygulanmadığını doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`

- [x] **Step 3: `bilde.mjs` içindeki `sakKapagi` fonksiyonuna Düzen B mantığını ekle**

```javascript
if (rakam && rakam.deger) {
  // Düzen B: İki Kolonlu Lejant / Kartusj Düzeni
  const solGenislik = 660;
  const sagGenislik = 330;
  const sagX = B - KENAR - sagGenislik;
  // Sol kolon başlık ve ingress...
  // Sağ kolon N50 pafta lejant kutusu (beyaz zemin, 2px siyah çerçeve, üstte 6px havblå şerit, Archivo etiket ve büyük rakam)...
}
```

- [x] **Step 4: Testleri çalıştır ve tüm testlerin geçtiğini doğrula**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git -C tidsrost add scripts/nyheter/bilde.mjs scripts/nyheter/bilde.test.mjs
git -C tidsrost commit -m "feat(bilde): iki kolonlu veri kutulu (kartusj) haber kapagi duzeni eklendi"
```

---

### Task 4: Örnek Kapaklar Scripti (`ornekler.mjs`) ve Gitignore Yapılandırması

**Files:**
- Create: `tidsrost/scripts/nyheter/ornekler.mjs`
- Modify: `tidsrost/.gitignore`

**Interfaces:**
- Produces: CLI script `node scripts/nyheter/ornekler.mjs [ciktiKlasoru]`
  - Generates demo covers for visual inspection in `.kapak-ornekleri/`
  - Covers: `haber-standart.png`, `haber-rakamli.png`, `haber-uzun-baslik.png`, `varselkart-demo.png`, `kursgraf-demo.png`

- [x] **Step 1: `.gitignore` dosyasına `.kapak-ornekleri` ekle**

`.kapak-ornekleri/` satırını `tidsrost/.gitignore` içine ekle.

- [x] **Step 2: `scripts/nyheter/ornekler.mjs` scriptini yaz**

```javascript
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sakKapagi, kapakCiz, kursgraf, varselkart } from './bilde.mjs';

const cikti = resolve(process.argv[2] ?? '.kapak-ornekleri');
await mkdir(cikti, { recursive: true });

const ornekler = {
  'haber-standart': sakKapagi({
    kategori: 'innenriks',
    tittel: 'Stortinget vedtar nye tiltak for å sikre nasjonal beredskap',
    ingress: 'Et bredt flertall i Stortinget stiller seg bak regjeringens forslag om styrket overvåking og forsyningssikkerhet i nordområdene.',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Stortinget',
  }),
  'haber-rakamli': sakKapagi({
    kategori: 'okonomi',
    tittel: 'Norges Bank holder styringsrenten uendret',
    ingress: 'Sentralbanken vurderer at inflasjonspresset fortsatt krever en restriktiv pengepolitikk utover vinteren.',
    dato: '2026-10-13T12:00:00+02:00',
    rakam: { etiket: 'Styringsrente', deger: '4,50 %' },
    kilde: 'Norges Bank',
  }),
  'haber-uzun-baslik': sakKapagi({
    kategori: 'utenriks',
    tittel: 'Norge og allierte land fordømmer nye cyberangrep mot europeisk infrastruktur og varsler felles mottiltak',
    ingress: 'Utenriksdepartementet kaller angrepene uakseptable og understreker at trusselbildet mot kritisk digital infrastruktur er skjerpet.',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Utenriksdepartementet',
  }),
};

for (const [ad, tur] of Object.entries(ornekler)) {
  const png = await kapakCiz(tur);
  await writeFile(resolve(cikti, `${ad}.png`), png);
  console.log(`${ad}.png`, `${Math.round(png.length / 1024)} KB`);
}
```

- [x] **Step 3: Scripti çalıştır ve örnek PNG'lerin üretildiğini doğrula**

Run: `node tidsrost/scripts/nyheter/ornekler.mjs`
Expected: 3 PNG dosyası `.kapak-ornekleri/` altında üretilir ve boyutları konsola basılır.

- [x] **Step 4: Commit**

```bash
git -C tidsrost add .gitignore scripts/nyheter/ornekler.mjs
git -C tidsrost commit -m "feat(bilde): ornek kapak uretme scripti ve gitignore kurali eklendi"
```

---

### Task 5: Bot Akışına Entegrasyon (`lib.mjs`, `kilder/` ve `hent-nyheter.mjs`)

**Files:**
- Modify: `tidsrost/scripts/nyheter/lib.mjs`
- Modify: `tidsrost/scripts/nyheter/kilder/pressemelding.mjs`
- Modify: `tidsrost/scripts/nyheter/kilder/regjeringen.mjs` (varsa kildekort temizliği)
- Modify: `tidsrost/scripts/nyheter/kilder/stortinget.mjs` (varsa kildekort temizliği)

**Interfaces:**
- Updates: `lagBilde(sak)` in `lib.mjs`:
  - Checks if `sak.bilde` is already defined (e.g. `varselkart` or `kursgraf`). If so, generates that.
  - If not defined, generates `sakKapagi` with `sak.title`, `sak.description`, `sak.category`, `sak.date`, `sak.rakam`, `sak.kilde?.navn`.
  - Converts SVG + layers via `kapakCiz` to PNG buffer.

- [x] **Step 1: `lib.mjs` içindeki `lagBilde` fonksiyonunu güncelle**

Eski kod:
```javascript
async function lagBilde(sak) {
  const b = sak.bilde ?? {
    svg: () => kildekort({ kategori: kategoriNavn(sak.category), avsender: sak.kilde.navn }),
    alt: `Illustrasjon med teksten «${sak.kilde.navn}»`,
    kreditt: 'Illustrasjon: tidsrøst',
  };
  try {
    const png = await tilPng(await b.svg(sak));
    return png && { png, alt: b.alt, kreditt: b.kreditt };
  } catch (e) {
    console.warn(`  kapak resmi üretilemedi: ${e.message}`);
    return null;
  }
}
```

Yeni kod:
`sak.bilde` özel bir SVG/grafik fonksiyonsa (varselkart/kursgraf) o çizilir; aksi halde doğrudan `sakKapagi` çağrılır ve `kapakCiz` ile PNG üretilir.

- [x] **Step 2: `kilder/pressemelding.mjs` içindeki sabit `kildekort`'u kaldır**

`pressemelding.mjs` içinde `bilde: { svg: ... kildekort ... }` atamasını kaldır veya standart `sakKapagi`'na bırak; böylece tüm kamu kurumları haberleri başlık ve ingress'li muhteşem editoryal kapakla üretilsin.

- [x] **Step 3: `kilder/` altındaki diğer kaynakları kontrol et ve temizle**

`kilder/regjeringen.mjs`, `kilder/stortinget.mjs`, `kilder/medier.mjs` vb. dosyaları incele; `kildekort` kalıntılarını temizle.

- [x] **Step 4: Bot pipeline kuru çalıştırma (`--torr`) veya simülasyon testi yap**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Run: `node tidsrost/scripts/nyheter/hent-nyheter.mjs --torr`
Expected: Bot hatasız çalışır ve haberleri listeler.

- [x] **Step 5: Commit**

```bash
git -C tidsrost add scripts/nyheter/lib.mjs scripts/nyheter/kilder/
git -C tidsrost commit -m "feat(bilde): bot haber akisi yeni editoryal kapak sistemine baglandi"
```

---

### Task 6: Uçtan Uca Doğrulama ve Derleme Kontrolü

**Files:**
- Test: Tüm testler ve Astro derleme kontrolü

- [x] **Step 1: Birim testleri çalıştır**

Run: `node --test tidsrost/scripts/nyheter/bilde.test.mjs`
Expected: 100% PASS

- [x] **Step 2: Astro derlemesini doğrula**

Run: `npm --prefix tidsrost run build`
Expected: Build successfully completes without any image/route errors.

- [x] **Step 3: Git durumunu kontrol et ve temizlik yap**

Run: `git -C tidsrost status`
Beklenmeyen veya geçici dosyaların (`.kapak-ornekleri/` vb.) commit edilmediğinden emin ol.
