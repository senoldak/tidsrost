# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

General Norwegian news readers who want a quick, reliable read of what is happening in Norway and the world, as an everyday alternative to the large outlets. They read on phones and desktops, often in short sessions, and many arrive directly on a single article.

## Product Purpose

tidsrøst ("time's voice") publishes short, factual news in Norwegian Bokmål (`nb-NO`). Most stories come from an automated newsroom bot that turns official public sources into articles. A human editor can also write stories through the `/admin` panel. Success means readers trust it as a calm, honest, readable daily news source.

## Positioning

A non-commercial news site with no ads and no revenue. Its base is primary public sources (Regjeringen, Stortinget, Norges Bank, NVE, MET, about 30 Norwegian agencies, UN News and the European Commission). Since 2026-10-11 it also covers news from Norwegian media (NRK, VG, Aftenposten, E24, TV 2 and others), but only events reported by at least two different outlets; an outlet's own scoop is credited to it, and every such story links to the outlets (owner's decision, to avoid taking a single outlet's exclusive). It is open about how each story was produced, through a production note under each article, and it follows Vær Varsom-plakaten and Redaktørplakaten.

## Operating Context

- Content lives as Markdown folders in `src/content/haberler/<slug>/index.md` with an optional cover image. It is edited through Sveltia CMS at `/admin` and stored on GitHub.
- A GitHub Actions bot (`.github/workflows/nyheter.yml`, `scripts/nyheter/`) fetches sources, writes stories and publishes them automatically.
- Many bot stories have **no cover image**, so every layout must look complete without imagery.
- Flags: `featured` (manşet, the lead story on the front page), `breaking` (Siste nytt strip), draft.
- Categories, shown only when they have stories: Innenriks, Utenriks, Økonomi, Sport, Kultur, Teknologi.
- Pages: front page, category pages, article, Om oss, Personvern, 404, RSS.

## Capabilities and Constraints

- Astro static site, deployed as a Cloudflare Worker with static assets (Workers Builds, config in `wrangler.jsonc`). Security headers live in `public/_headers`, so any external font or asset host must be allowed there.
- Corrections (`rettelse`) and production/AI disclosures (`produksjon`, `KI_MERKING` in `src/lib/site.ts`) are editorial obligations and must stay visible.
- Editor-facing comments in the code are Turkish; all reader-facing copy is Norwegian.
- Sister sites `finfolis` and `kifobu` (Turkish) share the same code skeleton but must each have a **fully separate identity**, with no shared family look.

## Brand Commitments

- Name: **tidsrøst**, always lowercase, with the ø.
- Favicon: a red (#ff0000) lowercase "t" set in Coloman, made by the owner. Files: `public/favicon.svg` (vector traced from the owner's PNG; there is no other source), `favicon.ico`, `favicon-32/192/512.png`, `apple-touch-icon.png`. It is the site's own brand mark, so its red stays even though the page accent is water blue.
- Voice: plain, sober Norwegian with no clickbait.
- Footer statements on non-commercial status and press ethics are binding.

## Evidence on Hand

- Real articles in `src/content/haberler/`.
- Not on hand: a named editor, publisher or org.nr. (fields in `site.ts` are empty), social accounts, a full logo file beyond the favicon, testimonials or readership numbers. Do not fabricate any of these.

## Product Principles

1. Trust first: sourcing, corrections and production notes are part of the reading experience, never hidden.
2. Calm over loud: urgency comes from the news itself, never from the design.
3. Complete without images: text-only stories are the default case.
4. Fast and light: a static site that works well on a phone over a weak connection.
