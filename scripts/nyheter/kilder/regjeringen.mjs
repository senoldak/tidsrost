// Regjeringen.no: departementlerin haber ve basın bültenleri.
// GEMINI_API_KEY yoksa bu kaynak hiç çalışmaz (bkz. lag()).
import { readFile } from 'node:fs/promises';
import { hentTekst, lesRss, htmlTilTekst, decodeEntities, gemini, osloIso, sleep, KATEGORIER } from '../lib.mjs';
import { redigerSak, forLiteKilde, LENGDE_REGEL, TITTEL_REGEL } from '../redaktor.mjs';
import { kortMelding } from '../kortfortalt.mjs';

// Site ile ortak ayar (src/lib/redaksjon.json):
//   "manuell": tüm yapay zekâ haberleri taslak, editör kontrol edip yayınlar
//   "ki":      yazı işleri süreci (redaktor.mjs) kontrol eder, düzelttirir ve yayınlar
//   "ingen":   kontrolsüz otomatik yayın
const { kontroll } = JSON.parse(await readFile(new URL('../../../src/lib/redaksjon.json', import.meta.url), 'utf8'));

const FEED = 'https://www.regjeringen.no/no/rss/Rss/2581966/?documentType=aktuelt/nyheter';

// Ana akışta gönderen bakanlık yazmıyor; haber sayfası da GitHub'dan 403 veriyor.
// Bu yüzden bakanlık, her bakanlığın kendi RSS akışından (owner=<id>) bulunur.
// Kimlikler regjeringen.no/no/aktuelt/rss/id2581966/ sayfasındaki bakanlık filtresinden.
const DEPARTEMENTER = {
  875: 'Statsministerens kontor',
  165: 'Arbeids- og inkluderingsdepartementet',
  298: 'Barne- og familiedepartementet',
  810: 'Digitaliserings- og forvaltningsdepartementet',
  750: 'Energidepartementet',
  216: 'Finansdepartementet',
  380: 'Forsvarsdepartementet',
  421: 'Helse- og omsorgsdepartementet',
  463: 'Justis- og beredskapsdepartementet',
  668: 'Klima- og miljødepartementet',
  504: 'Kommunal- og distriktsdepartementet',
  545: 'Kultur- og likestillingsdepartementet',
  586: 'Kunnskapsdepartementet',
  627: 'Landbruks- og matdepartementet',
  709: 'Nærings- og fiskeridepartementet',
  791: 'Samferdselsdepartementet',
  833: 'Utenriksdepartementet',
};

// guid → bakanlık adı. Bir akış alınamazsa o bakanlığın haberleri "Regjeringen" olarak kalır.
async function avsendere() {
  const kart = new Map();
  for (const [id, navn] of Object.entries(DEPARTEMENTER)) {
    try {
      for (const i of lesRss(await hentTekst(`${FEED}&owner=${id}`))) if (!kart.has(i.guid)) kart.set(i.guid, navn);
    } catch (e) {
      console.warn(`  regjeringen: ${navn} akışı alınamadı (${e.message})`);
    }
    await sleep(200);
  }
  return kart;
}

// Haber değeri düşük rutin başlıklar.
const HOPP_OVER = [/program (for )?(uke|veke)/i, /^statsr[åa]dens program/i, /ledig stilling/i];

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
  const kort = !side.body;
  return `Du er nyhetsjournalist i nettavisen tidsrøst, som arbeider etter Vær Varsom-plakaten. Skriv en nøytral, fullverdig nyhetssak på norsk bokmål basert på pressemeldingen under.

En pressemelding er avsenderens egen fremstilling, ikke uavhengig dokumentert fakta. Følg disse reglene nøye:

Kilde og tilskriving (VVP 2.7, 3.1, 4.2):
- Si tydelig i første eller andre avsnitt at opplysningene kommer fra en pressemelding fra ${side.departement}.
- Alt som er avsenderens påstander, vurderinger, mål eller forventninger, skal tilskrives avsenderen («ifølge departementet», «mener regjeringen», «skriver departementet»). Presenter dem aldri som fakta.
- Gjengi bare avsenderens synspunkter. Ikke legg til egne vurderinger, kommentarer, konklusjoner eller vinklinger.

Nøyaktighet (VVP 3.2, 3.7, 4.4):
- Bruk bare opplysninger som står i materialet. Ikke legg til bakgrunn, tall, navn eller sammenhenger fra egen kunnskap.
- Ikke bruk forsterkende eller ladede ord (som «kraftig», «skarpt», «historisk», «massiv») med mindre de står i materialet.
- Tittel og ingress skal ikke gå lenger enn det er dekning for i teksten. Tittelen skal vise at det er avsenderens forslag, vedtak eller syn (f.eks. «Regjeringen foreslår …», «Norge gir … til …»).
${TITTEL_REGEL}
- Direkte sitater skal gjengis ordrett, på originalspråket (også nynorsk), i anførselstegn og med navn og tittel på den som uttaler seg. Ikke lag sitater, og ikke endre eller oversett dem.
- Ellers skal du skrive med egne ord, ikke kopiere setninger.

Varsomhet (VVP 4.3, 4.5, 4.7, 4.8):
- Sett egnet=false hvis pressemeldingen handler om navngitte privatpersoner, enkeltsaker om kriminalitet, barn, selvmord, ulykker med omkomne, eller annet som krever særlig varsomhet. Fyll da ut de andre feltene med tomme strenger.
- Ellers egnet=true.

Form:
- Første avsnitt skal fortelle det viktigste: hvem, hva, hvorfor.
${LENGDE_REGEL}${kort ? `
- Ikke avslutt med henvisninger som «les mer på regjeringen.no»; lenken til kilden legges til automatisk.` : ''}
- Ingen overskrift i body, ingen kildehenvisning nederst (den legges til automatisk).
- Velg kategori: innenriks (norske forhold), utenriks (internasjonalt), okonomi, kultur, teknologi eller sport.

Avsender: ${side.departement}
Tittel: ${item.title}
Ingress: ${side.ingress || item.description}

${side.body ? `Tekst:\n${side.body.slice(0, 12000)}` : ''}`;
}

export default {
  navn: 'regjeringen',
  async hent() {
    const items = lesRss(await hentTekst(FEED));
    const naa = Date.now();
    const nye = items
      .filter((i) => i.guid && !HOPP_OVER.some((r) => r.test(i.title)))
      .filter((i) => new Date(i.pubDate).getTime() <= naa);
    // Bakanlık akışları (17 küçük RSS isteği) sadece akışta aday varsa indirilir.
    const avsenderFor = nye.length ? await avsendere() : new Map();
    return nye
      .map((item) => ({
        id: `regjeringen:${item.guid}`,
        tid: new Date(item.pubDate),
        tittel: item.title,
        async lag() {
          const url = item.link.replace(/\?.*$/, '');
          // regjeringen.no, GitHub sunucularından sayfa isteğini 403 ile engelliyor.
          // O durumda sadece RSS'teki başlık ve özetle kısa haber yazılır.
          let side;
          try {
            side = lesSide(await hentTekst(url));
          } catch (e) {
            if (!/^40[13] /.test(e.message)) throw e;
            side = { ingress: item.description, body: '', departement: avsenderFor.get(item.guid) ?? 'regjeringen' };
          }
          const kilde = { navn: side.departement === 'regjeringen' ? 'regjeringen.no' : `${side.departement} / regjeringen.no`, url };
          // Anahtar yoksa null döner; haber atlanır ve sonraki çalışmada tekrar denenir.
          // Bülten metnini olduğu gibi yayınlamıyoruz.
          // Sayfası okunamayan bültende sadece başlık ve giriş kalır; bundan uydurmadan tam haber çıkmaz.
          // Ayrı haber yerine günün "Kort fortalt" sayfasına satır olarak girer (bkz. kortfortalt.mjs).
          if (forLiteKilde(`${side.ingress || item.description}\n\n${side.body}`)) {
            return { kort: kortMelding({ tittel: item.title, ingress: side.ingress || item.description, kilde }) };
          }
          const ai = await gemini({ prompt: prompt(item, side), schema: SKJEMA });
          if (!ai) return null;
          // Özel dikkat gerektiren konular (kişiler, suç, çocuklar vb.) otomatik işlenmez.
          if (!ai.egnet) return { hopp: 'krever særlig varsomhet, bør vurderes manuelt' };
          const { egnet, ...sak } = ai;
          const felles = { ...sak, date: osloIso(), kilde };
          if (kontroll === 'ingen') return { ...felles, produksjon: 'ki-automatisk' };
          if (kontroll === 'manuell') return { ...felles, draft: true, produksjon: 'ki-assistert' };

          const kildeTekst = `Avsender: ${side.departement}\nTittel: ${item.title}\nIngress: ${side.ingress || item.description}\n\n${side.body}`;
          // Yazı işleri: kontrol → düzeltme → Norveççe redaksiyon → son kesin kontrol (bkz. redaktor.mjs).
          const { sak: ferdig, merknader, stopp } = await redigerSak(sak, kildeTekst);
          // Uydurma alıntı ya da kaynakta olmayan rakam kaldıysa yayınlanmaz, taslak da açılmaz.
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
