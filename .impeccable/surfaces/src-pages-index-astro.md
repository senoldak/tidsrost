---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/layouts/Base.astro","src/pages/artikkel/[id].astro","src/pages/kategori/[slug].astro"]
---

# tidsrøst — reading surfaces (front page, category, article, static pages)

Scope: the whole public site shell, i.e. `Base.astro` frame, front page, category pages, article page, Om oss, Personvern and 404. Visitor mode: **Read**. Build path: code-led (Read surface, no image generation).

Audience/job: a general Norwegian reader scanning today's news, often on a phone, often landing straight on one article. Proof/content: real bot-written stories from official sources, many with no cover image. Constraints: CSP `font-src 'self'`, so fonts must be self-hosted; Norwegian copy; editorial notes (rettelse, produksjon) must stay visible; no kicker labels above headlines.

## Direction contract

THESIS: tidsrøst reads like the national topographic map sheet: exact, calm, everything locatable. It refuses the broadsheet template, meaning a serif masthead, a red category kicker over the headline, and an image-led hero grid.

OWN-WORLD: map-paper white ground, near-black survey ink and one water-blue accent. Contour-brown hairlines appear only in the frame, a pale forest tint serves as the surface, and MET-yellow is used for farevarsel. Archivo, set at wide and condensed widths, carries the frame labels and the wordmark. Source Serif 4 carries headlines and the reading column. Categories are SVG legend symbols (▲ ○ ■ …) drawn at one size everywhere. State is shown by a mark, not a hue.

STORY: the reader sees the lead and the "Siste" list at once, knows each story's source and how it was made, scans by legend symbol, then reads in a quiet column where the source and production note are clearly visible.

FIRST VIEWPORT: a sheet-margin strip (sources and tagline), then the contour masthead with the wordmark at bottom left and sheet/edition/date at bottom right, then a sticky legend nav. Below that, a text-first lead story fills two thirds: a large serif headline, the lead paragraph, and a meta line with symbol, source and production mark. Beside it sits the "Siste" list (newest four). Grid ticks mark the margin.

FORM: Kartverket N50 topographic sheet; my ordered list #7; seed key 7231d92e. Raises: legend-module categories (Dumbar), state-as-mark (cutting bench), named time bands I dag / I går / Tidligere (cyclorama), one rutenett module (brick), rank = one type step (cracktro).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Notes
- Dark scheme is a "nattark" (night sheet): a warm, ink-dark ground with strengthened contours. It is kept because the site already honoured readers' `prefers-color-scheme` before the redesign. Light map paper stays the primary sheet.
- Day bands are relative to build time (I dag / I går / Tidligere). The site rebuilds every 2 hours through the news bot.
- The side list beside the lead is labelled "Siste", not "I dag": it always shows the four newest stories, which may come from earlier days, so "I dag" would sometimes be false. Day bands below use I dag / I går / Tidligere.
- Siste nytt is a flag mark and farevarsel a hexagon with a bar, so neither shares the Innenriks triangle shape.
- List rows are text-only. Covers appear only on the lead story (capped) and on the article page.

## Unresolved
- No cover images for most stories; layout must never depend on them.
