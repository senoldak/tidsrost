---
name: tidsrøst
description: Calm Norwegian daily news set as a national topographic map sheet.
colors:
  paper: "#fdfdfb"
  surface-forest: "#f1f5ec"
  ink: "#16191c"
  ink-2: "#2f353a"
  muted: "#5a6168"
  rule: "#dcded8"
  water: "#1f5f99"
  breaking-red: "#c8281e"
  contour-index: "#a0643c"
  contour-intermediate: "#b07a55"
  contour-shore: "#3a78b5"
  varsel-gult: "#f2c400"
  varsel-oransje: "#f08a00"
  varsel-rodt: "#d9261c"
  nattark-paper: "#171612"
  nattark-surface: "#1f1e19"
  nattark-ink: "#ebe9e2"
  nattark-ink-2: "#cdcac0"
  nattark-muted: "#a19d92"
  nattark-rule: "#33312b"
  nattark-water: "#7fb2e5"
  nattark-red: "#ff7a6b"
  nattark-contour-index: "#c49470"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(3rem, 8.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif"
    fontSize: "clamp(2rem, 4.2vw, 3.4rem)"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-0.018em"
  title:
    fontFamily: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif"
    fontSize: "clamp(1.1875rem, 1.7vw, 1.4375rem)"
    fontWeight: 600
    lineHeight: 1.25
  standfirst:
    fontFamily: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif"
    fontSize: "clamp(1.125rem, 1.6vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'lnum'"
  prose:
    fontFamily: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.7
  nav:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    fontVariation: "'wdth' 96"
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 92"
  band:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  sheet-margin:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.09em"
    fontVariation: "'wdth' 88"
rounded:
  none: "0"
spacing:
  u: "8px"
  u2: "16px"
  u3: "24px"
  u4: "32px"
  u5: "40px"
  u6: "48px"
  u8: "64px"
  u10: "80px"
  gutter: "clamp(16px, 4vw, 40px)"
  max: "1280px"
components:
  legend-nav-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    rounded: "{rounded.none}"
    height: "48px"
  legend-nav-link-active:
    textColor: "{colors.water}"
  breaking-strip-label:
    textColor: "{colors.breaking-red}"
    typography: "{typography.band}"
    padding: "8px 16px"
  story-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "20px 0"
  meta-line:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  band-heading:
    textColor: "{colors.ink}"
    typography: "{typography.band}"
  rettelse-note:
    backgroundColor: "{colors.surface-forest}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  site-footer:
    backgroundColor: "{colors.surface-forest}"
    textColor: "{colors.muted}"
    padding: "40px 0 24px"
---

# Design System: tidsrøst

## Overview

**Creative North Star: "The Survey Sheet"**

tidsrøst is set like a Kartverket N50 topographic sheet: map-paper white, near-black survey ink, one water-blue accent, and a frame of marginalia around a calm reading field. Everything is locatable. Every story carries the same row of legend marks (category, source, how it was made), and the reader scans by symbol and time, not by colour or image. The whole system is drawn with hairlines on an 8px grid (rutenett), with no radius and no shadow.

The frame and the reading field are typeset differently. Archivo, at condensed and wide widths, does the cartographic work: the sheet-margin strip, the wordmark, the legend nav, meta lines, band headings and the margin column. Source Serif 4 carries every headline and the reading column. Rank is shown by one step in type size and weight, never by a colour block or a card. Images are optional. Text-only stories are the default, and every layout is complete without a cover.

The masthead is a generated contour field that changes daily (a new "Ark" each day), with the wordmark and the edition date set on paper-coloured label halos, the way names sit on a map. A dark "nattark" (night sheet) honours `prefers-color-scheme`. It is a warm ink-dark ground, not blue slate, and light map paper stays the primary sheet.

**Key Characteristics:**
- Map paper, survey ink, one water-blue accent; contour brown only in the frame.
- Categories and states are SVG legend symbols, drawn at 12px everywhere.
- Hairline rules (1px) for all structure; zero radius; no shadows.
- Archivo for the frame, Source Serif 4 for headlines and reading.
- 8px rutenett for all spacing; 80px tick marks along the masthead's lower edge.
- Text-first: covers appear only on the lead story (capped at 34rem) and the article page.

## Colors

Survey-sheet restraint: paper and ink do almost all the work, water blue marks interaction and position, and the remaining hues each belong to one cartographic or editorial meaning.

### Primary
- **Water Blue** (water): the single accent. Used for links in prose and production notes, the active legend-nav item and its 3px underline, link hover, focus rings, text selection, the "ø" in the wordmark, and "Alle saker" index links. In nattark it lifts to Nattark Water.

### Secondary
- **Contour Brown** (contour-index, contour-intermediate): index and intermediate contour lines in the masthead terrain and the favicon. Frame only.
- **Shoreline Blue** (contour-shore): the lowest contour in the masthead, read as the waterline.

### Tertiary
- **Breaking Red** (breaking-red): only for the Siste nytt flag mark, its label in the breaking strip, and its legend entry. It always appears alongside the flag symbol, never on its own.
- **Farevarsel Yellow / Orange / Red** (varsel-gult, varsel-oransje, varsel-rodt): MET/NVE warning-level fills on the hexagon varsel symbol only. The bar inside the hexagon is always stroked in ink (#16191c), whatever the scheme.

### Neutral
- **Map Paper** (paper): page ground, sticky nav ground, and the label halo behind the wordmark and edition.
- **Forest Tint** (surface-forest): the only surface tone, used on the footer and the rettelse note.
- **Survey Ink** (ink): text, structural hairlines (masthead base, band rules, page-head rule, margin-column top rule, breaking-strip border).
- **Ink 2** (ink-2): standfirsts, lead paragraphs, row descriptions, secondary list text.
- **Muted Grey** (muted): meta lines, time stamps, sheet-margin text, captions.
- **Rule Grey** (rule): row dividers, list dividers, image borders, nav bottom rule, nav hover underline.
- **Nattark set** (nattark-*): the warm dark scheme values for the same roles, applied under `prefers-color-scheme: dark`. Covers are dimmed to `brightness(0.78)` in nattark.

### Named Rules
**The One Water Rule.** Water blue is the only interactive accent. Nothing else is clickable-coloured, and no second accent is introduced.

**The Frame-Only Contour Rule.** Contour brown belongs to the masthead terrain and the favicon. It never colours text, rules, or content.

**The Mark-Not-Hue Rule.** State is carried by a legend symbol. Breaking red and farevarsel colours always accompany their symbol and label; a colour never carries a state alone.

## Typography

**Display Font:** Archivo Variable (with Archivo, system-ui)
**Body Font:** Source Serif 4 Variable, optical sizing on (with Source Serif 4, Georgia)

**Character:** A cartographer's grotesque in the margins, using its width axis (88% to 112%) like map lettering, around a sober, optically sized text serif that does all the reading. Both are self-hosted (CSP `font-src 'self'`).

### Hierarchy
- **Display** (Archivo 800, wdth 112, clamp(3rem, 8.4vw, 6rem), 0.9): the wordmark only. The footer repeats it at 2rem.
- **Headline** (Source Serif 4 650, clamp(2rem, 4.2vw, 3.4rem), 1.06, -0.018em): the lead story. The article h1 (clamp(2rem, 4.6vw, 3.25rem), 1.08) and page titles (clamp(2.25rem, 5vw, 3.5rem), 1.05) use the same weight and tracking.
- **Title** (Source Serif 4 600, clamp(1.1875rem, 1.7vw, 1.4375rem), 1.25): story-row headlines. Side-list headlines use 1.1875rem/1.28, and index list items use 500 1.0625rem/1.35.
- **Standfirst** (Source Serif 4 400, clamp(1.125rem, 1.6vw, 1.3125rem), 1.5, ink-2, max 62ch): lead-story and article lead paragraphs.
- **Body / Prose** (Source Serif 4 400, 1.0625rem/1.6 base; 1.1875rem/1.7 in articles, column 70ch): reading text. Prose h2/h3 are 650 at 1.5rem/1.25rem. Blockquotes are italic 1.3125rem with a 1px ink left rule.
- **Nav** (Archivo 600, wdth 96, 0.9375rem): legend-nav items.
- **Label** (Archivo 500, wdth 92, 0.8125rem/1.4, +0.01em): meta lines, the margin column, captions (0.875rem, wdth 94).
- **Band** (Archivo 700, 0.75rem, +0.14em, uppercase): section band headings (Siste, I dag, I går, Tidligere, Etter tema), footer column heads (0.6875rem), the breaking label (+0.1em), and margin-column terms.
- **Sheet margin** (Archivo 500, wdth 88, 0.6875rem, +0.09em, uppercase): the top strip and the edition line.

### Named Rules
**The One-Step Rank Rule.** Importance is shown by one step of the type scale (headline, then title), not by colour, boxes, or imagery.

**The Two-Hands Rule.** Archivo labels the sheet; Source Serif 4 says the news. No story headline is set in Archivo, and no frame label is set in serif (the edition date is the one deliberate serif in the margin).

**The No-Kicker Rule.** Nothing sits above a headline. Category, source and time go in the meta line beneath it.

## Layout

The sheet is a centred container (max 1280px) with a fluid gutter (clamp(16px, 4vw, 40px)). Every spacing value is a multiple of the 8px unit, with half-steps (12px, 20px) allowed inside components. Vertical order: the sheet-margin strip (min 32px), the contour masthead (min clamp(128px, 15vw, 184px), wordmark bottom left, edition bottom right), and a sticky legend nav (48px targets).

- **Front page:** an optional breaking strip, then a 2fr / minmax(280px, 1fr) grid (lead story beside the Siste list of four, 48px gap), then day bands of story rows, then the Etter tema index (auto-fill minmax(260px, 1fr)).
- **Story row:** a gazetteer line with a 4.5rem tabular time column and a text body, separated by rule hairlines.
- **Article:** a three-column grid (200px margin column, minmax(0, 70ch) reading column, 1fr). The margin column is a sticky `dl` of Varsel / Tema / Publisert / Kilde / Laget / Av. Figures span into the third column (max 920px).
- **Responsive:** at 1080px the article collapses to one 72ch column and the margin column becomes an inline wrapped row under the lead. At 860px the lead/Siste grid and the footer stack, and the sources list hides. At 640px the masthead stacks, rows drop the time column and descriptions, and body text drops to 1rem.

## Elevation & Depth

The system is completely flat. Depth comes from paper and hairlines, as on a printed sheet: 1px ink rules mark the frame and section edges, and 1px rule-grey lines divide items. The only overlap is the label halo, where the wordmark and edition sit on map-paper patches over the contour terrain. The sticky nav separates by its paper ground and bottom rule, not by a shadow.

### Named Rules
**The Printed Sheet Rule.** No drop shadows, no blur, no raised cards. The 3px inset underline on legend-nav items is a position marker, not elevation.

## Shapes

Square corners everywhere (radius 0). Borders are always 1px, ink for structure and rule grey for division. Form comes from the legend symbols: a 12x12 viewBox set of triangle, ring, square, diamond, disc, hollow square, flag, hexagon-with-bar, bar chart, asterisk, and ringed dot, all filled or stroked in `currentColor`. The masthead's lower edge carries a tick every 80px (1px ink, 7px tall, 60% opacity). The favicon's 12px corner radius is an app-icon convention and does not extend to the interface.

## Components

### Navigation (Legend nav)
- **Character:** the map legend as navigation.
- **Style:** a sticky paper bar with a rule bottom border. Items are Archivo 600 0.9375rem, at least 48px tall, each led by its category symbol, with a 24px gap and horizontal scroll on overflow.
- **Hover:** a 3px rule-grey inset underline; no text underline.
- **Active:** water text with a 3px water inset underline.

### Meta line (StoryMeta)
- **Character:** the legend row under every story.
- **Style:** a wrapping flex row (gap 4px 18px) in Archivo label type, muted. Each item is a symbol plus text (gap 0.45em), in this order: farevarsel, Siste nytt, category, time, source, production mark. Varsel and breaking items are weight 650.

### Story row
- **Character:** a gazetteer entry; text-only.
- **Style:** time column (Archivo 600 0.875rem, tabular, muted) and body (title headline, ink-2 description at max 68ch, meta line). 20px vertical padding and a rule bottom border.

### Band heading
- **Style:** band type in ink, followed by a 1px ink line that fills the remaining width. An optional muted link sits at the end.

### Breaking strip
- **Style:** a 1px ink box. The left cell holds the red flag mark and the uppercase "Siste nytt" label, separated by an ink rule. The right cell holds serif 600 1rem headlines, with horizontal scroll.

### Rettelse note
- **Style:** a 1px ink border on forest tint, 12px 16px padding, Archivo 500 0.9375rem, led by the rettelse symbol. It sits above the prose and must stay visible.

### Produksjon note
- **Style:** a 1px ink top rule, Archivo 0.875rem muted, led by the production symbol, with an underlined water link.

### Links
- **Default:** inherit colour, no underline. **Hover:** water colour with a 1px underline at 0.18em offset. **In prose and notes:** always water and underlined. **Focus:** 2px water outline, 3px offset.

### Footer (Tegnforklaring)
- **Style:** forest-tint ground with a 1px ink top rule, a three-column grid (1.2fr 1fr 1fr). It holds the small wordmark, the binding ethics statements, the full legend (tegnforklaring) listing every symbol, and the editorial links.

### Contour masthead (signature)
- A 1440x200 SVG generated at build time from the Oslo date: 13 contour levels by marching squares. Intermediate lines are 0.8px at 60% opacity, every fifth is an index line at 1.5px, and the lowest is a shoreline line in blue. It covers the masthead (`object-fit: cover`) behind paper-halo labels. The page shell's view transition keeps it in place while content fades out (160ms) and rises in (320ms, cubic-bezier(0.16, 1, 0.3, 1), 10px). Reduced motion removes the animation.

## Do's and Don'ts

### Do:
- **Do** mark every category and state with its legend symbol at 12px, and add any new category's symbol to the set and the footer legend.
- **Do** keep all structure in 1px hairlines: ink for frame and section edges, rule grey for item dividers.
- **Do** space everything on the 8px unit.
- **Do** make every layout complete without a cover image; covers are capped (34rem on the lead) and bordered in rule grey.
- **Do** keep the rettelse and produksjon notes visible in the article flow.
- **Do** set headlines and reading text in Source Serif 4 and frame labels in Archivo, using its width axis.

### Don't:
- **Don't** put kicker or eyebrow labels above headlines; category and source belong in the meta line.
- **Don't** use a serif masthead, a red category kicker, or an image-led hero grid (the broadsheet template the world rejects).
- **Don't** add radius, drop shadows, or raised cards.
- **Don't** introduce a second interactive accent beside water blue, or use contour brown outside the masthead and favicon.
- **Don't** show a state by colour alone; breaking red and farevarsel colours always ride with their symbol and label.
- **Don't** put covers on list rows or the Siste list.
