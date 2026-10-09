// Regjeringen.no: departementlerin haber ve basın bültenleri.
import { hentTekst, lesRss, htmlTilTekst, decodeEntities, gemini, osloIso, KATEGORIER } from '../lib.mjs';

// GEMINI_API_KEY yoksa bu kaynak hiç çalışmaz (bkz. lag()).

const FEED = 'https://www.regjeringen.no/no/rss/Rss/2581966/?documentType=aktuelt/nyheter';

// Haber değeri düşük rutin başlıklar.
const HOPP_OVER = [/program (for )?(uke|veke)/i, /^statsr[åa]dens program/i, /ledig stilling/i];

const SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Nyhetstittel, maks 90 tegn' },
    description: { type: 'string', description: 'Ingress, 1–2 setninger' },
    body: { type: 'string', description: 'Brødtekst i Markdown, 3–6 avsnitt, uten overskrift' },
    category: { type: 'string', enum: KATEGORIER },
  },
  required: ['title', 'description', 'body', 'category'],
};

function lesSide(html) {
  const ingressStart = html.indexOf('class="article-ingress"');
  const ingress = ingressStart > -1 ? htmlTilTekst(html.slice(ingressStart, html.indexOf('</div>', ingressStart)).replace(/^[^>]*>/, '')) : '';
  const bodyStart = html.indexOf('class="article-body"');
  const bodyEnd = html.indexOf('<aside', bodyStart);
  const body = bodyStart > -1 ? htmlTilTekst(html.slice(bodyStart, bodyEnd > -1 ? bodyEnd : undefined).replace(/^[^>]*>/, '')) : '';
  const dep = html.match(/class="content-owner-dep"[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
  return { ingress, body, departement: dep ? decodeEntities(dep[1]).trim() : 'Regjeringen' };
}

function prompt(item, side) {
  return `Du er nyhetsjournalist i nettavisen tidsrøst. Skriv en kort, nøytral nyhetssak på norsk bokmål basert på pressemeldingen under.

Regler:
- Bruk bare fakta fra pressemeldingen. Ikke legg til noe du ikke vet.
- Ikke kopier setninger ordrett; skriv med egne ord. Direkte sitater er lov, men bare med anførselstegn og tydelig hvem som sier det.
- Første avsnitt skal fortelle det viktigste: hvem, hva, hvorfor.
- Nevn at opplysningene kommer fra ${side.departement}.
- Ingen overskrift i body, ingen kildehenvisning nederst (den legges til automatisk).
- Velg kategori: innenriks (norske forhold), utenriks (internasjonalt), okonomi, kultur, teknologi eller sport.

Avsender: ${side.departement}
Tittel: ${item.title}
Ingress: ${side.ingress || item.description}

Tekst:
${side.body.slice(0, 12000)}`;
}

export default {
  navn: 'regjeringen',
  async hent() {
    const items = lesRss(await hentTekst(FEED));
    const naa = Date.now();
    return items
      .filter((i) => i.guid && !HOPP_OVER.some((r) => r.test(i.title)))
      .filter((i) => new Date(i.pubDate).getTime() <= naa)
      .map((item) => ({
        id: `regjeringen:${item.guid}`,
        tid: new Date(item.pubDate),
        tittel: item.title,
        async lag() {
          const url = item.link.replace(/\?.*$/, '');
          const side = lesSide(await hentTekst(url));
          const kilde = { navn: `${side.departement} / regjeringen.no`, url };
          // Anahtar yoksa null döner; haber atlanır ve sonraki çalışmada tekrar denenir.
          // Bülten metnini olduğu gibi yayınlamıyoruz.
          const ai = await gemini({ prompt: prompt(item, side), schema: SKJEMA });
          return ai && { ...ai, date: osloIso(), kilde };
        },
      }));
  },
};
