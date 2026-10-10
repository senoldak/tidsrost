# tidsrost

Astro ile yapılmış, Cloudflare'de ücretsiz yayınlanan haber sitesi. Haberler `/admin` adresindeki panelden (Sveltia CMS) girilir ve GitHub'da saklanır.

## Yapı

| Klasör / dosya | Ne işe yarar |
|---|---|
| `src/content/haberler/<haber>/index.md` | Her haber kendi klasöründe, kapak resmiyle birlikte |
| `src/lib/site.ts` | Site adı, açıklama, sosyal medya linkleri, kategoriler |
| `public/admin/config.yml` | Panel ayarları (kategoriler `site.ts` ile aynı olmalı) |
| `src/styles/global.css` | Tasarım (renkler en üstte) |
| `scripts/nyheter/bilde.mjs` | Botun kapak resimleri: uyarı haritası, kur grafiği, kaynak kartı. Dışarıdan fotoğraf alınmaz, telif derdi yok |
| `tidsur/` | Botu her 2 saatte bir başlatan Cloudflare Worker (GitHub'ın zamanlayıcısı güvenilmez). Kurulum: `tidsur/README.md` |

## Kurulum (bir kerelik)

1. **GitHub:** github.com'da `tidsrost` adında bir repo aç ve bu klasörü yükle.
2. **Panel ayarı:** `public/admin/config.yml` içinde repo `senoldak/tidsrost` olarak ayarlı.
3. **Cloudflare:** Workers & Pages → Create → Workers → "Import a repository" → `tidsrost` reposunu bağla (Workers Builds).
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Ayarlar `wrangler.jsonc` dosyasından okunur: site `dist` klasöründen statik dosya olarak yayınlanır.
4. **Alan adı:** `tidsrost.com` alan adı `wrangler.jsonc` içindeki `routes` ile her yayında otomatik bağlanır; panelden ayrıca eklemeye gerek yok.
5. **Panele giriş:** `tidsrost.com/admin` → "Erişim Token'ı Kullanarak Giriş Yap". Açılan GitHub sayfasında token oluştur (sadece `tidsrost` reposuna, Contents: Read and write) ve yapıştır. Tarayıcı bunu hatırlar.

## Günlük kullanım

`tidsrost.com/admin` → Haberler → Yeni Haber → yaz, resim ekle → Kaydet. Site 1-2 dakika içinde güncellenir.

- **Manşet:** Anasayfanın en üstünde büyük gösterilir.
- **Son dakika:** Kırmızı şeritte gösterilir.
- **Taslak:** Sitede görünmez.

## Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```
