// Deler ferdig rendret brødtekst-HTML etter det n-te avsnittet på øverste nivå (ikke avsnitt inni sitater/lister),
// slik at ett modulkort kan stå midt i teksten uten skript. Færre enn n + 1 avsnitt: modulen hører etter teksten.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** @returns {[string, string]} [før, etter]; etter er tom når teksten ikke har nok avsnitt. */
export function delEtterAvsnitt(html = '', n = 2, minst = 3) {
  const s = String(html ?? '');
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let dybde = 0;
  let avsnitt = 0;
  let snitt = -1;
  for (let m; (m = re.exec(s)); ) {
    if (m[0].startsWith('<!--')) continue;
    const navn = m[2].toLowerCase();
    if (VOID.has(navn) || m[3] === '/') continue;
    if (m[1] === '/') {
      dybde = Math.max(0, dybde - 1);
      if (dybde === 0 && navn === 'p') {
        avsnitt++;
        if (avsnitt === n) snitt = m.index + m[0].length;
      }
    } else dybde++;
  }
  if (avsnitt < minst || snitt < 0) return [s, ''];
  return [s.slice(0, snitt), s.slice(snitt)];
}
