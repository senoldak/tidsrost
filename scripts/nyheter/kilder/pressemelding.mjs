// Kamu kurumlarının haber/bülten akışları için ortak kaynak (SSB, Nkom, Mattilsynet …).
// Her kurum kilder/etater.mjs içinde bir ayar nesnesiyle tanımlanır; süreç regjeringen.mjs ile aynıdır:
// RSS → sayfa metni → Gemini taslağı → yazı işleri (redaktor.mjs) → yayın ya da taslak.
// GEMINI_API_KEY yoksa bu kaynaklar çalışmaz (bkz. lag()).
import { readFile } from 'node:fs/promises';
import { hentTekst, lesRss, htmlTilTekst, gemini, osloIso, KATEGORIER } from '../lib.mjs';
import { redigerSak, forLiteKilde, LENGDE_REGEL, TITTEL_REGEL } from '../redaktor.mjs';
import { kortMelding } from '../kortfortalt.mjs';

const { kontroll } = JSON.parse(await readFile(new URL('../../../src/lib/redaksjon.json', import.meta.url), 'utf8'));

// Sadece son birkaç gündeki bültenler; eski birikim yayınlanmaz.
const MAKS_ALDER_DAGER = 3;

// İki işaret arasındaki HTML'i düz metne çevirir (işaret bulunamazsa boş metin).
export function mellom(html, start, slutt) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  const j = slutt ? html.indexOf(slutt, i + start.length) : -1;
  return htmlTilTekst(html.slice(i, j > -1 ? j : undefined).replace(/^[^>]*>/, ''));
}

const SKJEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Nyhetstittel, maks 90 tegn' },
    description: { type: 'string', description: 'Ingress, 1–2 setninger' },
    body: { type: 'string', description: 'Brødtekst i Markdown, 250–400 ord i 4–6 avsnitt, uten overskrift' },
    category: { type: 'string', enum: KATEGORIER },
    egnet: { type: 'boolean', description: 'false hvis saken ikke egner seg for automatisk behandling (se reglene)' },
  },
  required: ['egnet', 'title', 'description', 'body', 'category'],
};

function prompt(etat, item, side) {
  return `Du er nyhetsjournalist i nettavisen tidsrøst, som arbeider etter Vær Varsom-plakaten. Skriv en nøytral, fullverdig nyhetssak på norsk bokmål basert på ${etat.sjanger} under fra ${etat.avsender}.

Materialet er avsenderens egen publisering, ikke uavhengig dokumentert fakta. Følg disse reglene nøye:

Kilde og tilskriving (VVP 2.7, 3.1, 4.2):
- Si tydelig i første eller andre avsnitt at opplysningene kommer fra ${etat.avsender}.
- Alt som er avsenderens påstander, vurderinger, mål eller forventninger, skal tilskrives avsenderen («ifølge ${etat.kortnavn}», «skriver ${etat.kortnavn}»). Presenter dem aldri som fakta.
- Ikke legg til egne vurderinger, kommentarer, konklusjoner eller vinklinger.

Nøyaktighet (VVP 3.2, 3.7, 4.4):
- Bruk bare opplysninger som står i materialet. Ikke legg til bakgrunn, tall, navn eller sammenhenger fra egen kunnskap.
- Tall skal gjengis nøyaktig som i materialet, med samme enhet og tidsperiode.
- Ikke bruk forsterkende eller ladede ord (som «kraftig», «skarpt», «historisk», «massiv») med mindre de står i materialet.
- Tittel og ingress skal ikke gå lenger enn det er dekning for i teksten.
${TITTEL_REGEL}
- Direkte sitater skal gjengis ordrett, på originalspråket (også nynorsk), i anførselstegn og med navn og tittel på den som uttaler seg. Ikke lag sitater, og ikke endre eller oversett dem.
- Ellers skal du skrive med egne ord, ikke kopiere setninger.
- Ikke skriv relative tidsuttrykk som «i går» eller «i dag»; bruk ukedag eller dato hvis det står i materialet.

Varsomhet (VVP 4.3, 4.5, 4.7, 4.8):
- Sett egnet=false hvis saken dreier seg om en identifiserbar privatperson, enkeltsaker om kriminalitet der mistenkte eller ofre kan identifiseres, barn, selvmord, ulykker der omkomne kan identifiseres, eller annet som krever særlig varsomhet. Store hendelser som krig, humanitære kriser, naturkatastrofer og større ulykker er vanlige nyheter, så lenge ingen privatpersoner identifiseres. Sett også egnet=false for kronikker, debattinnlegg og kommentarer (meningsytringer, ikke nyheter), stillingsannonser, arrangementer, påmeldinger, høringsinvitasjoner uten nyhetsinnhold og rene interne meldinger. Fyll da ut de andre feltene med tomme strenger.
- Ellers egnet=true.

Form:
- Første avsnitt skal fortelle det viktigste: hvem, hva, hvorfor.
${LENGDE_REGEL}
- Ingen overskrift i body, ingen kildehenvisning nederst og ingen «les mer»-henvisninger (lenken til kilden legges til automatisk).
- Velg kategori: ${etat.kategorihint}

Avsender: ${etat.avsender}
Tittel: ${item.title}
Ingress: ${side.ingress || item.description}

${side.body ? `Tekst:\n${side.body.slice(0, 12000)}` : ''}`;
}

// etat = {
//   navn: 'ssb',                    sett.json'daki kimlik öneki
//   avsender: 'Statistisk sentralbyrå (SSB)', kortnavn: 'SSB',
//   feed: 'https://…',              RSS adresi
//   liste?: async () => [{ guid, title, link, description, pubDate }]   RSS yoksa liste sayfasından okuma
//   sjanger: 'publiseringen',       istemde materyalin adı (pressemeldingen, nyhetssaken …)
//   kategorihint: '…',              istemdeki kategori yönergesi
//   underlinje: 'Statistikk fra ssb.no',
//   lisens?: 'CC BY 4.0',           kaynak satırında gösterilir
//   pressemelding?: false,          kontrol masası "basın bülteni" ifadesini aramasın (ör. istatistik)
//   filter?: (item) => boolean,     haber olmayan girdileri ele
//   les: (html) => ({ ingress, body }),
// }
export function lagKilde(etat) {
  return {
    navn: etat.navn,
    async hent() {
      // Akışı olmayan kurumlar için etat.liste() kendi listesini döner (aynı alanlarla).
      const liste = etat.liste ? await etat.liste() : lesRss(await hentTekst(etat.feed));
      const naa = Date.now();
      const grense = naa - MAKS_ALDER_DAGER * 864e5;
      return liste
        .filter((i) => (i.guid || i.link) && i.link)
        .filter((i) => !etat.filter || etat.filter(i))
        .map((item) => ({ item, tid: new Date(item.pubDate) }))
        .filter(({ tid }) => tid.getTime() >= grense && tid.getTime() <= naa)
        .map(({ item, tid }) => ({
          id: `${etat.navn}:${item.guid || item.link}`,
          tid,
          tittel: item.title,
          async lag() {
            let side;
            try {
              side = etat.les(await hentTekst(item.link));
            } catch (e) {
              if (!/^40[13] /.test(e.message)) throw e;
              side = { ingress: item.description, body: '' };
            }
            if (!side.ingress) side.ingress = htmlTilTekst(item.description);
            const kilde = { navn: etat.avsender, url: item.link, ...(etat.lisens && { lisens: etat.lisens }) };

            // Sayfası okunamayan bültende sadece başlık ve giriş kalır; bundan uydurmadan tam haber çıkmaz.
            // Norveççe duyuru günün "Kort fortalt" sayfasına satır olarak girer (bkz. kortfortalt.mjs);
            // İngilizce olan (BM, AB …) çevrilmeden satıra konamaz, atlanır.
            if (forLiteKilde(`${side.ingress}\n\n${side.body}`)) {
              if (/engelsk/.test(etat.sjanger ?? '')) return { hopp: 'for lite kildemateriale for en fullverdig sak' };
              return { kort: kortMelding({ tittel: item.title, ingress: side.ingress, kilde }) };
            }
            const ai = await gemini({ prompt: prompt(etat, item, side), schema: SKJEMA });
            if (!ai) return null;
            if (!ai.egnet) return { hopp: 'ikke egnet for automatisk behandling, bør vurderes manuelt' };
            const { egnet, ...sak } = ai;
            const felles = { ...sak, date: osloIso(), kilde };
            if (kontroll === 'ingen') return { ...felles, produksjon: 'ki-automatisk' };
            if (kontroll === 'manuell') return { ...felles, draft: true, produksjon: 'ki-assistert' };

            const kildeTekst = `Avsender: ${etat.avsender}\nTittel: ${item.title}\nIngress: ${side.ingress}\n\n${side.body}`;
            const { sak: ferdig, merknader, stopp } = await redigerSak(sak, kildeTekst, { pressemelding: etat.pressemelding ?? true });
            // Düzeltme turlarından sonra hâlâ sorunluysa yayınlanmaz, taslak da açılmaz.
            if (stopp.length) return { hopp: `kontroll: ${stopp.join(' / ')}` };
            return {
              ...felles,
              ...ferdig,
              produksjon: 'ki-kontrollert',
              ...(merknader.length && { merknader }),
            };
          },
        }));
    },
  };
}
