// rehype-plugin: pakker inn første forekomst (maks 3 per dokument) av ord med forklaring fra Bokmålsordboka
// i <button class="ord">. Bare saker under src/content/haberler/, bare tekst i avsnitt (<p>), ikke i overskrifter,
// lenker, kode eller knapper. Ingen avhengigheter: egen liten rekursiv gjennomgang.
import { finnOrd } from './ordforklaring.mjs';

const MAKS = 3;
const HOPP_OVER = new Set(['a', 'code', 'pre', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'kbd', 'svg']);

function erSak(file) {
  const stier = [file?.path, ...(file?.history ?? [])].filter(Boolean);
  return stier.some((s) => String(s).split(String.fromCharCode(92)).join('/').includes('src/content/haberler/'));
}

export function rehypeOrd(ordbok) {
  return function () {
    return (tre, file) => {
      if (!erSak(file)) return;
      const brukt = new Set();

      function tekstnode(node, slikt) {
        const treff = finnOrd(node.value, ordbok, MAKS - brukt.size, brukt);
        if (!treff.length) return [node];
        const ut = [];
        let pos = 0;
        for (const t of treff) {
          brukt.add(t.lemma);
          if (t.start > pos) ut.push({ type: 'text', value: node.value.slice(pos, t.start) });
          ut.push({
            type: 'element',
            tagName: 'button',
            properties: { type: 'button', className: ['ord'], dataLemma: t.lemma, dataDef: t.def, ariaExpanded: 'false' },
            children: [{ type: 'text', value: t.ord }],
          });
          pos = t.slutt;
        }
        if (pos < node.value.length) ut.push({ type: 'text', value: node.value.slice(pos) });
        return ut;
      }

      function gå(node, iAvsnitt) {
        if (!node.children || brukt.size >= MAKS) return;
        const ut = [];
        for (const barn of node.children) {
          if (brukt.size >= MAKS) { ut.push(barn); continue; }
          if (barn.type === 'text') {
            ut.push(...(iAvsnitt ? tekstnode(barn) : [barn]));
          } else if (barn.type === 'element') {
            if (!HOPP_OVER.has(barn.tagName)) gå(barn, iAvsnitt || barn.tagName === 'p');
            ut.push(barn);
          } else {
            ut.push(barn);
          }
        }
        node.children = ut;
      }

      gå(tre, false);
    };
  };
}

export default rehypeOrd;
