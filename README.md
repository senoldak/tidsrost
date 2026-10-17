# tidsrost

Astro ile yapılmış, Cloudflare'de ücretsiz yayınlanan haber sitesi. Haberler Markdown dosyası olarak GitHub'da saklanır.

## Yapı

| Klasör / dosya | Ne işe yarar |
|---|---|
| `src/content/haberler/<haber>/index.md` | Her haber kendi klasöründe, kapak resmiyle birlikte |
| `src/lib/site.ts` | Site adı, açıklama, sosyal medya linkleri, kategoriler |
| `src/styles/global.css` | Tasarım (renkler en üstte) |
| `scripts/nyheter/bilde.mjs` | Botun kapak resimleri: uyarı haritası, kur grafiği, kaynak kartı. Dışarıdan fotoğraf alınmaz, telif derdi yok |
| `scripts/nyheter/kilder/etater.mjs` | Botun RSS/haber listesinden okuduğu kurumlar (SSB, Nkom, Mattilsynet, Datatilsynet, Kulturdirektoratet, Norges Bank, Finanstilsynet, Konkurransetilsynet, Skatteetaten, Vegvesen, FHI, DSB, HI, Sivilombudet, Forbrukerrådet, Idrettsforbundet, Norfund). Yeni kurum buraya eklenir; ortak süreç `pressemelding.mjs` |
| `scripts/nyheter/kilder/udi.mjs` | UDI aylık istatistikleri (iltica, çalışma ve aile izinleri): yeni ay gelince yapay zekâsız veri haberi |
| `tidsur/` | Botu Oslo saatiyle çift saatlerde (08–02) başlatan Cloudflare Worker (GitHub'ın zamanlayıcısı güvenilmez). Kurulum: `tidsur/README.md` |

## Kurulum (bir kerelik)

1. **GitHub:** github.com'da `tidsrost` adında bir repo aç ve bu klasörü yükle.
2. **Cloudflare:** Workers & Pages → Create → Workers → "Import a repository" → `tidsrost` reposunu bağla (Workers Builds).
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Ayarlar `wrangler.jsonc` dosyasından okunur: site `dist` klasöründen statik dosya olarak yayınlanır.
3. **Alan adı:** `tidsrost.com` alan adı `wrangler.jsonc` içindeki `routes` ile her yayında otomatik bağlanır; panelden ayrıca eklemeye gerek yok.

## Günlük kullanım

Haber eklemek için `src/content/haberler/` altına Markdown dosyası ekleyip GitHub'a gönder. Site 1-2 dakika içinde güncellenir. Ön bilgi (frontmatter) alanları:

- **Manşet:** Anasayfanın en üstünde büyük gösterilir.
- **Son dakika:** Kırmızı şeritte gösterilir.
- **Taslak:** Sitede görünmez.

## Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```
