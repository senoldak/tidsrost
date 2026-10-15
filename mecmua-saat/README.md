# mecmua-saat

tidsrost, kifobu ve finfolis'in haber botlarını (ve kifobu bültenini) zamanında başlatan, Telegram kuyruklarını işleyen tek Cloudflare Worker.
Cloudflare ücretsiz paketinde hesap başına 5 cron hakkı var; bu Worker 1 tanesini kullanır.

- Cron: `*/10 * * * *` (UTC). Botlar Oslo saatiyle çift saatlerde: tidsrost :00, kifobu :20, finfolis :40. Gece 03–08 yayın yok.
- Telegram: her çağrıda site başına en fazla 1 haber (telegram.js). kifobu'da her gün 4 gönderi (Türkiye saati): 09:00 sabah, 13:00 öğle, 18:00 tablolu kapanış, 23:00 gece.

## Gizli değişkenler

```
cd mecmua-saat
npx wrangler secret put GITHUB_TOKEN_TIDSROST
npx wrangler secret put GITHUB_TOKEN_KIFOBU
npx wrangler secret put GITHUB_TOKEN_FINFOLIS
npx wrangler secret put TELEGRAM_BOT_TOKEN_TIDSROST
npx wrangler secret put TELEGRAM_BOT_TOKEN_KIFOBU
npx wrangler secret put TELEGRAM_BOT_TOKEN_FINFOLIS
```

Üç repoya yetkili tek GitHub token'ı varsa `GITHUB_TOKEN` yeterli (Telegram için de `TELEGRAM_BOT_TOKEN`).
