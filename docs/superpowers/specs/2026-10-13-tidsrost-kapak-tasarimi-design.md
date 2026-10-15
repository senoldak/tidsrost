# tidsrøst Haber Kapakları Tasarım Spesifikasyonu (N50 Kartografik Pafta & İskandinav Gazetesi)

- **Tarih:** 2026-10-13
- **Durum:** Onaylandı (Ready for Implementation Planning)
- **Kapsam:** `tidsrost` (Bot haber kapakları sistemi)

---

## 1. Amaç ve Problem Tanımı

`tidsrøst` şu anda meteoroloji/afet uyarıları için N50 pafta estetiğinde `varselkart` ve Norges Bank için `kursgraf` üretmektedir. Ancak günlük haber akışının %95+'ini oluşturan standart haberlerde (siyaset, Stortinget, dış politika, ekonomi, spor, kültür) kapaklar eski `kildekort` şablonuna düşmektedir. Bu şablon yalnızca düz mavi zemin üzerinde kurum adını göstermekte; haberin başlığı (`title`), spotu (`description`), editoryal derinliği ve sitenin zarif haritacı kimliği yansıtılamamaktadır.

Bu çalışma ile `finfolis`'te uygulanan ve yüksek beğeni toplayan editoryal kapak standardı, `tidsrøst`'un **N50 Kartografik Pafta & İskandinav Gazetesi** kimliğine uyarlanarak sisteme entegre edilecektir.

---

## 2. Tasarım İlkeleri ve Görsel Kimlik

1. **Topografik N50 Pafta Estetiği:**
   - Dış Çerçeve (Neatline): Harita paftalarında olduğu gibi dışta 1.5px koyu baskı mürekkebi (`#16191c`), içte 0.8px kılcal gri çizgi (`#dcded8`).
   - Kartuş ve Lejant Kutuları: Teknik harita kutuları, net köşeler, zarif ayırıcılar.
   - Damgalar: Sol altta editoryal `tidsrøst` imzası, sağ altta `NOREG · N50 PAFTA` kartografik koordinat/bölge damgası.

2. **Tipografi ve Yazı Tipleri:**
   - **Başlıklar & Manşetler:** `Source Serif 4` (yarı kalın 600, optik boyutlandırmalı, dinamik 48–64px).
   - **Spot / İngress:** `Source Serif 4` (normal 400, 26–28px, ikincil mürekkep rengi `#2f353a`).
   - **Kategori, Tarih ve Teknik Rakamlar:** `Archivo` (kalın 600–700, büyük harf, takip aralıklı).
   - **Yerel Font Dosyaları:** `scripts/nyheter/fonts/SourceSerif4.ttf` ve `scripts/nyheter/fonts/Archivo.ttf`.

3. **Renk Paleti (global.css ile uyumlu):**
   - Zemin: `#fdfdfb` (Kartpapir / N50 harita kağıdı)
   - Ana Mürekkep: `#16191c` (Trykksverte)
   - İkincil Mürekkep: `#2f353a` (Sekundær sverte)
   - Soluk / Nötr: `#5a6168` (Dempet grå)
   - Kılcal Çizgiler: `#dcded8`
   - Vurgu / Su Mavisi: `#1f5f99` (Havblå aksan)

4. **Kategori Geometrik Sembolleri (`Symbol.astro`):**
   - `innenriks`: Dolu Üçgen (`▲`)
   - `utenriks`: Halka Çember (`○`)
   - `okonomi`: Dolu Kare (`■`)
   - `sport`: Baklava (`◇`)
   - `kultur`: Dolu Daire (`●`)
   - `teknologi`: Çerçeve Kare (`□`)

---

## 3. Kapak Şablon Düzenleri

Tuval boyutu: **1200 × 675 px** (16:9 standart en-boy oranı).

### Düzen A: Standart Haber Kapağı (Tam Genişlik Başlık Odaklı)
- **Üst Bant (Y=64):**
  - Kategori sembolü (24×24px, `#16191c` veya `#1f5f99`).
  - Kategori Adı (`INNENRIKS`, `UTENRIKS`, vb.) — `Archivo` 600, 24px, büyük harf, `letter_spacing=0.08`.
  - Orta nokta `·` ve Tarih damgası (örn. `13. OKTOBER 2026`).
  - Altında 1200px boyunca 1px `#dcded8` ayırıcı çizgi.
- **Orta Alan (Dikeyde Ortalı):**
  - Başlık (`Source Serif 4` 600, genişlik 1056px, uzunluğa göre 48–64px, satır aralığı -4).
  - Vurgu çizgisi: Başlığın altında 60px genişliğinde, 3px kalınlığında `#1f5f99` çizgi.
  - Spot / İngress: `Source Serif 4` 400, 26–28px, renk `#2f353a`, genişlik 996px.
- **Altlık:**
  - Alt ayırıcı çizginin üzerinde sol altta `tidsrøst` imzası, sağ altta `NOREG` kartografik pafta damgası.

### Düzen B: Rakam / Gösterge Kutulu Haber Kapağı (İki Kolonlu)
Haber bir ekonomik gösterge, faiz, bütçe veya istatistiksel veri içerdiğinde:
- **Sol Kolon (660px):**
  - `Source Serif 4` Başlık (44–52px) + Spot (24px).
- **Sağ Kolon (330px) — N50 Kartusj / Veri Kutusu:**
  - 330×250px kutu, beyaz zemin, 2px `#16191c` çerçeve, üstte 6px `#1f5f99` şerit.
  - Etiket: Büyük harf gösterge adı (`KONSUMPRISINDEKS`, `STYRINGSRENTE` vb.) — `Archivo` 700, 18px.
  - İnce ayırıcı çizgi.
  - Değer: `Archivo` 700, 56–68px, koyu mürekkep (`%4,5`, `1 000 nye` vb.).

### Özel Kapaklar
- `varselkart`: MET ve NVE hava/afet haritası korunur.
- `kursgraf`: Norges Bank döviz kuru serileri grafiği korunur.
- `kildekort`: Standart haber akışından kaldırılır; genel haberler `sakKapagi`'na yönlendirilir.

---

## 4. Teknik Mimari ve Kod Değişiklikleri

### A. Font Yönetimi
- `scripts/nyheter/fonts/SourceSerif4.ttf` ve `scripts/nyheter/fonts/Archivo.ttf` indirilir ve reponun içine dahil edilir.
- `sharp({ text: { fontfile, font, ... } })` ile doğrudan Pango motoru üzerinden piksel hassasiyetinde yazı basımı yapılır.

### B. `scripts/nyheter/bilde.mjs`
- `yazi(metin, ayarlar)` yardımcı fonksiyonu (Pango markup, letter-spacing, word-wrap, satirAraligi).
- `sigdir({ input, left, top, genislik, yukseklik })` taşma koruması.
- `sakKapagi({ tittel, ingress, kategori, dato, rakam, kilde })` şablon fonksiyonu.
- `tilPng(svg, katmanlar)` çok katmanlı Sharp rendering.

### C. `scripts/nyheter/lib.mjs` & Kaynaklar
- `lagBilde(sak)` güncellenerek varsayılan olarak `sakKapagi` çağrısı bağlanır.
- `pressemelding.mjs`, `medier.mjs`, `regjeringen.mjs`, `etater.mjs` içindeki `kildekort` bağımlılıkları temizlenir.

---

## 5. Doğrulama ve Testler

1. **`scripts/nyheter/bilde.test.mjs` (Birim Testler):**
   - Standart başlık ve spot ile `sakKapagi` testi (geçerli PNG, minimum boyut kontrolü).
   - Rakamlı iki kolonlu kart testi.
   - İskandinav karakter seti (`æ, ø, å`, `« »`, `–`) bozulma/escape testi.
   - `varselkart` ve `kursgraf` geriye dönük uyumluluk testi.
2. **`scripts/nyheter/ornekler.mjs` (Görsel Önizleme Scripti):**
   - `.kapak-ornekleri/` klasörüne örnek PNG çıktıları basan deneme aracı.

---

## 6. Kapsam ve Dağıtım Kuralı

- **Mevcut Haberler:** Kullanıcı talebi doğrultusunda, `src/content/haberler/` altındaki eski `cover.png` dosyalarına dokunulmayacaktır.
- **Gelecek Haberler:** Botun bundan sonra çekeceği veya üreteceği tüm yeni haberler yeni kapak şablonuyla kaydedilecektir.
