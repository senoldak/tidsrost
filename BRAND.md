# tidsrøst — Kimlik Kılavuzu

> Sürüm 1 · 18 Ekim 2026. Sahibiyle 10–18 Ekim arasında verilen kararların toplu hâli; site (N50 harita yaprağı,
> 10 Ekim) ve kapaklar (Fjord, 18 Ekim) bu kararlarla canlıda. Bu belge kimliğin tek kaynağıdır; ayrıntılı site kuralları
> `DESIGN.md`'de, ürün kararları `PRODUCT.md`'de. Okur dili Norveççe (Bokmål); bu belge editör içindir.
> "Öneri" diye işaretli maddeler sahibin onayına açıktır.

## 1. Neden varız

Norveç'te ve dünyada olanı, gürültüsüz ve kaynağından anlatan reklamsız bir günlük haber. Büyük yayın kuruluşlarına
sakin, dürüst ve kolay okunur bir alternatif.

- **Ad:** *tid* (zaman) + *røst* (ses, eski ve ağırbaşlı söyleyiş) → **"zamanın sesi"**.
- **Sitedeki alt başlık (canlı):** **Siste nytt fra Norge og verden.**
- **Motto (öneri, sitede kullanılmıyor):** *Tidens stemme – rett fra kilden.* · kısa hâli *Rett fra kilden.*
- **Kime konuşuyoruz:** Norveç'teki genel haber okuru; kitle yaşça büyük (kapaklarda punto bu yüzden büyük).
  Telefonda ve masaüstünde kısa oturumlar; çoğu doğrudan tek bir habere gelir.

## 2. Ne olduğumuz

- **Ticari değil:** reklam yok, gelir yok. Vær Varsom-plakaten ve Redaktørplakaten'e bağlı; bu beyanlar altbilgide
  durur ve bağlayıcıdır. Sorumlu editör: Şenol Dak.
- **Kaynak düzeni:** resmî birincil kaynaklar (Regjeringen, Stortinget, Norges Bank, NVE, MET, yaklaşık 30 Norveç
  kurumu, UN News, Avrupa Komisyonu). Güncel olaylar Norveç medyasından yalnız **en az iki farklı yayın** aynı olayı
  verdiyse yazılır; tek yayının özel haberi alınmaz.
- **Üretim açık:** çoğu haber botun yazdığı haberdir; her haberin altında üretim notu (`produksjon`, `KI_MERKING`) ve
  gerekiyorsa düzeltme notu (`rettelse`) görünür. Bunlar editoryal yükümlülüktür, gizlenmez.

## 3. Kişilik

| Özellik | Anlamı |
|---|---|
| **Sakin** | Aciliyeti haber taşır, tasarım değil. |
| **Güvenilir** | Kaynak, düzeltme ve üretim notu okumanın parçasıdır. |
| **Açık sözlü** | Kısa cümle, düz Bokmål, tıklama tuzağı yok. |
| **Yerli** | Norveç'in kendi haritası, fiyordu ve bayrak renkleri; ithal "gazete şablonu" değil. |

## 4. Ses

| Yap | Yapma |
|---|---|
| Düz, ölçülü Bokmål; önce olgu | Ünlem, "SJOKK", "dette må du se" |
| Kurumu adıyla an (Regjeringen, Norges Bank, MET) | Haber sitesi ya da ajans adı anmak veya bağlamak (metin, kaynak satırı, kapak: hiçbir yerde) |
| Sayıyı tarihiyle ver | "i dag", "nylig" gibi belirsiz zaman |
| Kısa paragraf, büyük punto | Jargon, kısaltma yığını |
| Forklart yazılarında her rakam resmî kaynaktan; yanlış çıkan rakam `rettelse` ile düzeltilir | Kaynaksız rakam ya da uydurma alıntı |

## 5. Logo ve simge

- **Logo yazının kendisidir:** "tidsrøst", ø su mavisi (§6). Ayrı bir sembol ya da "simge + ad" düzeni yoktur
  (sahibin kararı, 18 Ekim 2026).
- **Simge:** logodaki **ø'nün birebir aynısı** (Archivo 800, wdth 112). Yalnız favicon, uygulama simgesi ve sosyal medya
  profil fotoğrafında tek başına durur. Açık zeminde su mavisi `#1f5f99`, koyu zeminde `#7fb2e5`; fiyort mavisi ya da
  fotoğraf üstünde beyaz, tek renk baskıda mürekkep.
- Eski işaret (sahibin Coloman ile çizdiği kırmızı "t") 18 Ekim 2026'da emekliye ayrıldı. Yenileme denemeleri (temiz
  kopya t, mavi t, ø'den türetilmiş semboller) gösterildi, sahibi yazının kendisini seçti.
- **Dosyalar** (`node scripts/merke.mjs` üretir; yazı glif yoludur, yazı tipi gerekmez):
  - `public/favicon.svg` (gece temasında açık mavi), `favicon.ico`, `favicon-32/192/512.png` (saydam),
    `favicon-maskable-512.png` ve `apple-touch-icon.png` (kâğıt zemin), `logo-600x60.png` (Google yayıncı logosu).
    Favicon bağlantıları `?v=2` taşır; simge bir daha değişirse sayıyı artır.
  - `brand/logo/`: `tidsrost-ordmerke-*` (logo) ve `tidsrost-merke-*` (ø simgesi); `lys`, `mork`, `hvit`, `blekk`
    renklerinde, SVG + saydam PNG.
  - `brand/sosyal/`: `profil-lys.png` (kâğıt zemin, mavi ø) ve `profil-mork.png` (gece zemini, açık mavi ø), 1080 kare;
    ø yuvarlak kırpmada da tam görünür.
- Yapılmaz: ø'yü yeniden çizmek ya da başka yazı tipinden almak, döndürmek, gölge, degrade, kontur; logonun yanına ayrıca
  simge koymak.

## 6. Kelime işareti

- **"tidsrøst"** her zaman küçük harf ve ø ile. "Tidsrost", "TidsRøst" yazılmaz; "tidsrost" yalnız alan adı ve kodda.
- **Sitede:** Archivo 800, geniş (wdth 112), sıkı aralık (-0.04em), **ø su mavisi**; günün eş yükselti haritasının
  üstünde kâğıt rengi halede. Gece yaprağında yazı `#ebe9e2`, ø `#7fb2e5`.
- **Kapakta:** Archivo'dan türetilmiş kalın kesim, üstünde kısa kırmızı çizgi; fjord zeminde beyaz, ters Fjord'da
  fjord mavisi.

## 7. Renk

Kimlik iki dünyayı tek aileye bağlar: sitede **N50 harita yaprağı**, kapak ve sosyalde **Fjord** (Norveç bayrağı:
mavi, beyaz, kırmızı). **Sarı yok** (sahibin sözü: "İsveç değil"); sarı yalnız `/farevarsler/` haritasında MET verisi
olarak kalır.

**Site (harita yaprağı)**

| Ad | Hex | Kullanım |
|---|---|---|
| Papir | `#fdfdfb` | Site zemini |
| Blekk | `#16191c` | Metin, çerçeve çizgileri |
| Vann | `#1f5f99` | Tek etkileşim vurgusu: bağlantı, konum |
| Signalrød | `#c8281e` | Siste nytt, FORKLART etiketi; her zaman simge ve yazıyla |
| Kontur | `#a0643c` | Yalnız başlıktaki eş yükselti çizgileri |
| Linje | `#dcded8` | Ayraçlar |

Gece yaprağı (`nattark`, `prefers-color-scheme: dark`): sıcak mürekkep karası zemin `#171612`, yazı `#ebe9e2`,
su `#7fb2e5`.

**Kapak ve sosyal (Fjord)**

| Ad | Hex | Kullanım |
|---|---|---|
| Fjord-blå | `#0d3557` | Haber kapağı zemini |
| Doku | `#24557f` | Zemindeki eş yükselti dokusu |
| Hvit | `#ffffff` | Başlık |
| Signalrød | `#c8281e` | İmzanın üstündeki çizgi, FORKLART etiketi, yazar adı |
| Is | `#e6eef6` | Ters Fjord zemini (imzalı yazılar) |

**Uyarı renkleri** (MET verisi, markaya ait değil): gult `#f2c400`, oransje `#f08a00`, rødt `#d9261c`.

## 8. Yazı

- **Archivo** (değişken, genişlik ekseniyle): kelime işareti, menü, etiketler, kenar boşluğu bilgileri, kapak başlıkları
  (kapakta Archivo'dan türetilmiş sabit kesimler: TidsrostTittel, TidsrostTung, TidsrostSemi, TidsrostBrod).
- **Source Serif 4** (değişken, optik boylu): sitede bütün başlıklar ve okuma metni.
- Sitede yazı tipleri `@fontsource-variable` paketlerinden, kendi sunucumuzda; kapak yazı tipleri ve OFL metinleri
  `scripts/nyheter/fonts/`.

## 9. Görsel dil

- **Site · harita yaprağı ("The Survey Sheet"):** Kartverket N50 topografik yaprağı gibi dizilir. Başlıkta her gün
  değişen eş yükselti haritası ("Ark"), kategoriler ve durumlar 12 piksel efsane simgeleri, bütün yapı 1 piksel kıl
  çizgi, 8 piksel ızgara; köşe yuvarlatması ve gölge yok. Görselsiz haber varsayılandır; kapak yalnız manşette
  (en çok 34rem) ve haber sayfasında görünür.
- **Kapak · Fjord:** koyu fiyort mavisi düz zemin, büyük beyaz kalın başlık, açık mavi eş yükselti dokusu, kırmızı
  çizgili imza. Yalnız başlık ve imza; kaynak, kategori, tarih ve veri kutusu yok (sahibin kuralı, 14 Ekim).
  Biçimler: site 1200×675, Instagram/Facebook gönderisi 1080×1350, hikâye 1080×1920.
- **Ters Fjord:** imzalı yazılar (Forklart, Kommentar): açık buz mavisi zemin, fiyort mavisi başlık, kırmızı tür etiketi
  ve kırmızı yazar adı.
- **Veri kapakları:** fare uyarı haritası (MET/NVE verisiyle, Kartverket altlığı) ve kur grafikleri kendi düzeninde
  kalır.

## 10. Hazır metinler (Norveççe) · öneri

**Sosyal biyografi:**
> tidsrøst – tidens stemme, rett fra kilden. Rolige nyheter fra Norge og verden, bygget på offentlige kilder. Uten reklame.

**Tek cümle tanıtım:**
> tidsrøst er en reklamefri nyhetstjeneste som forteller hva som skjer i Norge og verden, rett fra de offentlige kildene.

## 11. Uygulamalar

| Uygulama | Durum |
|---|---|
| Site, gece yaprağı, Temaer, `/styringsrenten/`, `/farevarsler/` | Canlı (harita yaprağı) |
| Haber kapağı, Forklart kapağı, FB/IG gönderi ve hikâye | Canlı (Fjord, ters Fjord) |
| Telegram | Canlı (`@tidsrost`) |
| Logo paketi, favicon, yayıncı logosu, profil fotoğrafı | Hazır (ø simgesi, 18 Ekim); profil fotoğrafını sahibi yükler |
| Sosyal kapak görseli (banner) | Henüz yok |

## 12. Yapılmayacaklar

- Medya kuruluşu adı ya da bağlantısı (metin, kaynak satırı, kapak: hiçbir yerde).
- Sarı (uyarı haritası dışında); su mavisinin yanına ikinci etkileşim rengi.
- Kapakta kaynak, kategori, tarih ya da veri kutusu.
- Başlığın üstünde üst etiket (kicker); serif künye; görsel ağırlıklı manşet ızgarası.
- Köşe yuvarlatması, gölge, kart; durumu yalnız renkle göstermek.
- Uydurma editör, yayıncı, org. no., okur sayısı; kaynaksız rakam.
- Moss şehir adı site metninde.
