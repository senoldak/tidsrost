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

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → ad: `tidsrost-tidsur` → **Deploy**
2. **Edit code** → içeriği sil, `worker.js` dosyasının içeriğini yapıştır → **Deploy**
3. Worker sayfası → **Settings** → **Variables and Secrets** → **Add** → tür: **Secret**, ad: `GITHUB_TOKEN`, değer: token → **Deploy**
4. **Settings** → **Trigger Events** (Triggers) → **Add** → **Cron Triggers** → `17 */2 * * *` → **Add**

Cron saatleri UTC'dir: 00:17, 02:17 … (Norveç saatiyle 1–2 saat ileri).

## Kontrol

- GitHub → tidsrost → **Actions** → Nyhetsbot: çalışmalar "workflow_dispatch" olarak görünür.
- Hata olursa: Cloudflare → Worker → **Logs** (ör. `GitHub 401` = token yanlış ya da süresi dolmuş).
