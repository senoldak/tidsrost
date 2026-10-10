// Stortinget: Meclis'in karara bağladığı dosyalar.
// Kaynak, Meclis'in kendi yazdığı tarafsız karar özeti (kortvedtak); haber bundan yazılır ve
// yazı işleri sürecinden (redaktor.mjs) geçer. GEMINI_API_KEY yoksa bu kaynak çalışmaz.
import { hentJson, gemini, osloIso, KATEGORIER } from '../lib.mjs';
import { redigerSak } from '../redaktor.mjs';

const API = 'https://data.stortinget.no/eksport';
const KILDE_URL = (id) => `https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${id}`;
// Sadece son birkaç günde karara bağlanan dosyalar; eski birikim yayınlanmaz.
// Test için: STORTINGET_SESJON=2025-2026 STORTINGET_ALDER_DAGER=200
const MAKS_ALDER_DAGER = Number(process.env.STORTINGET_ALDER_DAGER || 4);
// Her çalışmada detayına bakılacak en fazla dosya (API'yi yormamak için).
const MAKS_DETALJER = 25;

// Haber değeri düşük rutin dosyalar.
const HOPP_OVER = [/^innberetning fra valgkomiteen/i, /suppleringsvalg/i, /^valg av/i, /saker som stortinget ikke har behandlet/i, /^referat/i];
const HOPP_KOMITE = new Set(['VALG']);

// Meclis oturumu 1 Ekim'de başlar: Ekim–Aralık → "2026-2027", Ocak–Eylül → "2025-2026".
function sesjon(d = new Date()) {
  const y = d.getUTCFullYear();
  return d.getUTCMonth() >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const msFra = (s) => Number(String(s ?? '').match(/\d+/)?.[0] ?? 0);

const SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Nyhetstittel, maks 90 tegn' },
    description: { type: 'string', description: 'Ingress, 1–2 setninger' },
    body: { type: 'string', description: 'Brødtekst i Markdown, 2–4 korte avsnitt, uten overskrift' },
    category: { type: 'string', enum: KATEGORIER },
  },
  required: ['title', 'description', 'body', 'category'],
};

function prompt(kilde) {
  return `Du er nyhetsjournalist i nettavisen tidsrøst, som arbeider etter Vær Varsom-plakaten. Skriv en kort, nøytral nyhetssak på norsk bokmål om et vedtak i Stortinget, basert BARE på opplysningene under fra Stortingets egne sider.

Regler:
- Bruk bare opplysninger som står i materialet. Ikke legg til bakgrunn, tall, navn, partier, stemmetall eller begrunnelser fra egen kunnskap.
- Utfallet skal gjengis nøyaktig: Står det «Forslaget ble ikke vedtatt», skal saken si at Stortinget ikke vedtok forslaget. Ikke bland «forslag», «innstilling» og «vedtak».
- Nevn hvilke partier som sto bak et representantforslag bare hvis det står i materialet.
- Ingen egne vurderinger, ladede ord eller spekulasjon om konsekvenser.
- Tittelen skal si hva Stortinget gjorde (f.eks. «Stortinget sa nei til forslag om …», «Stortinget vedtok …»).
- Nevn at opplysningene kommer fra Stortinget.
- Ingen overskrift i body, ingen kildehenvisning nederst (den legges til automatisk).
- Kategori: okonomi for skatt, avgifter, budsjett og næringsliv; ellers innenriks (utenriks bare for internasjonale saker).

${kilde}`;
}

export default {
  navn: 'stortinget',
  async hent() {
    const liste = (await hentJson(`${API}/saker?sesjonid=${process.env.STORTINGET_SESJON || sesjon()}&format=json`)).saker_liste ?? [];
    const grense = Date.now() - MAKS_ALDER_DAGER * 864e5;
    const nylige = liste
      .filter((s) => s.status === 1 && msFra(s.sist_oppdatert_dato) >= grense)
      .filter((s) => !HOPP_OVER.some((r) => r.test(s.korttittel ?? s.tittel ?? '')))
      .sort((a, b) => msFra(b.sist_oppdatert_dato) - msFra(a.sist_oppdatert_dato))
      .slice(0, MAKS_DETALJER);

    const saker = [];
    for (const s of nylige) {
      const d = await hentJson(`${API}/sak?sakid=${s.id}&format=json`);
      const vedtak = (d.kortvedtak ?? '').trim();
      // Karar özeti yoksa ya da sadece "innstillingen doğrultusunda" diyorsa haber çıkmaz.
      if (vedtak.length < 60 || HOPP_KOMITE.has(d.komite?.id)) continue;
      saker.push({
        id: `stortinget:${s.id}`,
        tid: new Date(msFra(s.sist_oppdatert_dato)),
        tittel: d.korttittel ?? d.tittel,
        async lag() {
          const kildeTekst = [
            `Sak: ${d.tittel}`,
            d.korttittel && d.korttittel !== d.tittel ? `Korttittel: ${d.korttittel}` : null,
            d.komite?.navn ? `Komité: ${d.komite.navn}` : null,
            d.henvisning ? `Henvisning: ${d.henvisning}` : null,
            `Stortingets oppsummering av vedtaket:\n${vedtak}`,
          ]
            .filter(Boolean)
            .join('\n');
          const ai = await gemini({ prompt: prompt(kildeTekst), schema: SKJEMA });
          if (!ai) return null;
          const { sak: ferdig, merknader, stopp } = await redigerSak(ai, kildeTekst, { pressemelding: false });
          return {
            ...ferdig,
            date: osloIso(),
            kilde: { navn: 'Stortinget', url: KILDE_URL(s.id), lisens: 'NLOD' },
            produksjon: 'ki-kontrollert',
            ...(merknader.length && { merknader }),
            ...(stopp.length && { draft: true, stopp }),
          };
        },
      });
    }
    return saker;
  },
};
