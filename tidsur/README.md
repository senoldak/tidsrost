# tidsur

Haber botunu her 2 saatte bir çalıştıran küçük Cloudflare Worker (ücretsiz paket yeterli).
GitHub'ın kendi zamanlayıcısı (`schedule`) çalışmaları saatlerce geciktirip atlayabildiği için tetikleme Cloudflare'den yapılır.

## 1. GitHub token

1. github.com → sağ üst profil → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. Ad: `tidsur`. Süre: 1 yıl (bitiş tarihini takvime yaz; bitince bot durur).
3. **Repository access:** Only select repositories → `tidsrost`
4. **Permissions → Repository permissions → Actions:** Read and write (gerisi olduğu gibi kalsın)
5. **Generate token** → çıkan token'ı kopyala (bir kez gösterilir).

## 2. Cloudflare Worker

Kod ve zamanlama (`wrangler.jsonc`, cron `17 */2 * * *`, UTC) bu klasörden yüklenir:

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
