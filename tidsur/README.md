# tidsur

Haber botunu Oslo saatiyle çift saatlerde (08–02, gece 03–08 arası yayın yok) çalıştıran küçük Cloudflare Worker (ücretsiz paket yeterli).
GitHub'ın kendi zamanlayıcısı (`schedule`) çalışmaları saatlerce geciktirip atlayabildiği için tetikleme Cloudflare'den yapılır.

## 1. GitHub token

1. github.com → sağ üst profil → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. Ad: `tidsur`. Süre: 1 yıl (bitiş tarihini takvime yaz; bitince bot durur).
3. **Repository access:** Only select repositories → `tidsrost`
4. **Permissions → Repository permissions → Actions:** Read and write (gerisi olduğu gibi kalsın)
5. **Generate token** → çıkan token'ı kopyala (bir kez gösterilir).

## 2. Cloudflare Worker

Kod ve zamanlama (`wrangler.jsonc`, cron `0 * * * *` (UTC); bot sadece Oslo saatiyle 08, 10 … 22, 00, 02'de başlar) bu klasörden yüklenir:

```
cd tidsur
npx wrangler login          # bir kerelik, tarayıcıda onay
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN   # token'ı sorduğunda yapıştır
```

Token'ı panelde düz değişken (Variable) olarak eklemeyin; `wrangler deploy` onu siler. Sadece `secret put` ya da panelde tür **Secret**.
Panelden "Import a repository" ile Worker oluşturmayın: sitenin ayarlarını alıp tidsrost.com alan adını üzerine çeker.

## Kontrol

- GitHub → tidsrost → **Actions** → Nyhetsbot: çalışmalar "workflow_dispatch" olarak görünür.
- Hata olursa: Cloudflare → Worker → **Logs** (ör. `GitHub 401` = token yanlış ya da süresi dolmuş).

## Telegram

Bu Worker yeni haberleri Telegram'a da gönderir (`telegram.js`): 10 dakikada bir sitenin RSS akışındaki gönderilmemiş en eski haberi kapak görseliyle yollar. Böylece bir vardiyanın haberleri 2 saate yayılır. Gece modunda (Oslo 03:00–07:59) gönderim yok; 24 saatten eski haber gönderilmez. Gönderilenler KV'de (`TELEGRAM_KV`, anahtar `gonderilen`) tutulur. Hedefler ve önek `wrangler.jsonc` içindeki `vars`'ta; bot token'ı secret olarak:

```
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

Bot, hedef kanalda yönetici olmalıdır. GitHub iş akışında artık Telegram adımı yok (iki taraf birden göndermesin).
