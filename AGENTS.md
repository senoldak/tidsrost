## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Haber kaynakları gizlidir

Repo herkese açık. Botun okuduğu resmi olmayan haber kaynaklarının (haber siteleri, ajanslar) adı, alan adı ve akış
adresi repoya hiçbir yerde yazılmaz: kod, test, fixture, belge, durum dosyası (`sett.json`), commit mesajı ve log dahil.
Liste `scripts/nyheter/kilder/hemmelige-kilder.kryptert` dosyasında şifreli durur; anahtar `KILDE_NOKKEL`
(GitHub Secret, yerelde `.env`). Düzenlemek için `node scripts/nyheter/hemmelig.mjs apne`, sonra `lukk`.
Testlerde `avis-a.example` gibi uydurma adlar kullanılır. Resmi kaynaklar (Regjeringen, Stortinget, Norges Bank, SSB,
etater, UN News, Europakommisjonen…) bu kurala dahil değildir. `tekstverktoy.mjs` içindeki genel medya yasak listesi
(metinde medya anılmasın diye) alfabetik tutulur; akış listesinin sırasını ya da içeriğini yansıtmaz.
