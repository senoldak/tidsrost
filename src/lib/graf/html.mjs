// Grafik kartının HTML'i (tek kaynak): Graf.astro ve Forklart eklentisi (forklart.mjs) bunu kullanır.
// Başlık, derlemede çizilen SVG, renk açıklaması, kaynak satırı, "Vis tallene" tablosu ve etkileşim JSON'u.
import { esc } from './felles.mjs';
import { tegnGraf } from './index.mjs';

/**
 * @param {import('./sema.mjs').GrafData} d
 * @param {{ id?: string, bred?: boolean, nivaa?: 2|3, visTittel?: boolean, tabell?: boolean }} [o]
 */
export function grafHtml(d, o = {}) {
  const { id, bred = false, nivaa = 3, visTittel = true, tabell = true } = o;
  const t = tegnGraf(d, { id, bred });
  const json = JSON.stringify({ modus: t.modus, punkter: t.punkter, bredde: t.bredde, ramme: t.ramme ?? null }).replace(/</g, '\\u003c');
  const h = `h${nivaa}`;
  const deler = [
    `<figure class="g-kort${bred ? ' g-bred' : ''}" data-graf tabindex="0">`,
    '<figcaption>',
    `<${h} class="g-tittel${visTittel ? '' : ' sr-only'}">${esc(d.tittel)}</${h}>`,
    d.under ? `<p class="g-under">${esc(d.under)}</p>` : '',
    d.tall ? `<p class="g-tall">${esc(d.tall.verdi)}${d.tall.etikett ? `<small>${esc(d.tall.etikett)}</small>` : ''}</p>` : '',
    '</figcaption>',
    `<div class="g-flate">${t.svg}<div class="g-tips" hidden></div></div>`,
    t.nokkel ? `<p class="g-nokkel">${t.nokkel.map((n) => `<span class="${n.klasse}">${esc(n.navn)}</span>`).join('')}</p>` : '',
    `<p class="g-kilde">Kilde: ${d.kilde.url ? `<a href="${esc(d.kilde.url)}">${esc(d.kilde.navn)}</a>` : esc(d.kilde.navn)}${d.kilde.tabell ? `, tabell ${esc(d.kilde.tabell)}` : ''}</p>`,
    tabell
      ? `<details class="g-tabell"><summary>Vis tallene</summary><div class="g-tabell-rull"><table><thead><tr>${t.tabell.kolonner.map((k) => `<th scope="col">${esc(k)}</th>`).join('')}</tr></thead><tbody>${t.tabell.rader.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div></details>`
      : '',
    `<script type="application/json" data-graf-punkter>${json}</script>`,
    '</figure>',
  ];
  return deler.join('');
}
